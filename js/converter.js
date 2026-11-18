/**
 * Einheiten- & Währungsrechner-Modul
 * Unterstützt Zwei-Wege-Echtzeitumrechnung und benutzerdefinierte Wechselkurse.
 */

const DEFAULT_CURRENCY_RATES = {
  EUR: 1.0,
  USD: 1.085,
  GBP: 0.855,
  CHF: 0.945,
  JPY: 163.5
};

const STORAGE_RATES_KEY = 'calc_suite_custom_rates';

export class UnitConverter {
  constructor() {
    this.currencyRates = this.loadCustomRates();
    this.categories = {
      currency: {
        name: 'Währung',
        units: {
          EUR: { label: 'EUR (€)' },
          USD: { label: 'USD ($)' },
          GBP: { label: 'GBP (£)' },
          CHF: { label: 'CHF (Fr.)' },
          JPY: { label: 'JPY (¥)' }
        }
      },
      length: {
        name: 'Länge',
        // Basis: Meter (m)
        units: {
          mm: { label: 'Millimeter (mm)', factor: 0.001 },
          cm: { label: 'Zentimeter (cm)', factor: 0.01 },
          m: { label: 'Meter (m)', factor: 1 },
          km: { label: 'Kilometer (km)', factor: 1000 },
          in: { label: 'Zoll (inch)', factor: 0.0254 },
          ft: { label: 'Fuß (ft)', factor: 0.3048 },
          mi: { label: 'Meile (mi)', factor: 1609.344 }
        }
      },
      weight: {
        name: 'Gewicht',
        // Basis: Kilogramm (kg)
        units: {
          g: { label: 'Gramm (g)', factor: 0.001 },
          kg: { label: 'Kilogramm (kg)', factor: 1 },
          t: { label: 'Tonne (t)', factor: 1000 },
          lb: { label: 'Pfund (lb)', factor: 0.45359237 },
          oz: { label: 'Unze (oz)', factor: 0.0283495231 }
        }
      },
      temperature: {
        name: 'Temperatur',
        units: {
          C: { label: 'Celsius (°C)' },
          F: { label: 'Fahrenheit (°F)' },
          K: { label: 'Kelvin (K)' }
        }
      },
      data: {
        name: 'Datenspeicher',
        // Basis: Byte (B) im binären Standard (1024)
        units: {
          B: { label: 'Byte (B)', factor: 1 },
          KB: { label: 'Kilobyte (KB)', factor: 1024 },
          MB: { label: 'Megabyte (MB)', factor: 1024 ** 2 },
          GB: { label: 'Gigabyte (GB)', factor: 1024 ** 3 },
          TB: { label: 'Terabyte (TB)', factor: 1024 ** 4 }
        }
      }
    };
  }

  loadCustomRates() {
    try {
      const saved = localStorage.getItem(STORAGE_RATES_KEY);
      if (saved) {
        return { ...DEFAULT_CURRENCY_RATES, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback bei Storage-Fehler
    }
    return { ...DEFAULT_CURRENCY_RATES };
  }

  saveCustomRates() {
    try {
      localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(this.currencyRates));
    } catch {
      // Ignorieren
    }
  }

  setDirectCurrencyRate(fromUnit, toUnit, rate) {
    if (fromUnit === toUnit || rate <= 0 || Number.isNaN(rate)) return;
    // Berechne neuen Kurs relativ zur Basiswährung EUR
    const fromBaseRate = this.currencyRates[fromUnit];
    this.currencyRates[toUnit] = fromBaseRate * rate;
    this.saveCustomRates();
  }

  resetCurrencyRates() {
    this.currencyRates = { ...DEFAULT_CURRENCY_RATES };
    localStorage.removeItem(STORAGE_RATES_KEY);
  }

  getUnitsForCategory(category) {
    return this.categories[category]?.units || {};
  }

  convert(category, value, fromUnit, toUnit) {
    if (value === '' || value === null || Number.isNaN(Number(value))) {
      return '';
    }
    const num = Number(value);

    if (fromUnit === toUnit) {
      return this.formatNumber(num);
    }

    if (category === 'temperature') {
      return this.formatNumber(this.convertTemperature(num, fromUnit, toUnit));
    }

    if (category === 'currency') {
      const rateFrom = this.currencyRates[fromUnit];
      const rateTo = this.currencyRates[toUnit];
      const inEur = num / rateFrom;
      const converted = inEur * rateTo;
      return this.formatNumber(converted, 4);
    }

    const units = this.categories[category].units;
    const baseVal = num * units[fromUnit].factor;
    const result = baseVal / units[toUnit].factor;
    return this.formatNumber(result);
  }

  convertTemperature(val, from, to) {
    let celsius;
    if (from === 'C') celsius = val;
    else if (from === 'F') celsius = (val - 32) * (5 / 9);
    else if (from === 'K') celsius = val - 273.15;

    if (to === 'C') return celsius;
    if (to === 'F') return celsius * (9 / 5) + 32;
    if (to === 'K') return celsius + 273.15;
    return val;
  }

  getExchangeRate(fromUnit, toUnit) {
    if (fromUnit === toUnit) return 1;
    const rateFrom = this.currencyRates[fromUnit];
    const rateTo = this.currencyRates[toUnit];
    return rateTo / rateFrom;
  }

  formatNumber(num, maxDecimals = 8) {
    if (!Number.isFinite(num)) return '';
    const rounded = Number(num.toFixed(maxDecimals));
    return String(rounded);
  }
}
