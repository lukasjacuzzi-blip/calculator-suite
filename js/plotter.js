/**
 * Interaktiver HTML5-Canvas Funktionsplotter
 * Nutzt den sicheren Ausdrucks-Parser ohne eval().
 */
import { evaluateExpression } from './parser.js';

export class FunctionPlotter {
  constructor(canvas, statusEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.statusEl = statusEl;

    // Sichtbereich (Standard: -10 bis +10)
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 32; // Pixel pro Einheit

    this.functions = [
      { expr: 'sin(x) * 3', color: '#06b6d4', active: true },
      { expr: '0.25 * x^2 - 2', color: '#6366f1', active: true },
      { expr: '', color: '#f43f5e', active: true }
    ];

    this.mousePos = null;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    this.bindCanvasEvents();
    this.resize();
  }

  resize() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  resetView() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 32;
    this.render();
  }

  setFunction(index, expr) {
    if (!this.functions[index]) return;
    this.functions[index].expr = expr.trim();
    this.render();
  }

  evalAtX(expr, xVal) {
    if (!expr) return null;
    try {
      // Ersetze alle alleinstehenden 'x' sicher durch den Zahlenwert in Klammern
      const substituted = expr.replace(/\bx\b/gi, `(${xVal})`);
      const y = evaluateExpression(substituted, 'RAD');
      return Number.isFinite(y) ? y : null;
    } catch {
      return null;
    }
  }

  screenToMath(sx, sy) {
    const cx = this.width / 2 + this.offsetX;
    const cy = this.height / 2 + this.offsetY;
    return {
      x: (sx - cx) / this.scale,
      y: (cy - sy) / this.scale
    };
  }

  mathToScreen(mx, my) {
    const cx = this.width / 2 + this.offsetX;
    const cy = this.height / 2 + this.offsetY;
    return {
      x: cx + mx * this.scale,
      y: cy - my * this.scale
    };
  }

  bindCanvasEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStart = { x: e.clientX - this.offsetX, y: e.clientY - this.offsetY };
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        this.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      } else {
        this.mousePos = null;
      }

      if (this.isDragging) {
        this.offsetX = e.clientX - this.dragStart.x;
        this.offsetY = e.clientY - this.dragStart.y;
      }
      if (this.canvas.offsetParent !== null) {
        this.render();
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;
        const nextScale = Math.min(Math.max(this.scale * zoomFactor, 6), 300);
        this.scale = nextScale;
        this.render();
      },
      { passive: false }
    );
  }

  render() {
    if (!this.width || !this.height) return;
    const ctx = this.ctx;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    ctx.clearRect(0, 0, this.width, this.height);

    const cx = this.width / 2 + this.offsetX;
    const cy = this.height / 2 + this.offsetY;

    // 1. Gitterlinien
    const step = this.scale < 18 ? 5 : this.scale > 90 ? 0.5 : 1;
    const pxStep = step * this.scale;

    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    const startX = cx % pxStep;
    for (let x = startX; x < this.width; x += pxStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    const startY = cy % pxStep;
    for (let y = startY; y < this.height; y += pxStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 2. Hauptachsen (X und Y)
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.35)' : 'rgba(255, 255, 255, 0.32)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(this.width, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, this.height);
    ctx.stroke();

    // Achsenbeschriftung
    ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
    ctx.font = '11px -apple-system, sans-serif';
    for (let x = startX; x < this.width; x += pxStep) {
      const val = Math.round(((x - cx) / this.scale) * 100) / 100;
      if (val !== 0) {
        ctx.fillText(String(val), x + 3, Math.min(Math.max(cy + 13, 14), this.height - 6));
      }
    }
    for (let y = startY; y < this.height; y += pxStep) {
      const val = Math.round(((cy - y) / this.scale) * 100) / 100;
      if (val !== 0) {
        ctx.fillText(String(val), Math.min(Math.max(cx + 5, 6), this.width - 28), y - 3);
      }
    }

    // 3. Funktionskurven zeichnen
    this.functions.forEach((fn) => {
      if (!fn.expr) return;
      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      let drawing = false;
      let prevSy = null;

      for (let sx = 0; sx <= this.width; sx += 1.5) {
        const mathX = (sx - cx) / this.scale;
        const mathY = this.evalAtX(fn.expr, mathX);

        if (mathY === null || Math.abs(mathY) > 1e5) {
          drawing = false;
          prevSy = null;
          continue;
        }

        const sy = cy - mathY * this.scale;

        // Polstellen (z. B. bei tan(x)) sauber unterbrechen
        if (prevSy !== null && Math.abs(sy - prevSy) > this.height * 0.8) {
          drawing = false;
        }

        if (!drawing) {
          ctx.moveTo(sx, sy);
          drawing = true;
        } else {
          ctx.lineTo(sx, sy);
        }
        prevSy = sy;
      }
      ctx.stroke();
    });

    // 4. Fadenkreuz & Koordinatenanzeige
    if (this.mousePos) {
      const m = this.screenToMath(this.mousePos.x, this.mousePos.y);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(this.mousePos.x, 0);
      ctx.lineTo(this.mousePos.x, this.height);
      ctx.moveTo(0, this.mousePos.y);
      ctx.lineTo(this.width, this.mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (this.statusEl) {
        const f1Val = this.evalAtX(this.functions.expr, m.x);
        const f1Text = f1Val !== null ? `  |  f₁(x) = ${f1Val.toFixed(3)}` : '';
        this.statusEl.textContent = `x: ${m.x.toFixed(2)}, y: ${m.y.toFixed(2)}${f1Text}`;
      }
    }
  }
}
