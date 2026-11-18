/**
 * Programmierer-Rechner-Modul (32-Bit Signed Integer Logik)
 * Unterstützt HEX (16), DEC (10), OCT (8), BIN (2) und Bitwise-Operationen.
 */

export class ProgrammerCalculator {
  constructor() {
    this.base = 10;
    this.currentValue = 0; // 32-bit signed integer
    this.accumulator = null;
    this.pendingOp = null;
    this.resetOnNextDigit = false;
  }

  setBase(newBase) {
    this.base = Number(newBase);
    this.resetOnNextDigit = false;
  }

  inputDigit(char) {
    const upper = char.toUpperCase();
    const digitVal = parseInt(upper, 16);
    if (Number.isNaN(digitVal) || digitVal >= this.base) return;

    if (this.resetOnNextDigit) {
      this.currentValue = 0;
      this.resetOnNextDigit = false;
    }

    const currentStr = this.formatValue(this.currentValue, this.base, false);
    const nextStr = currentStr === '0' ? upper : currentStr + upper;
    const parsed = parseInt(nextStr, this.base);

    // Begrenzung auf 32-Bit Bereich
    if (parsed <= 0xffffffff) {
      this.currentValue = parsed | 0;
    }
  }

  backspace() {
    if (this.resetOnNextDigit) return;
    const str = this.formatValue(this.currentValue, this.base, false);
    if (str.length <= 1 || (str.length === 2 && str.startsWith('-'))) {
      this.currentValue = 0;
    } else {
      const sliced = str.slice(0, -1);
      this.currentValue = parseInt(sliced, this.base) | 0;
    }
  }

  clear() {
    this.currentValue = 0;
    this.accumulator = null;
    this.pendingOp = null;
    this.resetOnNextDigit = false;
  }

  negate() {
    this.currentValue = (-this.currentValue) | 0;
  }

  bitwiseNot() {
    this.currentValue = (~this.currentValue) | 0;
    this.resetOnNextDigit = true;
  }

  setOperator(op) {
    if (this.pendingOp && !this.resetOnNextDigit) {
      this.calculate();
    }
    this.accumulator = this.currentValue;
    this.pendingOp = op;
    this.resetOnNextDigit = true;
  }

  calculate() {
    if (this.pendingOp === null || this.accumulator === null) {
      return null;
    }

    const a = this.accumulator | 0;
    const b = this.currentValue | 0;
    let result = 0;

    switch (this.pendingOp) {
      case 'ADD':
        result = (a + b) | 0;
        break;
      case 'SUB':
        result = (a - b) | 0;
        break;
      case 'MUL':
        result = Math.imul(a, b);
        break;
      case 'DIV':
        if (b === 0) {
          this.clear();
          throw new Error('Division durch 0');
        }
        result = (a / b) | 0;
        break;
      case 'AND':
        result = a & b;
        break;
      case 'OR':
        result = a | b;
        break;
      case 'XOR':
        result = a ^ b;
        break;
      case 'LSH':
        result = a << (b & 31);
        break;
      case 'RSH':
        result = a >> (b & 31);
        break;
      default:
        result = b;
    }

    const exprString = `${this.formatValue(a, this.base, false)} ${this.getOpSymbol(this.pendingOp)} ${this.formatValue(b, this.base, false)}`;
    this.currentValue = result | 0;
    this.accumulator = null;
    this.pendingOp = null;
    this.resetOnNextDigit = true;

    return {
      expression: exprString,
      result: this.formatValue(this.currentValue, this.base, true)
    };
  }

  getOpSymbol(op) {
    const map = {
      ADD: '+',
      SUB: '−',
      MUL: '×',
      DIV: '÷',
      AND: 'AND',
      OR: 'OR',
      XOR: 'XOR',
      LSH: '<<',
      RSH: '>>'
    };
    return map[op] || op;
  }

  formatValue(val, base, grouped = true) {
    if (base === 10) {
      return grouped ? val.toLocaleString('de-DE') : String(val);
    }

    // Unsigned 32-Bit Darstellung für HEX, OCT, BIN
    const unsigned = val >>> 0;
    let raw = unsigned.toString(base).toUpperCase();

    if (!grouped) return raw;

    if (base === 2) {
      // In 4er-Nibbles gruppieren
      const padLen = Math.ceil(raw.length / 4) * 4;
      raw = raw.padStart(padLen, '0');
      return raw.match(/.{1,4}/g).join(' ');
    }

    if (base === 16) {
      return raw.replace(/\B(?=(\w{4})+(?!\w))/g, ' ');
    }

    return raw;
  }

  getRepresentations() {
    return {
      main: this.formatValue(this.currentValue, this.base, true),
      expression:
        this.pendingOp !== null && this.accumulator !== null
          ? `${this.formatValue(this.accumulator, this.base, false)} ${this.getOpSymbol(this.pendingOp)}`
          : '',
      hex: this.formatValue(this.currentValue, 16, true),
      dec: this.formatValue(this.currentValue, 10, true),
      oct: this.formatValue(this.currentValue, 8, true),
      bin: this.formatValue(this.currentValue, 2, true)
    };
  }
}
