/**
 * Rechenverlauf-Management mit localStorage-Persistenz (max. 25 Einträge)
 * und JSON-Export-Funktion.
 */

const STORAGE_HISTORY_KEY = 'calc_suite_history_v1';
const MAX_ENTRIES = 25;

export class HistoryManager {
  constructor() {
    this.entries = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(this.entries));
    } catch {
      // Speicher voll oder blockiert
    }
  }

  add(expression, result, mode = 'Standard') {
    if (!expression || result === undefined || result === null) return;

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      expression: String(expression),
      result: String(result),
      mode,
      timestamp: new Date().toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };

    this.entries.unshift(entry);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }

    this.save();
    return this.entries;
  }

  clear() {
    this.entries = [];
    localStorage.removeItem(STORAGE_HISTORY_KEY);
    return this.entries;
  }

  getAll() {
    return this.entries;
  }

  exportAsJSON() {
    const dataStr = JSON.stringify(this.entries, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
