/**
 * @file extension.js
 * @description Главная точка входа расширения FuncForge для Visual Studio Code.
 * Отвечает за регистрацию команд, хранение шаблонов в ExtensionContext.globalState,
 * управление панелью Webview и вставку сгенерированного C++ кода в редактор.
 */

const vscode = require('vscode');
const { TemplateManager, buildAndEvaluate } = require('./src/templates');
const { getWebviewContent } = require('./src/webview');

const STORAGE_KEY = 'funcforge.templates';

/**
 * Вызывается VS Code при активации расширения (вызове команды funcforge.openManager).
 *
 * @param {vscode.ExtensionContext} context - Контекст расширения VS Code.
 */
function activate(context) {
  // Загружаем сохранённые шаблоны из постоянного хранилища globalState
  const savedTemplates = context.globalState.get(STORAGE_KEY);
  const templateManager = new TemplateManager(savedTemplates);

  // Отслеживаем последний активный текстовый редактор,
  // чтобы вставка кода работала даже тогда, когда фокус находится внутри окна Webview
  let lastActiveEditor = vscode.window.activeTextEditor || null;

  const editorWatcher = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && editor.document) {
      lastActiveEditor = editor;
    }
  });

  let currentPanel = null;

  /**
   * Сохраняет текущее состояние шаблонов в globalState между перезапусками VS Code.
   */
  async function persistTemplates() {
    await context.globalState.update(STORAGE_KEY, templateManager.getAll());
  }

  /**
   * Вставляет сгенерированный C++ код в последний открытый редактор
   * или создаёт новый C++ документ, если ни один файл не открыт.
   *
   * @param {string} code - Сгенерированный C++ код функции.
   */
  async function insertCodeIntoEditor(code) {
    let targetEditor = vscode.window.activeTextEditor || lastActiveEditor;

    // Проверяем, что сохранённый редактор всё ещё открыт и не был закрыт пользователем
    if (targetEditor && targetEditor.document && targetEditor.document.isClosed) {
      targetEditor = null;
    }

    if (!targetEditor) {
      // Если нет открытого редактора, создаём новый документ с синтаксисом C++
      const doc = await vscode.workspace.openTextDocument({
        language: 'cpp',
        content: `${code}\n`
      });
      targetEditor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      lastActiveEditor = targetEditor;
      vscode.window.showInformationMessage('FuncForge: Создан новый C++ документ со сгенерированной функцией.');
      return;
    }

    // Показываем целевой редактор и вставляем код в позицию курсора
    const shownEditor = await vscode.window.showTextDocument(
      targetEditor.document,
      targetEditor.viewColumn || vscode.ViewColumn.One,
      false
    );

    await shownEditor.edit((editBuilder) => {
      const position = shownEditor.selection.active;
      editBuilder.insert(position, `${code}\n`);
    });

    lastActiveEditor = shownEditor;
    vscode.window.showInformationMessage('FuncForge: Код функции C++ вставлен в редактор.');
  }

  // Регистрируем основную команду открытия менеджера шаблонов
  const openManagerDisposable = vscode.commands.registerCommand('funcforge.openManager', () => {
    if (vscode.window.activeTextEditor) {
      lastActiveEditor = vscode.window.activeTextEditor;
    }

    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    currentPanel = vscode.window.createWebviewPanel(
      'funcforgeManager',
      'FuncForge: Шаблоны функций C++',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    currentPanel.webview.html = getWebviewContent();

    // Обработка сообщений от пользовательского интерфейса Webview
    currentPanel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          switch (message.command) {
            case 'init': {
              currentPanel.webview.postMessage({
                type: 'templatesLoaded',
                templates: templateManager.getAll()
              });
              break;
            }

            case 'addTemplate': {
              const created = templateManager.addTemplate(message.data);
              await persistTemplates();
              currentPanel.webview.postMessage({
                type: 'templatesLoaded',
                templates: templateManager.getAll(),
                selectedId: created.id,
                notice: `Шаблон "${created.name}" успешно добавлен и сохранён.`
              });
              break;
            }

            case 'updateTemplate': {
              const updated = templateManager.updateTemplate(message.id, message.data);
              await persistTemplates();
              currentPanel.webview.postMessage({
                type: 'templatesLoaded',
                templates: templateManager.getAll(),
                selectedId: updated.id,
                notice: `Шаблон "${updated.name}" успешно обновлён.`
              });
              break;
            }

            case 'deleteTemplate': {
              templateManager.deleteTemplate(message.id);
              await persistTemplates();
              currentPanel.webview.postMessage({
                type: 'templatesLoaded',
                templates: templateManager.getAll(),
                notice: 'Шаблон удалён.'
              });
              break;
            }

            case 'resetTemplates': {
              const defaults = templateManager.resetToDefaults();
              await persistTemplates();
              currentPanel.webview.postMessage({
                type: 'templatesLoaded',
                templates: defaults,
                notice: 'Восстановлены стандартные шаблоны по умолчанию.'
              });
              break;
            }

            case 'generateAndEvaluate': {
              const tpl = templateManager.getById(message.templateId);
              if (!tpl) {
                throw new Error('Выбранный шаблон не найден.');
              }

              const { code, result } = buildAndEvaluate(
                tpl,
                message.functionName,
                message.testValues
              );

              currentPanel.webview.postMessage({
                type: 'generationSuccess',
                code,
                result
              });
              break;
            }

            case 'copyCode': {
              await vscode.env.clipboard.writeText(message.code || '');
              currentPanel.webview.postMessage({
                type: 'statusMessage',
                message: 'Код C++ функции скопирован в буфер обмена.',
                isError: false
              });
              vscode.window.showInformationMessage('FuncForge: Код скопирован в буфер обмена.');
              break;
            }

            case 'insertCode': {
              await insertCodeIntoEditor(message.code || '');
              currentPanel.webview.postMessage({
                type: 'statusMessage',
                message: 'Код C++ функции успешно вставлен в редактор VS Code.',
                isError: false
              });
              break;
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          currentPanel.webview.postMessage({
            type: 'statusMessage',
            message: errorMessage,
            isError: true
          });
          vscode.window.showErrorMessage(`FuncForge: ${errorMessage}`);
        }
      },
      undefined,
      context.subscriptions
    );

    currentPanel.onDidDispose(
      () => {
        currentPanel = null;
      },
      null,
      context.subscriptions
    );
  });

  context.subscriptions.push(editorWatcher, openManagerDisposable);
}

/**
 * Вызывается при деактивации расширения.
 */
function deactivate() {}

module.exports = {
  activate,
  deactivate
};