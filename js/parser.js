/**
 * Sicherer mathematischer Ausdrucks-Parser (Tokenizer -> Shunting-Yard -> RPN Evaluator).
 * Verwendet strikt kein eval() oder new Function().
 */

const CONSTANTS = {
  'π': Math.PI,
  'e': Math.E
};

const OPERATORS = {
  '+': { precedence: 2, associativity: 'L', args: 2 },
  '−': { precedence: 2, associativity: 'L', args: 2 },
  '-': { precedence: 2, associativity: 'L', args: 2 },
  '×': { precedence: 3, associativity: 'L', args: 2 },
  '*': { precedence: 3, associativity: 'L', args: 2 },
  '÷': { precedence: 3, associativity: 'L', args: 2 },
  '/': { precedence: 3, associativity: 'L', args: 2 },
  '^': { precedence: 4, associativity: 'R', args: 2 },
  'u-': { precedence: 5, associativity: 'R', args: 1 }, // Unäres Minus
  '!': { precedence: 6, associativity: 'L', args: 1 }   // Postfix Fakultät
};

const FUNCTIONS = new Set([
  'sin', 'cos', 'tan',
  'asin', 'acos', 'atan',
  'sqrt', 'log', 'ln'
]);

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('Ungültige Fakultät');
  }
  if (n > 170) {
    throw new Error('Wert zu groß');
  }
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

function tokenize(expr) {
  const cleaned = expr.replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('Leerer Ausdruck');
  }

  const tokens = [];
  let i = 0;

  while (i < cleaned.length) {
    const ch = cleaned[i];

    // Zahlen (inkl. Dezimalpunkt und wissenschaftlicher Notation wie 1e-5)
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let dotCount = 0;
      while (i < cleaned.length && /[0-9.]/.test(cleaned[i])) {
        if (cleaned[i] === '.') dotCount++;
        if (dotCount > 1) throw new Error('Syntaxfehler');
        numStr += cleaned[i++];
      }
      if (numStr === '.') throw new Error('Syntaxfehler');

      // Wissenschaftliche E-Notation prüfen (z. B. 1.5e+10)
      if (i < cleaned.length && (cleaned[i] === 'e' || cleaned[i] === 'E') && /[0-9+-]/.test(cleaned[i + 1] || '')) {
        numStr += cleaned[i++];
        if (cleaned[i] === '+' || cleaned[i] === '-') {
          numStr += cleaned[i++];
        }
        if (!/[0-9]/.test(cleaned[i] || '')) throw new Error('Syntaxfehler');
        while (i < cleaned.length && /[0-9]/.test(cleaned[i])) {
          numStr += cleaned[i++];
        }
      }

      tokens.push({ type: 'number', value: parseFloat(numStr) });
      continue;
    }

    // Konstanten π und e
    if (ch === 'π' || ch === 'e') {
      tokens.push({ type: 'number', value: CONSTANTS[ch] });
      i++;
      continue;
    }

    // Funktionsnamen (Buchstaben)
    if (/[a-z]/i.test(ch)) {
      let funcName = '';
      while (i < cleaned.length && /[a-z]/i.test(cleaned[i])) {
        funcName += cleaned[i++];
      }
      if (!FUNCTIONS.has(funcName)) {
        throw new Error(`Unbekannte Funktion: ${funcName}`);
      }
      tokens.push({ type: 'function', value: funcName });
      continue;
    }

    // Klammern
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    // Operatoren
    if (ch in OPERATORS) {
      const prev = tokens[tokens.length - 1];
      const isUnaryMinus =
        (ch === '-' || ch === '−') &&
        (!prev || prev.type === 'operator' && prev.value !== '!' || (prev.type === 'paren' && prev.value === '('));

      if (isUnaryMinus) {
        tokens.push({ type: 'operator', value: 'u-' });
      } else {
        tokens.push({ type: 'operator', value: ch });
      }
      i++;
      continue;
    }

    throw new Error('Ungültiges Zeichen');
  }

  return insertImplicitMultiplication(tokens);
}

/**
 * Fügt implizite Multiplikationen ein (z. B. 2π -> 2 * π, 2(3+4) -> 2 * (3+4), (2)(3) -> (2)*(3)).
 */
function insertImplicitMultiplication(tokens) {
  const result = [];
  for (let i = 0; i < tokens.length; i++) {
    const curr = tokens[i];
    const next = tokens[i + 1];
    result.push(curr);

    if (!next) continue;

    const currEndsValue =
      curr.type === 'number' ||
      (curr.type === 'paren' && curr.value === ')') ||
      (curr.type === 'operator' && curr.value === '!');

    const nextStartsValue =
      next.type === 'number' ||
      next.type === 'function' ||
      (next.type === 'paren' && next.value === '(');

    if (currEndsValue && nextStartsValue) {
      result.push({ type: 'operator', value: '×' });
    }
  }
  return result;
}

function toRPN(tokens) {
  const output = [];
  const stack = [];

  for (const token of tokens) {
    if (token.type === 'number') {
      output.push(token);
    } else if (token.type === 'function') {
      stack.push(token);
    } else if (token.type === 'operator') {
      if (token.value === '!') {
        output.push(token);
        continue;
      }
      const o1 = OPERATORS[token.value];
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top.type === 'function') {
          output.push(stack.pop());
          continue;
        }
        if (top.type === 'operator') {
          const o2 = OPERATORS[top.value];
          if (
            (o1.associativity === 'L' && o1.precedence <= o2.precedence) ||
            (o1.associativity === 'R' && o1.precedence < o2.precedence)
          ) {
            output.push(stack.pop());
            continue;
          }
        }
        break;
      }
      stack.push(token);
    } else if (token.type === 'paren' && token.value === '(') {
      stack.push(token);
    } else if (token.type === 'paren' && token.value === ')') {
      let foundLeft = false;
      while (stack.length > 0) {
        const top = stack.pop();
        if (top.type === 'paren' && top.value === '(') {
          foundLeft = true;
          break;
        }
        output.push(top);
      }
      if (!foundLeft) {
        throw new Error('Klammerfehler');
      }
      if (stack.length > 0 && stack[stack.length - 1].type === 'function') {
        output.push(stack.pop());
      }
    }
  }

  while (stack.length > 0) {
    const top = stack.pop();
    if (top.type === 'paren') {
      throw new Error('Klammerfehler');
    }
    output.push(top);
  }

  return output;
}

function evaluateRPN(rpn, angleMode = 'DEG') {
  const stack = [];
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  for (const token of rpn) {
    if (token.type === 'number') {
      stack.push(token.value);
    } else if (token.type === 'operator') {
      if (token.value === 'u-') {
        if (stack.length < 1) throw new Error('Syntaxfehler');
        stack.push(-stack.pop());
      } else if (token.value === '!') {
        if (stack.length < 1) throw new Error('Syntaxfehler');
        stack.push(factorial(stack.pop()));
      } else {
        if (stack.length < 2) throw new Error('Syntaxfehler');
        const b = stack.pop();
        const a = stack.pop();
        switch (token.value) {
          case '+':
            stack.push(a + b);
            break;
          case '−':
          case '-':
            stack.push(a - b);
            break;
          case '×':
          case '*':
            stack.push(a * b);
            break;
          case '÷':
          case '/':
            if (b === 0) throw new Error('Division durch 0');
            stack.push(a / b);
            break;
          case '^':
            stack.push(Math.pow(a, b));
            break;
          default:
            throw new Error('Unbekannter Operator');
        }
      }
    } else if (token.type === 'function') {
      if (stack.length < 1) throw new Error('Syntaxfehler');
      const val = stack.pop();
      let res;

      switch (token.value) {
        case 'sin': {
          const rad = angleMode === 'DEG' ? toRad(val) : val;
          res = Math.abs(Math.sin(rad)) < 1e-15 ? 0 : Math.sin(rad);
          break;
        }
        case 'cos': {
          const rad = angleMode === 'DEG' ? toRad(val) : val;
          res = Math.abs(Math.cos(rad)) < 1e-15 ? 0 : Math.cos(rad);
          break;
        }
        case 'tan': {
          if (angleMode === 'DEG' && Math.abs(val % 180) === 90) {
            throw new Error('Nicht definiert');
          }
          const rad = angleMode === 'DEG' ? toRad(val) : val;
          res = Math.tan(rad);
          break;
        }
        case 'asin':
          if (val < -1 || val > 1) throw new Error('Definitionsbereich');
          res = angleMode === 'DEG' ? toDeg(Math.asin(val)) : Math.asin(val);
          break;
        case 'acos':
          if (val < -1 || val > 1) throw new Error('Definitionsbereich');
          res = angleMode === 'DEG' ? toDeg(Math.acos(val)) : Math.acos(val);
          break;
        case 'atan':
          res = angleMode === 'DEG' ? toDeg(Math.atan(val)) : Math.atan(val);
          break;
        case 'sqrt':
          if (val < 0) throw new Error('Negative Wurzel');
          res = Math.sqrt(val);
          break;
        case 'log':
          if (val <= 0) throw new Error('Definitionsbereich');
          res = Math.log10(val);
          break;
        case 'ln':
          if (val <= 0) throw new Error('Definitionsbereich');
          res = Math.log(val);
          break;
        default:
          throw new Error('Unbekannte Funktion');
      }
      stack.push(res);
    }
  }

  if (stack.length !== 1 || Number.isNaN(stack[0])) {
    throw new Error('Syntaxfehler');
  }

  if (!Number.isFinite(stack[0])) {
    throw new Error('Überlauf');
  }

  // Rundungsartefakte (z. B. 0.1 + 0.2 = 0.30000000000000004) bereinigen
  return Math.round(stack[0] * 1e12) / 1e12;
}

export function evaluateExpression(expression, angleMode = 'DEG') {
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  return evaluateRPN(rpn, angleMode);
}