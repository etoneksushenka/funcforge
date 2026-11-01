/**
 * @file test/logic.test.js
 * @description Модульные тесты для парсера арифметических выражений и менеджера шаблонов C++.
 * Используются встроенные средства Node.js: node:test и node:assert/strict.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  tokenize,
  toRPN,
  extractVariables,
  evaluateExpression
} = require('../src/expression');

const {
  validateCppIdentifier,
  validateParameters,
  validateTemplateInput,
  generateCppFunctionCode,
  buildAndEvaluate,
  TemplateManager
} = require('../src/templates');

describe('Модуль разбора и вычисления выражений (src/expression.js)', () => {
  it('корректно вычисляет сумму квадратов и учитывает приоритет операций', () => {
    const res1 = evaluateExpression('a * a + b * b', { a: 3, b: 4 }, 'double');
    assert.equal(res1, 25);

    const res2 = evaluateExpression('a + b * c', { a: 2, b: 3, c: 4 }, 'double');
    assert.equal(res2, 14);
  });

  it('корректно обрабатывает скобки и унарный минус', () => {
    const res1 = evaluateExpression('(a + b) * c', { a: 2, b: 3, c: 4 }, 'double');
    assert.equal(res1, 20);

    const res2 = evaluateExpression('-a + b * (-c)', { a: 5, b: 2, c: 3 }, 'double');
    assert.equal(res2, -11);
  });

  it('учитывает целочисленное деление C++ для типа int (отбрасывание дробной части к нулю)', () => {
    assert.equal(evaluateExpression('a / b', { a: 7, b: 2 }, 'int'), 3);
    assert.equal(evaluateExpression('a / b', { a: -7, b: 2 }, 'int'), -3);
    assert.equal(evaluateExpression('a / b', { a: 7, b: 2 }, 'double'), 3.5);
  });

  it('извлекает уникальные переменные в структуру данных Set', () => {
    const tokens = tokenize('x * x + y - x + z');
    const vars = extractVariables(tokens);
    assert.equal(vars instanceof Set, true);
    assert.deepEqual(Array.from(vars), ['x', 'y', 'z']);
  });

  it('выбрасывает понятную ошибку при делении на ноль', () => {
    assert.throws(
      () => evaluateExpression('a / (b - b)', { a: 10, b: 5 }, 'double'),
      /деление на ноль/i
    );
  });

  it('выбрасывает ошибку при несогласованных скобках или некорректном выражении', () => {
    assert.throws(() => toRPN(tokenize('(a + b')), /Несогласованные скобки/);
    assert.throws(() => toRPN(tokenize('a + * b')), /Пропущен операнд/);
    assert.throws(() => tokenize('a $ b'), /Недопустимый символ/);
  });
});

describe('Модуль шаблонов и генерации C++ кода (src/templates.js)', () => {
  it('проверяет корректность идентификаторов C++ и блокирует ключевые слова', () => {
    assert.equal(validateCppIdentifier('SquareSum', 'Имя функции'), 'SquareSum');
    assert.equal(validateCppIdentifier('_val_1', 'Параметр'), '_val_1');

    assert.throws(() => validateCppIdentifier('123func', 'Имя функции'), /некорректен/);
    assert.throws(() => validateCppIdentifier('return', 'Имя функции'), /ключевым словом C\+\+/);
    assert.throws(() => validateCppIdentifier('double', 'Параметр'), /ключевым словом C\+\+/);
  });

  it('блокирует повторяющиеся имена параметров через Set', () => {
    assert.deepEqual(validateParameters('a, b, c'), ['a', 'b', 'c']);
    assert.throws(() => validateParameters('a, b, a'), /Повторяющееся имя параметра "a"/);
  });

  it('проверяет соответствие переменных выражения объявленным параметрам шаблона', () => {
    assert.throws(
      () =>
        validateTemplateInput({
          name: 'Тест',
          returnType: 'double',
          params: 'a, b',
          expression: 'a + b + c'
        }),
      /неизвестный параметр "c"/
    );
  });

  it('генерирует точную сигнатуру и тело C++ функции по требованиям ТЗ', () => {
    const tpl = {
      name: 'Сумма квадратов',
      returnType: 'double',
      params: ['a', 'b'],
      expression: 'a * a + b * b'
    };

    const { code, result } = buildAndEvaluate(tpl, 'SquareSum', { a: 3, b: 4 });
    const expectedCode = [
      'double SquareSum(double a, double b) {',
      '    return a * a + b * b;',
      '}'
    ].join('\n');

    assert.equal(code, expectedCode);
    assert.equal(result, 25);
  });

  it('запрещает дробные тестовые значения для типа int', () => {
    const tpl = {
      name: 'Целая сумма',
      returnType: 'int',
      params: ['a', 'b'],
      expression: 'a + b'
    };

    assert.throws(
      () => buildAndEvaluate(tpl, 'IntSum', { a: '3.5', b: '2' }),
      /должен быть целым числом/
    );
  });

  it('управляет коллекцией шаблонов через структуру данных Map (CRUD)', () => {
    const manager = new TemplateManager();
    // По умолчанию загружено 5 стартовых шаблонов
    assert.equal(manager.getAll().length, 5);

    // Добавление пользовательского шаблона
    const added = manager.addTemplate({
      name: 'Линейная функция',
      returnType: 'float',
      params: 'k, x, b',
      expression: 'k * x + b'
    });
    assert.equal(manager.getAll().length, 6);
    assert.equal(manager.getById(added.id).name, 'Линейная функция');

    // Обновление шаблона
    const updated = manager.updateTemplate(added.id, {
      name: 'Линейная функция (обн.)',
      returnType: 'double',
      params: 'k, x, b',
      expression: 'k * x - b'
    });
    assert.equal(updated.returnType, 'double');
    assert.equal(updated.expression, 'k * x - b');

    // Удаление шаблона
    manager.deleteTemplate(added.id);
    assert.equal(manager.getAll().length, 5);
  });
});