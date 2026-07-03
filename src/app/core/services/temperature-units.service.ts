import { Injectable } from '@angular/core';
import unitsData from 'assets/data/temperature-units.json';

export interface TemperatureUnit {
  unit: string;
  symbol: string;
}

@Injectable({
  providedIn: 'root',
})
export class TemperatureUnitsService {
  private readonly map = new Map<string, TemperatureUnit>();

  constructor() {
    for (const c of unitsData.countries) {
      this.map.set(c.code, { unit: c.unit, symbol: c.symbol });
    }
  }

  getUnit(countryCode: string): TemperatureUnit {
    return this.map.get(countryCode) ?? { unit: 'celsius', symbol: '°C' };
  }
}
