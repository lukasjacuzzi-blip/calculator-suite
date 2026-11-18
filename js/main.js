import { evaluateExpression } from './parser.js';
import { ProgrammerCalculator } from './programmer.js';
import { UnitConverter } from './converter.js';
import { HistoryManager } from './history.js';
import { FunctionPlotter } from './plotter.js';

const THEME_STORAGE_KEY = 'calc_suite_theme';

class CalculatorApp {
  constructor() {
    this.activeMode = 'standard';
    this.angleMode = 'DEG';
    this.expression = '';
    this.currentResult = '0';
    this.justEvaluated = false;
    this.isError = false;

    this.programmer = new ProgrammerCalculator();
    this.converter = new UnitConverter();
    this.history = new HistoryManager();
    this.plotter = null;

    this.activeConvCategory = 'currency';

    this.cacheDOM();
    this.initTheme();
    this.bindEvents();
    this.initConverterUI();
    this.updateProgrammerUI();
    this.renderHistory();
  }

  cacheDOM() {
    this.shell = document.querySelector('.calculator-shell');
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.modeViews = document.querySelectorAll('.mode-view');

    this.sciToggleBtn = document.getElementById('sciToggleBtn');
    this.sciPanel = document.getElementById('scientificPanel');
    this.historyToggleBtn = document.getElementById('historyToggleBtn');
    this.historyDrawer = document.getElementById('historyDrawer');
    this.themeToggleBtn = document.getElementById('themeToggleBtn');

    this.angleIndicator = document.getElementById('angleIndicator');
    this.degRadBtn = document.getElementById('degRadBtn');
    this.copyResultBtn = document.getElementById('copyResultBtn');
    this.copyFeedback = document.getElementById('copyFeedback');
    this.stdExpressionEl = document.getElementById('stdExpression');
    this.stdResultEl = document.getElementById('stdResult');

    this.progExpressionEl = document.getElementById('progExpression');
    this.progMainValueEl = document.getElementById('progMainValue');
    this.valHexEl = document.getElementById('valHex');
    this.valDecEl = document.getElementById('valDec');
    this.valOctEl = document.getElementById('valOct');
    this.valBinEl = document.getElementById('valBin');
    this.radixRows = document.querySelectorAll('.radix-row');
    this.progDigitBtns = document.querySelectorAll('[data-prog-digit]');

    this.catPills = document.querySelectorAll('.cat-pill:not(.preset-fn)');
    this.convInputA = document.getElementById('convInputA');
    this.convInputB = document.getElementById('convInputB');
    this.convUnitA = document.getElementById('convUnitA');
    this.convUnitB = document.getElementById('convUnitB');
    this.swapUnitsBtn = document.getElementById('swapUnitsBtn');
    this.currencyRatePanel = document.getElementById('currencyRatePanel');
    this.rateFormulaText = document.getElementById('rateFormulaText');
    this.toggleRateEditBtn = document.getElementById('toggleRateEditBtn');
    this.rateEditBox = document.getElementById('rateEditBox');
    this.customRateInput = document.getElementById('customRateInput');
    this.applyRateBtn = document.getElementById('applyRateBtn');
    this.resetRatesBtn = document.getElementById('resetRatesBtn');

    this.historyListEl = document.getElementById('historyList');
    this.exportHistoryBtn = document.getElementById('exportHistoryBtn');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    this.closeHistoryBtn = document.getElementById('closeHistoryBtn');
  }

  initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    if (this.plotter) this.plotter.render();
  }

  switchMode(mode) {
    this.activeMode = mode;
    this.tabBtns.forEach((btn) => {
      const isSelected = btn.dataset.mode === mode;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));
    });

    this.modeViews.forEach((view) => {
      view.classList.toggle('active', view.id === 'mode-' + mode);
    });

    if (mode !== 'standard') {
      this.sciPanel.classList.add('hidden');
      this.shell.classList.remove('expanded-sci');
      this.sciToggleBtn.classList.remove('active');
    }

    if (mode === 'graph') {
      if (!this.plotter) {
        const canvas = document.getElementById('graphCanvas');
        const coordsEl = document.getElementById('graphCoords');
        this.plotter = new FunctionPlotter(canvas, coordsEl);
      }
      requestAnimationFrame(() => this.plotter.resize());
    }
  }

  toggleScientificPanel() {
    if (this.activeMode !== 'standard') {
      this.switchMode('standard');
    }
    const isHidden = this.sciPanel.classList.toggle('hidden');
    this.shell.classList.toggle('expanded-sci', !isHidden);
    this.sciToggleBtn.classList.toggle('active', !isHidden);
  }

  handleStandardButton(btn) {
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (this.isError && action !== 'clear') {
      this.clearStandard();
    }

    switch (action) {
      case 'digit':
        if (this.justEvaluated) {
          this.expression = value;
          this.justEvaluated = false;
        } else {
          this.expression += value;
        }
        this.livePreviewStandard();
        break;

      case 'decimal': {
        if (this.justEvaluated) {
          this.expression = '0.';
          this.justEvaluated = false;
          break;
        }
        const lastNumber = this.expression.split(/[+\−×÷^()]/).pop();
        if (!lastNumber.includes('.')) {
          this.expression += lastNumber === '' ? '0.' : '.';
        }
        break;
      }

      case 'operator':
        if (this.justEvaluated) {
          this.expression = this.currentResult + value;
          this.justEvaluated = false;
        } else if (this.expression === '' && value === '−') {
          this.expression = '−';
        } else if (this.expression !== '') {
          this.expression = this.expression.replace(/[+\−×÷^]$/, '') + value;
        }
        break;

      case 'func':
        if (this.justEvaluated) {
          this.expression = value + this.currentResult + ')';
          this.justEvaluated = false;
          this.livePreviewStandard();
        } else {
          this.expression += value;
        }
        break;

      case 'const':
        if (this.justEvaluated) {
          this.expression = value;
          this.justEvaluated = false;
        } else {
          this.expression += value;
        }
        this.livePreviewStandard();
        break;

      case 'paren': {
        if (this.justEvaluated) {
          this.expression = '(';
          this.justEvaluated = false;
          break;
        }
        const openCount = (this.expression.match(/\(/g) || []).length;
        const closeCount = (this.expression.match(/\)/g) || []).length;
        const lastChar = this.expression.slice(-1);
        if (openCount > closeCount && /[0-9πe)!]/.test(lastChar)) {
          this.expression += ')';
        } else {
          this.expression += '(';
        }
        this.livePreviewStandard();
        break;
      }

      case 'square':
        if (this.justEvaluated) {
          this.expression = '(' + this.currentResult + ')^2';
          this.justEvaluated = false;
        } else if (this.expression !== '') {
          this.expression += '^2';
        }
        this.livePreviewStandard();
        break;

      case 'factorial':
        if (this.justEvaluated) {
          this.expression = this.currentResult + '!';
          this.justEvaluated = false;
        } else if (this.expression !== '') {
          this.expression += '!';
        }
        this.livePreviewStandard();
        break;

      case 'percent':
        if (this.justEvaluated) {
          this.expression = '(' + this.currentResult + '÷100)';
          this.justEvaluated = false;
        } else if (this.expression !== '') {
          this.expression += '÷100';
        }
        this.livePreviewStandard();
        break;

      case 'negate':
        if (this.justEvaluated) {
          const negated = String(-Number(this.currentResult));
          this.expression = negated;
          this.currentResult = negated;
          this.justEvaluated = false;
        } else if (this.expression.startsWith('−')) {
          this.expression = this.expression.slice(1);
        } else if (this.expression !== '') {
          this.expression = '−(' + this.expression + ')';
        }
        this.livePreviewStandard();
        break;

      case 'angle-toggle':
        this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
        this.angleIndicator.textContent = this.angleMode;
        this.degRadBtn.textContent = this.angleMode;
        this.livePreviewStandard();
        break;

      case 'backspace':
        if (this.justEvaluated) {
          this.justEvaluated = false;
        }
        this.expression = this.expression.slice(0, -1);
        if (this.expression === '') {
          this.currentResult = '0';
        } else {
          this.livePreviewStandard();
        }
        break;

      case 'clear':
        this.clearStandard();
        break;

      case 'equals':
        this.evaluateStandard();
        break;
    }

    this.updateStandardDisplay();
  }

  clearStandard() {
    this.expression = '';
    this.currentResult = '0';
    this.justEvaluated = false;
    this.isError = false;
    this.stdResultEl.classList.remove('error');
  }

  autoCloseParentheses(expr) {
    const openCount = (expr.match(/\(/g) || []).length;
    const closeCount = (expr.match(/\)/g) || []).length;
    if (openCount > closeCount) {
return expr + ')'.repeat(openCount - closeCount);
}
return expr;
}
livePreviewStandard() {
if (!this.expression) return;
try {
const balanced = this.autoCloseParentheses(this.expression);
const val = evaluateExpression(balanced, this.angleMode);
this.currentResult = this.formatResultNumber(val);
this.isError = false;
this.stdResultEl.classList.remove('error');
} catch {
// Unvollständige Ausdrücke tolerieren
}
}
evaluateStandard() {
if (!this.expression) return;
try {
const balanced = this.autoCloseParentheses(this.expression);
const val = evaluateExpression(balanced, this.angleMode);
const formatted = this.formatResultNumber(val);
this.history.add(balanced, formatted, 'Standard');
this.renderHistory();
this.expression = balanced;
this.currentResult = formatted;
this.justEvaluated = true;
this.isError = false;
this.stdResultEl.classList.remove('error');
} catch (err) {
this.currentResult = err.message || 'Fehler';
this.isError = true;
this.stdResultEl.classList.add('error');
}
}
formatResultNumber(num) {
if (Math.abs(num) >= 1e13 || (Math.abs(num) > 0 && Math.abs(num) < 1e-9)) {
return num.toExponential(6).replace(/.?0+e/, 'e');
}
return String(num);
}
updateStandardDisplay() {
this.stdExpressionEl.textContent = this.expression;
this.stdResultEl.textContent = this.currentResult;
this.stdExpressionEl.scrollLeft = this.stdExpressionEl.scrollWidth;
const len = this.currentResult.length;
if (this.isError) {
this.stdResultEl.style.fontSize = '1.45rem';
} else if (len > 16) {
this.stdResultEl.style.fontSize = '1.45rem';
} else if (len > 12) {
this.stdResultEl.style.fontSize = '1.85rem';
} else if (len > 9) {
this.stdResultEl.style.fontSize = '2.15rem';
} else {
this.stdResultEl.style.fontSize = '2.5rem';
}
}
async copyCurrentResult() {
try {
await navigator.clipboard.writeText(this.currentResult);
this.copyFeedback.textContent = 'Kopiert!';
this.copyResultBtn.classList.add('copied');
setTimeout(() => {
this.copyFeedback.textContent = 'Kopieren';
this.copyResultBtn.classList.remove('copied');
}, 1500);
} catch {
this.copyFeedback.textContent = 'Fehler';
}
}
updateProgrammerUI() {
    const reps = this.programmer.getRepresentations();
    this.progExpressionEl.textContent = reps.expression;
    this.progMainValueEl.textContent = reps.main;
    this.valHexEl.textContent = reps.hex;
    this.valDecEl.textContent = reps.dec;
    this.valOctEl.textContent = reps.oct;
    this.valBinEl.textContent = reps.bin;

    this.progMainValueEl.style.fontSize = reps.main.length > 14 ? '1.5rem' : '2.1rem';

    this.radixRows.forEach((row) => {
      row.classList.toggle('active', Number(row.dataset.base) === this.programmer.base);
    });

    this.progDigitBtns.forEach((btn) => {
      const digitVal = parseInt(btn.dataset.progDigit, 16);
      btn.disabled = digitVal >= this.programmer.base;
    });
  }

  handleProgrammerInput(target) {
    if (target.dataset.progDigit) {
      this.programmer.inputDigit(target.dataset.progDigit);
      this.updateProgrammerUI();
      return;
    }

    if (target.dataset.progOp) {
      this.programmer.setOperator(target.dataset.progOp);
      this.updateProgrammerUI();
      return;
    }

    const action = target.dataset.progAction;
    if (!action) return;

    try {
      if (action === 'clear') this.programmer.clear();
      if (action === 'backspace') this.programmer.backspace();
      if (action === 'negate') this.programmer.negate();
      if (action === 'not') this.programmer.bitwiseNot();
      if (action === 'equals') {
        const res = this.programmer.calculate();
        if (res) {
          this.history.add(res.expression, res.result, 'Programmierer');
          this.renderHistory();
        }
      }
      this.updateProgrammerUI();
    } catch (err) {
      this.progMainValueEl.textContent = err.message;
    }
  }

  initConverterUI() {
    this.populateUnitSelects(this.activeConvCategory);
    this.recalculateConverter('A');
  }

  populateUnitSelects(category) {
    const units = this.converter.getUnitsForCategory(category);
    const keys = Object.keys(units);

    this.convUnitA.innerHTML = '';
    this.convUnitB.innerHTML = '';

    keys.forEach((key) => {
      const optA = new Option(units[key].label, key);
      const optB = new Option(units[key].label, key);
      this.convUnitA.add(optA);
      this.convUnitB.add(optB);
    });

    if (keys.length > 1) {
      this.convUnitA.value = keys;
      this.convUnitB.value = keys;
    }

    this.currencyRatePanel.classList.toggle('hidden', category !== 'currency');
    this.updateCurrencyRateInfo();
  }

  recalculateConverter(source = 'A') {
    const unitA = this.convUnitA.value;
    const unitB = this.convUnitB.value;

    if (source === 'A') {
      this.convInputB.value = this.converter.convert(
        this.activeConvCategory,
        this.convInputA.value,
        unitA,
        unitB
      );
    } else {
      this.convInputA.value = this.converter.convert(
        this.activeConvCategory,
        this.convInputB.value,
        unitB,
        unitA
      );
    }
    this.updateCurrencyRateInfo();
  }

  updateCurrencyRateInfo() {
    if (this.activeConvCategory !== 'currency') return;
    const unitA = this.convUnitA.value;
    const unitB = this.convUnitB.value;
    const rate = this.converter.getExchangeRate(unitA, unitB);
    this.rateFormulaText.textContent = '1 ' + unitA + ' = ' + rate.toFixed(4) + ' ' + unitB;
    this.customRateInput.value = rate.toFixed(4);
  }

  renderHistory() {
    const items = this.history.getAll();
    if (items.length === 0) {
      this.historyListEl.innerHTML = '<p class="empty-history">Noch keine Berechnungen vorhanden.</p>';
      return;
    }

    this.historyListEl.innerHTML = items
      .map((item) => {
        return (
          '<div class="history-item" data-result="' + this.escapeHtml(item.result) + '" title="Klicken zum Übernehmen">' +
            '<div class="history-meta">' +
              '<span>' + this.escapeHtml(item.mode) + '</span>' +
              '<span>' + this.escapeHtml(item.timestamp) + '</span>' +
            '</div>' +
            '<div class="history-expr">' + this.escapeHtml(item.expression) + '</div>' +
            '<div class="history-res">= ' + this.escapeHtml(item.result) + '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  bindEvents() {
    this.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
    });

    this.sciToggleBtn.addEventListener('click', () => this.toggleScientificPanel());
    this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    this.historyToggleBtn.addEventListener('click', () => {
      this.historyDrawer.classList.toggle('collapsed');
    });
    this.closeHistoryBtn.addEventListener('click', () => {
      this.historyDrawer.classList.add('collapsed');
    });

    this.copyResultBtn.addEventListener('click', () => this.copyCurrentResult());

    document.querySelectorAll('#mode-standard .calc-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.handleStandardButton(btn));
    });

    this.radixRows.forEach((row) => {
      row.addEventListener('click', () => {
        this.programmer.setBase(row.dataset.base);
        this.updateProgrammerUI();
      });
    });

    document.querySelectorAll('#mode-programmer .calc-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.handleProgrammerInput(btn));
    });

    this.catPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        this.catPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeConvCategory = pill.dataset.cat;
        this.populateUnitSelects(this.activeConvCategory);
        this.recalculateConverter('A');
      });
    });

    this.convInputA.addEventListener('input', () => this.recalculateConverter('A'));
    this.convInputB.addEventListener('input', () => this.recalculateConverter('B'));
    this.convUnitA.addEventListener('change', () => this.recalculateConverter('A'));
    this.convUnitB.addEventListener('change', () => this.recalculateConverter('A'));

    this.swapUnitsBtn.addEventListener('click', () => {
      const tempUnit = this.convUnitA.value;
      this.convUnitA.value = this.convUnitB.value;
      this.convUnitB.value = tempUnit;
      this.recalculateConverter('A');
    });

    this.toggleRateEditBtn.addEventListener('click', () => {
      this.rateEditBox.classList.toggle('hidden');
    });

    this.applyRateBtn.addEventListener('click', () => {
      const newRate = parseFloat(this.customRateInput.value);
      if (newRate > 0) {
        this.converter.setDirectCurrencyRate(this.convUnitA.value, this.convUnitB.value, newRate);
        this.recalculateConverter('A');
        this.rateEditBox.classList.add('hidden');
      }
    });

    this.resetRatesBtn.addEventListener('click', () => {
      this.converter.resetCurrencyRates();
      this.recalculateConverter('A');
    });

    this.historyListEl.addEventListener('click', (e) => {
      const item = e.target.closest('.history-item');
      if (!item) return;
      const resultVal = item.dataset.result;
      this.switchMode('standard');
      this.expression = resultVal;
      this.currentResult = resultVal;
      this.justEvaluated = false;
      this.isError = false;
      this.updateStandardDisplay();
    });

    this.exportHistoryBtn.addEventListener('click', () => this.history.exportAsJSON());
    this.clearHistoryBtn.addEventListener('click', () => {
      this.history.clear();
      this.renderHistory();
    });

    document.querySelectorAll('.func-input').forEach((input) => {
      input.addEventListener('input', () => {
        if (this.plotter) {
          this.plotter.setFunction(Number(input.dataset.fnIndex), input.value);
        }
      });
    });

    document.querySelectorAll('.preset-fn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const firstInput = document.querySelector('.func-input[data-fn-index="0"]');
        if (firstInput && this.plotter) {
          firstInput.value = btn.dataset.preset;
          this.plotter.setFunction(0, btn.dataset.preset);
        }
      });
    });

    const resetGraphBtn = document.getElementById('resetGraphBtn');
    if (resetGraphBtn) {
      resetGraphBtn.addEventListener('click', () => {
        if (this.plotter) this.plotter.resetView();
      });
    }

    window.addEventListener('resize', () => {
      if (this.plotter && this.activeMode === 'graph') {
        this.plotter.resize();
      }
    });

    window.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  handleKeyboard(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    const key = e.key;

    if (this.activeMode === 'standard') {
      let targetBtn = null;

      if (/^[0-9]$/.test(key)) {
        targetBtn = document.querySelector('#mode-standard .calc-btn[data-key="' + key + '"]');
      } else if (key === '.' || key === ',') {
        targetBtn = document.querySelector('#mode-standard .calc-btn[data-action="decimal"]');
      } else if (key === '+') {
        targetBtn = document.querySelector('#mode-standard .calc-btn[data-key="+"]');
      } else if (key === '-') {
        targetBtn = document.querySelector('#mode-standard .calc-btn[data-key="-"]');
      } else if (key === '*') {
        targetBtn = document.querySelector('#mode-standard .calc-btn[data-key="*"]');
      } else if (key === '/') {
        e.preventDefault();
        targetBtn = document.querySelector('#mode-standard .calc-btn[data-key="/"]');
      } else if (key === '%') {
        targetBtn = document.querySelector('#mode-standard .calc-btn[data-key="%"]');
      } else if (key === '^') {
targetBtn = document.querySelector('#mode-standard .calc-btn[data-value="^"]');
} else if (key === '(' || key === ')') {
this.expression += key;
this.livePreviewStandard();
this.updateStandardDisplay();
this.flashButton(document.querySelector('#mode-standard .calc-btn[data-action="paren"]'));
return;
} else if (key === 'Enter' || key === '=') {
e.preventDefault();
targetBtn = document.querySelector('#mode-standard .calc-btn[data-action="equals"]');
} else if (key === 'Backspace') {
targetBtn = document.querySelector('#mode-standard .calc-btn[data-action="backspace"]');
} else if (key === 'Escape' || key === 'Delete') {
targetBtn = document.querySelector('#mode-standard .calc-btn[data-action="clear"]');
}
if (targetBtn) {
this.flashButton(targetBtn);
this.handleStandardButton(targetBtn);
}
} else if (this.activeMode === 'programmer') {
const upper = key.toUpperCase();
if (/^[0-9A-F]$/.test(upper)) {
const btn = document.querySelector('#mode-programmer .calc-btn[data-prog-digit="' + upper + '"]');
if (btn && !btn.disabled) {
this.flashButton(btn);
this.handleProgrammerInput(btn);
}
} else if (key === 'Backspace') {
const btn = document.querySelector('#mode-programmer .calc-btn[data-prog-action="backspace"]');
this.flashButton(btn);
this.handleProgrammerInput(btn);
} else if (key === 'Escape') {
const btn = document.querySelector('#mode-programmer .calc-btn[data-prog-action="clear"]');
this.flashButton(btn);
this.handleProgrammerInput(btn);
} else if (key === 'Enter' || key === '=') {
e.preventDefault();
const btn = document.querySelector('#mode-programmer .calc-btn[data-prog-action="equals"]');
this.flashButton(btn);
this.handleProgrammerInput(btn);
}
}
}
flashButton(btn) {
if (!btn) return;
btn.classList.add('key-active');
setTimeout(() => btn.classList.remove('key-active'), 140);
}
}
document.addEventListener('DOMContentLoaded', () => {
new CalculatorApp();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
});