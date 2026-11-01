/**
 * @file src/templates.js
 * @description Модуль управления шаблонами C++ функций, валидации идентификаторов C++,
 * проверки параметров и генерации исходного кода C++.
 */

const { tokenize, toRPN, extractVariables, evaluateRPN } = require('./expression');

/**
 * Множество поддерживаемых типов данных C++ (структура данных Set).
 * @type {Set<string>}
 */
const ALLOWED_TYPES = new Set(['int', 'float', 'double']);

/**
 * Множество зарезервированных ключевых слов C++ (структура данных Set).
 * Используется для проверки имени функции и параметров за время O(1).
 * @type {Set<string>}
 */
const CPP_KEYWORDS = new Set([
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor',
  'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t',
  'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit',
  'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype',
  'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum',
  'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'goto',
  'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept',
  'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private',
  'protected', 'public', 'register', 'reinterpret_cast', 'requires', 'return',
  'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast',
  'struct', 'switch', 'template', 'this', 'thread_local', 'throw', 'true',
  'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using',
  'virtual', 'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq'
]);

/**
 * Предустановленные шаблоны функций C++, доступные при первом запуске плагина.
 * @type {Array<{id: string, name: string, returnType: string, params: string[], expression: string, isDefault: boolean}>}
 */
const DEFAULT_TEMPLATES = [
  {
    id: 'sum_two',
    name: 'Сумма двух чисел',
    returnType: 'double',
    params: ['a', 'b'],
    expression: 'a + b',
    isDefault: true
  },
  {
    id: 'diff_two',
    name: 'Разность двух чисел',
    returnType: 'double',
    params: ['a', 'b'],
    expression: 'a - b',
    isDefault: true
  },
  {
    id: 'mul_two',
    name: 'Произведение двух чисел',
    returnType: 'double',
    params: ['a', 'b'],
    expression: 'a * b',
    isDefault: true
  },
  {
    id: 'div_two',
    name: 'Деление двух чисел',
    returnType: 'double',
    params: ['a', 'b'],
    expression: 'a / b',
    isDefault: true
  },
  {
    id: 'square_sum_two',
    name: 'Сумма квадратов двух чисел',
    returnType: 'double',
    params: ['a', 'b'],
    expression: 'a * a + b * b',
    isDefault: true
  }
];

/**
 * Проверяет, является ли строка корректным идентификатором в C++.
 *
 * @param {string} identifier - Проверяемое имя (функции или параметра).
 * @param {string} [entityLabel='Идентификатор'] - Название сущности для текста ошибки.
 * @returns {string} Очищенный от крайних пробелов идентификатор.
 * @throws {Error} Если имя пустое, имеет неверный формат или является ключевым словом C++.
 */
function validateCppIdentifier(identifier, entityLabel = 'Идентификатор') {
  if (typeof identifier !== 'string' || identifier.trim().length === 0) {
    throw new Error(`${entityLabel} не может быть пустым.`);
  }

  const trimmed = identifier.trim();

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    throw new Error(
      `${entityLabel} "${trimmed}" некорректен. Используйте только латинские буквы, цифры и символ "_", начиная с буквы или "_".`
    );
  }

  if (CPP_KEYWORDS.has(trimmed)) {
    throw new Error(
      `${entityLabel} "${trimmed}" является зарезервированным ключевым словом C++ и не может быть использован.`
    );
  }

  return trimmed;
}

/**
 * Разбирает и проверяет список параметров шаблона (принимает массив или строку через запятую).
 * Контролирует корректность каждого имени и отсутствие дубликатов через Set.
 *
 * @param {string|string[]} rawParams - Строка параметров (например, "a, b") или массив строк.
 * @returns {string[]} Массив проверенных имён параметров.
 * @throws {Error} При пустом списке, некорректном имени или дублировании параметров.
 */
function validateParameters(rawParams) {
  let paramList = [];

  if (Array.isArray(rawParams)) {
    paramList = rawParams.map((p) => String(p).trim()).filter((p) => p.length > 0);
  } else if (typeof rawParams === 'string') {
    if (rawParams.trim().length === 0) {
      throw new Error('Список параметров не может быть пустым. Укажите хотя бы один параметр (например: a, b).');
    }
    const parts = rawParams.split(',');
    for (const part of parts) {
      if (part.trim().length === 0) {
        throw new Error('Обнаружен пустой параметр (проверьте лишние запятые в списке параметров).');
      }
      paramList.push(part.trim());
    }
  } else {
    throw new Error('Некорректный формат списка параметров.');
  }

  if (paramList.length === 0) {
    throw new Error('Список параметров не может быть пустым.');
  }

  const seenParams = new Set();
  const validatedParams = [];

  for (const param of paramList) {
    const cleanParam = validateCppIdentifier(param, 'Параметр');
    if (seenParams.has(cleanParam)) {
      throw new Error(`Повторяющееся имя параметра "${cleanParam}". Все параметры функции должны быть уникальными.`);
    }
    seenParams.add(cleanParam);
    validatedParams.push(cleanParam);
  }

  return validatedParams;
}

/**
 * Выполняет полную валидацию данных шаблона: названия, типа возвращаемого значения,
 * списка параметров и арифметического выражения.
 *
 * @param {Object} templateData - Входные данные шаблона.
 * @param {string} templateData.name - Название шаблона.
 * @param {string} templateData.returnType - Тип возвращаемого значения ('int', 'float', 'double').
 * @param {string|string[]} templateData.params - Список параметров.
 * @param {string} templateData.expression - Арифметическое выражение для return.
 * @returns {{name: string, returnType: string, params: string[], expression: string}} Проверенный объект.
 * @throws {Error} При любой ошибке валидации.
 */
function validateTemplateInput(templateData) {
  if (!templateData || typeof templateData !== 'object') {
    throw new Error('Не переданы данные шаблона.');
  }

  const name = typeof templateData.name === 'string' ? templateData.name.trim() : '';
  if (name.length === 0) {
    throw new Error('Название шаблона не может быть пустым.');
  }

  const returnType = typeof templateData.returnType === 'string' ? templateData.returnType.trim() : '';
  if (!ALLOWED_TYPES.has(returnType)) {
    throw new Error(`Неподдерживаемый тип данных "${returnType}". Допустимые типы: int, float, double.`);
  }

  const params = validateParameters(templateData.params);
  const paramSet = new Set(params);

  const expression = typeof templateData.expression === 'string' ? templateData.expression.trim() : '';
  if (expression.length === 0) {
    throw new Error('Арифметическое выражение не может быть пустым.');
  }

  // Лексический и синтаксический разбор выражения
  const tokens = tokenize(expression);
  toRPN(tokens);

  // Проверка, что все переменные в выражении входят в список параметров шаблона
  const usedVars = extractVariables(tokens);
  for (const variable of usedVars) {
    if (!paramSet.has(variable)) {
      throw new Error(
        `В выражении используется неизвестный параметр "${variable}". Доступные параметры шаблона: ${params.join(', ')}.`
      );
    }
  }

  return {
    name,
    returnType,
    params,
    expression
  };
}

/**
 * Генерирует исходный код функции на языке C++ по заданному шаблону и имени функции.
 *
 * @param {Object} template - Объект шаблона.
 * @param {string} functionName - Имя создаваемой C++ функции (например, "SquareSum").
 * @returns {string} Сгенерированный C++ код функции.
 * @throws {Error} Если имя функции или данные шаблона некорректны.
 */
function generateCppFunctionCode(template, functionName) {
  const cleanFuncName = validateCppIdentifier(functionName, 'Имя функции');
  const validated = validateTemplateInput(template);

  const signatureParams = validated.params
    .map((param) => `${validated.returnType} ${param}`)
    .join(', ');

  return [
    `${validated.returnType} ${cleanFuncName}(${signatureParams}) {`,
    `    return ${validated.expression};`,
    `}`
  ].join('\n');
}

/**
 * Вычисляет тестовый результат для выбранного шаблона и одновременно генерирует код C++.
 *
 * @param {Object} template - Шаблон функции.
 * @param {string} functionName - Имя функции C++.
 * @param {Object|Map<string, number>} rawTestValues - Тестовые значения параметров.
 * @returns {{code: string, result: number}} Сгенерированный код и вычисленный результат.
 * @throws {Error} При ошибке валидации или вычисления (например, деление на ноль).
 */
function buildAndEvaluate(template, functionName, rawTestValues) {
  const validated = validateTemplateInput(template);
  const code = generateCppFunctionCode(validated, functionName);

  const tokens = tokenize(validated.expression);
  const rpn = toRPN(tokens);

  const valuesMap = new Map();
  const sourceObj = rawTestValues || {};

  for (const param of validated.params) {
    const rawVal = sourceObj instanceof Map ? sourceObj.get(param) : sourceObj[param];
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      throw new Error(`Введите тестовое числовое значение для параметра "${param}".`);
    }

    const strVal = String(rawVal).trim();
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(strVal)) {
      throw new Error(`Значение "${strVal}" для параметра "${param}" не является корректным числом.`);
    }

    const numVal = Number(strVal);
    if (!Number.isFinite(numVal)) {
      throw new Error(`Числовое значение для параметра "${param}" выходит за допустимые пределы.`);
    }

    if (validated.returnType === 'int' && !Number.isInteger(numVal)) {
      throw new Error(
        `Для типа int параметр "${param}" должен быть целым числом (введено: ${strVal}).`
      );
    }

    valuesMap.set(param, numVal);
  }

  const result = evaluateRPN(rpn, valuesMap, validated.returnType);

  return {
    code,
    result
  };
}

/**
 * Менеджер шаблонов, использующий структуру данных Map для хранения и быстрого доступа O(1)
 * по идентификатору шаблона.
 */
class TemplateManager {
  /**
   * @param {Array<Object>} [initialTemplates] - Начальный список шаблонов (из globalState или по умолчанию).
   */
  constructor(initialTemplates) {
    /**
     * Хранилище шаблонов: ключ — id шаблона, значение — объект шаблона.
     * @type {Map<string, Object>}
     */
    this.templates = new Map();

    const listToLoad =
      Array.isArray(initialTemplates) && initialTemplates.length > 0
        ? initialTemplates
        : DEFAULT_TEMPLATES;

    for (const item of listToLoad) {
      this.templates.set(item.id, {
        ...item,
        params: [...item.params]
      });
    }
  }

  /**
   * Возвращает массив всех сохранённых шаблонов.
   * @returns {Array<Object>} Массив объектов шаблонов.
   */
  getAll() {
    return Array.from(this.templates.values());
  }

  /**
   * Возвращает шаблон по его идентификатору за время O(1).
   * @param {string} id - Идентификатор шаблона.
   * @returns {Object|undefined} Найденный шаблон или undefined.
   */
  getById(id) {
    return this.templates.get(id);
  }

  /**
   * Создаёт и добавляет новый пользовательский шаблон.
   * @param {Object} data - Данные нового шаблона (name, returnType, params, expression).
   * @returns {Object} Созданный шаблон с уникальным id.
   */
  addTemplate(data) {
    const validated = validateTemplateInput(data);
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newTemplate = {
      id,
      ...validated,
      isDefault: false
    };

    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  /**
   * Обновляет существующий шаблон по его id.
   * @param {string} id - Идентификатор редактируемого шаблона.
   * @param {Object} data - Новые данные шаблона.
   * @returns {Object} Обновлённый шаблон.
   * @throws {Error} Если шаблон с указанным id не найден.
   */
  updateTemplate(id, data) {
    if (!this.templates.has(id)) {
      throw new Error(`Шаблон с идентификатором "${id}" не найден.`);
    }

    const existing = this.templates.get(id);
    const validated = validateTemplateInput(data);

    const updatedTemplate = {
      ...existing,
      ...validated,
      id
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Удаляет шаблон по его идентификатору.
   * @param {string} id - Идентификатор удаляемого шаблона.
   * @returns {boolean} true, если шаблон был удалён.
   * @throws {Error} Если шаблон не найден или остался последний шаблон.
   */
  deleteTemplate(id) {
    if (!this.templates.has(id)) {
      throw new Error(`Шаблон с идентификатором "${id}" не найден.`);
    }
    if (this.templates.size <= 1) {
      throw new Error('Нельзя удалить последний оставшийся шаблон в менеджере.');
    }
    return this.templates.delete(id);
  }

  /**
   * Сбрасывает коллекцию к 5 стандартным шаблонам по умолчанию.
   * @returns {Array<Object>} Обновлённый список шаблонов.
   */
  resetToDefaults() {
    this.templates.clear();
    for (const item of DEFAULT_TEMPLATES) {
      this.templates.set(item.id, {
        ...item,
        params: [...item.params]
      });
    }
    return this.getAll();
  }
}

module.exports = {
  ALLOWED_TYPES,
  CPP_KEYWORDS,
  DEFAULT_TEMPLATES,
  validateCppIdentifier,
  validateParameters,
  validateTemplateInput,
  generateCppFunctionCode,
  buildAndEvaluate,
  TemplateManager
};