/**
 * @file src/webview.js
 * @description Генератор HTML, CSS и клиентского JavaScript для окна Webview плагина FuncForge.
 */

/**
 * Возвращает полный HTML-документ для отображения в панели Webview VS Code.
 *
 * @returns {string} HTML-разметка пользовательского интерфейса.
 */
function getWebviewContent() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FuncForge — Менеджер шаблонов C++</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e2e);
      --fg: var(--vscode-editor-foreground, #cdd6f4);
      --panel-bg: var(--vscode-sideBar-background, #181825);
      --border: var(--vscode-panel-border, #313244);
      --input-bg: var(--vscode-input-background, #313244);
      --input-fg: var(--vscode-input-foreground, #cdd6f4);
      --input-border: var(--vscode-input-border, #45475a);
      --btn-bg: var(--vscode-button-background, #89b4fa);
      --btn-fg: var(--vscode-button-foreground, #11111b);
      --btn-hover: var(--vscode-button-hoverBackground, #b4befe);
      --btn-sec-bg: var(--vscode-button-secondaryBackground, #45475a);
      --btn-sec-fg: var(--vscode-button-secondaryForeground, #cdd6f4);
      --error-bg: rgba(243, 139, 168, 0.15);
      --error-border: #f38ba8;
      --success-bg: rgba(166, 227, 161, 0.15);
      --success-border: #a6e3a1;
      --accent: #89b4fa;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 20px;
      background-color: var(--bg);
      color: var(--fg);
      font-family: var(--vscode-font-family, system-ui, -apple-system, sans-serif);
      font-size: 13px;
      line-height: 1.5;
    }

    h1 {
      margin: 0 0 6px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .subtitle {
      margin: 0 0 18px 0;
      opacity: 0.75;
      font-size: 12px;
    }

    .layout {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 820px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background-color: var(--panel-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      gap: 8px;
    }

    .card-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }

    .template-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 360px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .template-item {
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 10px 12px;
      cursor: pointer;
      background-color: var(--bg);
      transition: border-color 0.15s ease;
    }

    .template-item:hover {
      border-color: var(--accent);
    }

    .template-item.active {
      border-color: var(--btn-bg);
      box-shadow: 0 0 0 1px var(--btn-bg);
    }

    .template-item-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .template-name {
      font-weight: 600;
      font-size: 13px;
    }

    .badge {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      background-color: var(--btn-sec-bg);
      color: var(--btn-sec-fg);
      font-family: monospace;
    }

    .template-expr {
      font-family: monospace;
      font-size: 12px;
      opacity: 0.85;
      margin-bottom: 8px;
      word-break: break-all;
    }

    .template-actions {
      display: flex;
      gap: 6px;
    }

    .form-group {
      margin-bottom: 12px;
    }

    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      font-size: 12px;
    }

    input[type="text"],
    select {
      width: 100%;
      padding: 7px 9px;
      background-color: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
    }

    input[type="text"]:focus,
    select:focus {
      outline: 1px solid var(--btn-bg);
    }

    .mono-input {
      font-family: monospace !important;
    }

    .btn-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    button {
      padding: 7px 12px;
      background-color: var(--btn-bg);
      color: var(--btn-fg);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    button:hover {
      background-color: var(--btn-hover);
    }

    button.secondary {
      background-color: var(--btn-sec-bg);
      color: var(--btn-sec-fg);
    }

    button.small {
      padding: 3px 8px;
      font-size: 11px;
    }

    .params-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
      margin-top: 6px;
    }

    .status-box {
      padding: 10px 12px;
      border-radius: 5px;
      margin-bottom: 14px;
      display: none;
      font-size: 12.5px;
    }

    .status-box.error {
      display: block;
      background-color: var(--error-bg);
      border: 1px solid var(--error-border);
    }

    .status-box.success {
      display: block;
      background-color: var(--success-bg);
      border: 1px solid var(--success-border);
    }

    .result-banner {
      padding: 10px 12px;
      border-radius: 5px;
      background-color: var(--bg);
      border: 1px solid var(--border);
      margin-bottom: 12px;
      font-family: monospace;
      font-size: 13px;
    }

    pre {
      margin: 0;
      padding: 12px;
      background-color: var(--bg);
      border: 1px solid var(--border);
      border-radius: 5px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 13px;
      line-height: 1.45;
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <h1>FuncForge — Генератор шаблонов функций C++</h1>
  <p class="subtitle">Создание, настройка, тестирование и генерация параметризованных C++ функций</p>

  <div id="statusBox" class="status-box"></div>

  <div class="layout">
    <!-- Левая колонка: Список шаблонов и форма создания/редактирования -->
    <div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">1. Менеджер шаблонов</h2>
          <div style="display:flex; gap:6px;">
            <button id="btnNewTemplate" class="small">+ Добавить</button>
            <button id="btnResetTemplates" class="small secondary" title="Сбросить к стандартным шаблонам">Сброс</button>
          </div>
        </div>
        <div id="templateList" class="template-list"></div>
      </div>

      <!-- Форма добавления / редактирования шаблона -->
      <div id="editorCard" class="card hidden">
        <div class="card-header">
          <h2 id="editorTitle" class="card-title">Создание шаблона</h2>
        </div>

        <input type="hidden" id="editTemplateId" value="" />

        <div class="form-group">
          <label for="tplName">Название шаблона:</label>
          <input type="text" id="tplName" placeholder="Например: Сумма квадратов" />
        </div>

        <div class="form-group">
          <label for="tplType">Тип возвращаемого значения и параметров:</label>
          <select id="tplType">
            <option value="double">double</option>
            <option value="float">float</option>
            <option value="int">int (целочисленная арифметика C++)</option>
          </select>
        </div>

        <div class="form-group">
          <label for="tplParams">Имена параметров (через запятую):</label>
          <input type="text" id="tplParams" class="mono-input" placeholder="a, b" />
        </div>

        <div class="form-group">
          <label for="tplExpr">Арифметическое выражение внутри return:</label>
          <input type="text" id="tplExpr" class="mono-input" placeholder="a * a + b * b" />
        </div>

        <div class="btn-row">
          <button id="btnSaveTemplate">Сохранить шаблон</button>
          <button id="btnCancelEdit" class="secondary">Отмена</button>
        </div>
      </div>
    </div>

    <!-- Правая колонка: Генерация функции, проверка и вставка в редактор -->
    <div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">2. Настройка и проверка функции</h2>
          <span id="selectedTplBadge" class="badge">Шаблон не выбран</span>
        </div>

        <div class="form-group">
          <label for="funcNameInput">Имя генерируемой C++ функции:</label>
          <input type="text" id="funcNameInput" class="mono-input" value="SquareSum" placeholder="Например: SquareSum" />
        </div>

        <div class="form-group">
          <label>Тестовые значения параметров (для проверки вычисления):</label>
          <div id="testParamsContainer" class="params-grid"></div>
        </div>

        <div class="btn-row">
          <button id="btnGenerate">Проверить и сгенерировать C++ код</button>
        </div>
      </div>

      <div id="outputCard" class="card hidden">
        <div class="card-header">
          <h2 class="card-title">3. Результат генерации</h2>
        </div>

        <div id="evalResultBanner" class="result-banner"></div>

        <label>Сгенерированный код функции C++:</label>
        <pre id="generatedCodeBlock"></pre>

        <div class="btn-row">
          <button id="btnInsertEditor">Вставить в текущий файл VS Code</button>
          <button id="btnCopyCode" class="secondary">Скопировать код</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    let templates = [];
    let selectedTemplateId = null;
    let lastGeneratedCode = '';

    const statusBox = document.getElementById('statusBox');
    const templateListEl = document.getElementById('templateList');
    const editorCard = document.getElementById('editorCard');
    const editorTitle = document.getElementById('editorTitle');
    const editTemplateIdInput = document.getElementById('editTemplateId');
    const tplNameInput = document.getElementById('tplName');
    const tplTypeInput = document.getElementById('tplType');
    const tplParamsInput = document.getElementById('tplParams');
    const tplExprInput = document.getElementById('tplExpr');

    const selectedTplBadge = document.getElementById('selectedTplBadge');
    const funcNameInput = document.getElementById('funcNameInput');
    const testParamsContainer = document.getElementById('testParamsContainer');
    const outputCard = document.getElementById('outputCard');
    const evalResultBanner = document.getElementById('evalResultBanner');
    const generatedCodeBlock = document.getElementById('generatedCodeBlock');

    function showStatus(message, isError = false) {
      statusBox.textContent = message;
      statusBox.className = 'status-box ' + (isError ? 'error' : 'success');
    }

    function clearStatus() {
      statusBox.className = 'status-box';
      statusBox.textContent = '';
    }

    function getSelectedTemplate() {
      return templates.find((t) => t.id === selectedTemplateId) || null;
    }

    function renderTemplateList() {
      templateListEl.innerHTML = '';

      templates.forEach((tpl) => {
        const item = document.createElement('div');
        item.className = 'template-item' + (tpl.id === selectedTemplateId ? ' active' : '');

        const top = document.createElement('div');
        top.className = 'template-item-top';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'template-name';
        nameSpan.textContent = tpl.name;

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'badge';
        badgeSpan.textContent = tpl.returnType + ' (' + tpl.params.join(', ') + ')';

        top.appendChild(nameSpan);
        top.appendChild(badgeSpan);

        const exprDiv = document.createElement('div');
        exprDiv.className = 'template-expr';
        exprDiv.textContent = 'return ' + tpl.expression + ';';

        const actions = document.createElement('div');
        actions.className = 'template-actions';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'small secondary';
        btnEdit.textContent = 'Изменить';
        btnEdit.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditForm(tpl);
        });

        const btnDelete = document.createElement('button');
        btnDelete.className = 'small secondary';
        btnDelete.textContent = 'Удалить';
        btnDelete.addEventListener('click', (e) => {
          e.stopPropagation();
          clearStatus();
          vscode.postMessage({
            command: 'deleteTemplate',
            id: tpl.id
          });
        });

        actions.appendChild(btnEdit);
        actions.appendChild(btnDelete);

        item.appendChild(top);
        item.appendChild(exprDiv);
        item.appendChild(actions);

        item.addEventListener('click', () => {
          selectTemplate(tpl.id);
        });

        templateListEl.appendChild(item);
      });
    }

    function selectTemplate(id) {
      selectedTemplateId = id;
      const tpl = getSelectedTemplate();
      renderTemplateList();

      if (!tpl) {
        selectedTplBadge.textContent = 'Шаблон не выбран';
        testParamsContainer.innerHTML = '';
        return;
      }

      selectedTplBadge.textContent = tpl.name + ' [' + tpl.returnType + ']';

      // Поля ввода тестовых значений параметров
      testParamsContainer.innerHTML = '';
      tpl.params.forEach((param, idx) => {
        const wrapper = document.createElement('div');
        const lbl = document.createElement('label');
        lbl.textContent = tpl.returnType + ' ' + param + ' =';
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'mono-input param-test-input';
        inp.dataset.param = param;
        inp.value = String(idx + 3); // По умолчанию 3, 4, 5...
        wrapper.appendChild(lbl);
        wrapper.appendChild(inp);
        testParamsContainer.appendChild(wrapper);
      });
    }

    function openCreateForm() {
      clearStatus();
      editorTitle.textContent = 'Создание нового шаблона';
      editTemplateIdInput.value = '';
      tplNameInput.value = '';
      tplTypeInput.value = 'double';
      tplParamsInput.value = 'a, b';
      tplExprInput.value = '';
      editorCard.classList.remove('hidden');
      tplNameInput.focus();
    }

    function openEditForm(tpl) {
      clearStatus();
      editorTitle.textContent = 'Редактирование шаблона';
      editTemplateIdInput.value = tpl.id;
      tplNameInput.value = tpl.name;
      tplTypeInput.value = tpl.returnType;
      tplParamsInput.value = tpl.params.join(', ');
      tplExprInput.value = tpl.expression;
      editorCard.classList.remove('hidden');
      tplNameInput.focus();
    }

    document.getElementById('btnNewTemplate').addEventListener('click', openCreateForm);

    document.getElementById('btnResetTemplates').addEventListener('click', () => {
      clearStatus();
      vscode.postMessage({ command: 'resetTemplates' });
    });

    document.getElementById('btnCancelEdit').addEventListener('click', () => {
      editorCard.classList.add('hidden');
    });

    document.getElementById('btnSaveTemplate').addEventListener('click', () => {
      clearStatus();
      const id = editTemplateIdInput.value.trim();
      const payload = {
        name: tplNameInput.value,
        returnType: tplTypeInput.value,
        params: tplParamsInput.value,
        expression: tplExprInput.value
      };

      if (id) {
        vscode.postMessage({
          command: 'updateTemplate',
          id,
          data: payload
        });
      } else {
        vscode.postMessage({
          command: 'addTemplate',
          data: payload
        });
      }
    });

    document.getElementById('btnGenerate').addEventListener('click', () => {
      clearStatus();
      const tpl = getSelectedTemplate();
      if (!tpl) {
        showStatus('Сначала выберите шаблон в списке слева.', true);
        return;
      }

      const testValues = {};
      const inputs = testParamsContainer.querySelectorAll('.param-test-input');
      inputs.forEach((inp) => {
        testValues[inp.dataset.param] = inp.value;
      });

      vscode.postMessage({
        command: 'generateAndEvaluate',
        templateId: tpl.id,
        functionName: funcNameInput.value,
        testValues
      });
    });

    document.getElementById('btnCopyCode').addEventListener('click', () => {
      if (!lastGeneratedCode) return;
      vscode.postMessage({
        command: 'copyCode',
        code: lastGeneratedCode
      });
    });

    document.getElementById('btnInsertEditor').addEventListener('click', () => {
      if (!lastGeneratedCode) return;
      vscode.postMessage({
        command: 'insertCode',
        code: lastGeneratedCode
      });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'templatesLoaded': {
          templates = msg.templates || [];
          if (msg.selectedId && templates.some((t) => t.id === msg.selectedId)) {
            selectedTemplateId = msg.selectedId;
          } else if (!selectedTemplateId || !templates.some((t) => t.id === selectedTemplateId)) {
            const sq = templates.find((t) => t.id === 'square_sum_two');
            selectedTemplateId = sq ? sq.id : (templates[0] && templates[0].id) || null;
          }
          selectTemplate(selectedTemplateId);
          editorCard.classList.add('hidden');
          if (msg.notice) {
            showStatus(msg.notice, false);
          }
          break;
        }

        case 'generationSuccess': {
          lastGeneratedCode = msg.code;
          generatedCodeBlock.textContent = msg.code;
          evalResultBanner.textContent =
            'Результат вычисления при тестовых параметрах: ' + msg.result;
          outputCard.classList.remove('hidden');
          showStatus('Функция успешно проверена и сгенерирована.', false);
          break;
        }

        case 'statusMessage': {
          showStatus(msg.message, Boolean(msg.isError));
          break;
        }
      }
    });

    // Запрашиваем начальный список шаблонов при открытии окна
    vscode.postMessage({ command: 'init' });
  </script>
</body>
</html>`;
}

module.exports = {
  getWebviewContent
};