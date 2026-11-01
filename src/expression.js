/**
 * @file src/expression.js
 * @description Модуль лексического анализа, парсинга (алгоритм сортировочной станции Дейкстры)
 * и вычисления арифметических выражений с учётом типов данных C++.
 */

/**
 * Таблица поддерживаемых операторов в структуре данных Map.
 * Ключ — символ оператора ('u-' обозначает унарный минус).
 * Значение — объект с приоритетом (precedence), ассоциативностью (assoc) и арностью (arity).
 * @type {Map<string, {precedence: number, assoc: string, arity: number}>}
 */
const OPERATORS = new Map([
  ['+', { precedence: 1, assoc: 'left', arity: 2 }],
  ['-', { precedence: 1, assoc: 'left', arity: 2 }],
  ['*', { precedence: 2, assoc: 'left', arity: 2 }],
  ['/', { precedence: 2, assoc: 'left', arity: 2 }],
  ['u-', { precedence: 3, assoc: 'right', arity: 1 }]
]);

/**
 * Разбивает строку арифметического выражения на массив токенов (лексем).
 *
 * @param {string} expr - Исходное арифметическое выражение (например, "a * a + b * b").
 * @returns {Array<{type: string, value: string|number}>} Упорядоченный массив объектов-токенов.
 * @throws {Error} Если выражение пустое или содержит недопустимые символы.
 */
function tokenize(expr) {
  if (typeof expr !== 'string' || expr.trim().length === 0) {
    throw new Error('Арифметическое выражение не может быть пустым.');
  }

  const tokens = [];
  let i = 0;
  const length = expr.length;

  while (i < length) {
    const ch = expr[i];

    // Пропускаем пробельные символы
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Числовые литералы (целые и с плавающей точкой, например 42 или 3.14)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < length && /[0-9]/.test(expr[i + 1]))) {
      let numStr = '';
      let dotCount = 0;

      while (i < length && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
        if (expr[i] === '.') {
          dotCount++;
          if (dotCount > 1) {
            throw new Error(`Некорректная запись числа возле "${numStr}." в выражении.`);
          }
        }
        numStr += expr[i];
        i++;
      }

      // Проверка, что сразу после числа не идёт буква (например, "2a" без знака умножения)
      if (i < length && /[a-zA-Z_]/.test(expr[i])) {
        throw new Error(`Пропущен оператор между числом "${numStr}" и идентификатором.`);
      }

      const numValue = Number(numStr);
      if (!Number.isFinite(numValue)) {
        throw new Error(`Некорректное числовое значение: "${numStr}".`);
      }

      tokens.push({ type: 'number', value: numValue });
      continue;
    }

    // Идентификаторы переменных (параметров C++)
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = '';
      while (i < length && /[a-zA-Z0-9_]/.test(expr[i])) {
        idStr += expr[i];
        i++;
      }
      tokens.push({ type: 'identifier', value: idStr });
      continue;
    }

    // Скобки
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    // Арифметические операторы
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      // Определяем, является ли минус унарным:
      // он унарный, если стоит в начале выражения, после '(' или после другого оператора
      const prevToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;
      const isUnary =
        ch === '-' &&
        (prevToken === null ||
          prevToken.type === 'operator' ||
          (prevToken.type === 'paren' && prevToken.value === '('));

      if (ch === '+' && (prevToken === null || prevToken.type === 'operator' || (prevToken.type === 'paren' && prevToken.value === '('))) {
        throw new Error('Унарный плюс не поддерживается или пропущен операнд перед "+".');
      }

      tokens.push({
        type: 'operator',
        value: isUnary ? 'u-' : ch
      });
      i++;
      continue;
    }

    throw new Error(`Недопустимый символ "${ch}" в арифметическом выражении.`);
  }

  if (tokens.length === 0) {
    throw new Error('Арифметическое выражение не содержит ни одного токена.');
  }

  return tokens;
}

/**
 * Переводит массив токенов из инфиксной нотации в Обратную польскую запись (ОПЗ / RPN)
 * с помощью алгоритма сортировочной станции Дейкстры (Shunting Yard Algorithm).
 * Одновременно проверяет синтаксическую корректность последовательности токенов.
 *
 * @param {Array<{type: string, value: string|number}>} tokens - Массив токенов из tokenize().
 * @returns {Array<{type: string, value: string|number}>} Очередь вывода в формате ОПЗ.
 * @throws {Error} При несогласованных скобках или синтаксических ошибках.
 */
function toRPN(tokens) {
  const outputQueue = [];
  const operatorStack = []; // Стек операторов (LIFO)

  // Контроль чередования: ожидаем ли мы сейчас операнд (число, переменную, '(' или унарный минус)
  let expectOperand = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'number' || token.type === 'identifier') {
      if (!expectOperand) {
        throw new Error(`Пропущен оператор перед "${token.value}".`);
      }
      outputQueue.push(token);
      expectOperand = false;
    } else if (token.type === 'paren' && token.value === '(') {
      if (!expectOperand) {
        throw new Error('Пропущен оператор перед открывающей скобкой "(".');
      }
      operatorStack.push(token);
      expectOperand = true;
    } else if (token.type === 'paren' && token.value === ')') {
      if (expectOperand) {
        throw new Error('Пустые скобки "()" или пропущен операнд перед ")".');
      }

      let foundLeftParen = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop();
        if (top.type === 'paren' && top.value === '(') {
          foundLeftParen = true;
          break;
        }
        outputQueue.push(top);
      }

      if (!foundLeftParen) {
        throw new Error('Несогласованные скобки: лишняя закрывающая скобка ")".');
      }
      expectOperand = false;
    } else if (token.type === 'operator') {
      const opInfo = OPERATORS.get(token.value);
      if (!opInfo) {
        throw new Error(`Неизвестный оператор "${token.value}".`);
      }

      if (token.value === 'u-') {
        if (!expectOperand) {
          throw new Error('Некорректное расположение унарного минуса.');
        }
      } else {
        if (expectOperand) {
          throw new Error(`Пропущен операнд перед бинарным оператором "${token.value}".`);
        }
      }

      while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1];
        if (top.type !== 'operator') {
          break;
        }
        const topInfo = OPERATORS.get(top.value);
        const shouldPop =
          (opInfo.assoc === 'left' && opInfo.precedence <= topInfo.precedence) ||
          (opInfo.assoc === 'right' && opInfo.precedence < topInfo.precedence);

        if (shouldPop) {
          outputQueue.push(operatorStack.pop());
        } else {
          break;
        }
      }

      operatorStack.push(token);
      expectOperand = true;
    }
  }

  if (expectOperand) {
    throw new Error('Выражение не может заканчиваться оператором или открывающей скобкой.');
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop();
    if (top.type === 'paren') {
      throw new Error('Несогласованные скобки: не закрыта открывающая скобка "(".');
    }
    outputQueue.push(top);
  }

  return outputQueue;
}

/**
 * Извлекает множество всех уникальных идентификаторов переменных из массива токенов.
 *
 * @param {Array<{type: string, value: string|number}>} tokens - Массив токенов.
 * @returns {Set<string>} Множество уникальных имён переменных (структура данных Set).
 */
function extractVariables(tokens) {
  const variablesSet = new Set();
  for (const token of tokens) {
    if (token.type === 'identifier') {
      variablesSet.add(token.value);
    }
  }
  return variablesSet;
}

/**
 * Применяет правила арифметики выбранного типа C++ к числу.
 * Для типа int в C++ дробная часть отбрасывается по направлению к нулю (Math.trunc).
 * Для типа float выполняется округление до 32-битного числа с плавающей точкой (Math.fround).
 *
 * @param {number} value - Числовое значение.
 * @param {string} returnType - Тип возвращаемого значения ('int', 'float', 'double').
 * @returns {number} Приведённое числовое значение.
 */
function castToCppType(value, returnType) {
  if (!Number.isFinite(value)) {
    throw new Error('Результат вычисления выходит за пределы допустимых чисел (переполнение или деление на ноль).');
  }
  if (returnType === 'int') {
    const truncated = Math.trunc(value);
    // Убираем возможный -0 в JavaScript
    return truncated === 0 ? 0 : truncated;
  }
  if (returnType === 'float') {
    const rounded = Math.fround(value);
    return rounded === 0 ? 0 : Number(rounded.toPrecision(7));
  }
  return value === 0 ? 0 : value;
}

/**
 * Вычисляет значение выражения, представленного в Обратной польской записи (RPN),
 * с использованием стека вычислений и словаря значений переменных Map.
 *
 * @param {Array<{type: string, value: string|number}>} rpnTokens - Токены в формате ОПЗ.
 * @param {Map<string, number>|Object} variables - Значения параметров (Map или обычный объект).
 * @param {string} [returnType='double'] - Тип возвращаемого значения C++ ('int', 'float', 'double').
 * @returns {number} Итоговый результат вычисления.
 * @throws {Error} При делении на ноль или отсутствии значения переменной.
 */
function evaluateRPN(rpnTokens, variables, returnType = 'double') {
  // Преобразуем входной словарь в структуру данных Map, если передан обычный объект
  const varsMap = variables instanceof Map ? variables : new Map(Object.entries(variables || {}));
  const evalStack = []; // Стек для вычисления ОПЗ (LIFO)

  for (const token of rpnTokens) {
    if (token.type === 'number') {
      evalStack.push(castToCppType(token.value, returnType));
    } else if (token.type === 'identifier') {
      if (!varsMap.has(token.value)) {
        throw new Error(`Не задано тестовое значение для параметра "${token.value}".`);
      }
      const rawVal = Number(varsMap.get(token.value));
      if (Number.isNaN(rawVal) || !Number.isFinite(rawVal)) {
        throw new Error(`Некорректное числовое значение для параметра "${token.value}".`);
      }
      evalStack.push(castToCppType(rawVal, returnType));
    } else if (token.type === 'operator') {
      if (token.value === 'u-') {
        if (evalStack.length < 1) {
          throw new Error('Ошибка вычисления: недостаточно операндов для унарного минуса.');
        }
        const operand = evalStack.pop();
        evalStack.push(castToCppType(-operand, returnType));
      } else {
        if (evalStack.length < 2) {
          throw new Error(`Ошибка вычисления: недостаточно операндов для оператора "${token.value}".`);
        }
        const right = evalStack.pop();
        const left = evalStack.pop();
        let result;

        switch (token.value) {
          case '+':
            result = left + right;
            break;
          case '-':
            result = left - right;
            break;
          case '*':
            result = left * right;
            break;
          case '/':
            if (right === 0) {
              throw new Error('Ошибка вычисления: деление на ноль.');
            }
            result = left / right;
            break;
          default:
            throw new Error(`Неподдерживаемый оператор "${token.value}".`);
        }

        evalStack.push(castToCppType(result, returnType));
      }
    }
  }

  if (evalStack.length !== 1) {
    throw new Error('Некорректное арифметическое выражение: стек вычислений содержит лишние элементы.');
  }

  return evalStack[0];
}

/**
 * Удобная фасадная функция: разбирает строковое выражение и сразу вычисляет его результат.
 *
 * @param {string} expr - Строка арифметического выражения.
 * @param {Map<string, number>|Object} variables - Значения переменных.
 * @param {string} [returnType='double'] - Тип C++ ('int', 'float', 'double').
 * @returns {number} Результат вычисления.
 */
function evaluateExpression(expr, variables, returnType = 'double') {
  const tokens = tokenize(expr);
  const rpn = toRPN(tokens);
  return evaluateRPN(rpn, variables, returnType);
}

module.exports = {
  OPERATORS,
  tokenize,
  toRPN,
  extractVariables,
  castToCppType,
  evaluateRPN,
  evaluateExpression
};