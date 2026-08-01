import { Injectable, inject } from '@angular/core';

export interface MetalType {
  id: string;
  name: string;
  density: number; // in g/cm3
  defaultPrice: number; // in EGP per kg
}

export interface MetalShape {
  id: 'sheet' | 'bar' | 'tube' | 'angle';
  name: string;
}

export interface CalculatorInput {
  metalId: string;
  shapeId: 'sheet' | 'bar' | 'tube' | 'angle';
  lengthM: number;
  widthCm?: number;
  thicknessMm?: number;
  outerDiameterMm?: number;
  leg1Cm?: number;
  leg2Cm?: number;
  pricePerKg: number;
  quantity: number;
  customerQuoteName?: string;
}

export interface CalculatorResult {
  metal: MetalType;
  shape: MetalShape;
  singleVolumeCm3: number;
  totalWeightKg: number;
  totalWeightTons: number;
  totalPriceEgp: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class MetalCalculatorService {
  readonly metalsList: MetalType[] = [
    { id: 'steel', name: 'حديد صلب (Steel ST-37/52)', density: 7.85, defaultPrice: 62 },
    { id: 'stainless304', name: 'استنلس ستيل 304 (Stainless Steel)', density: 7.93, defaultPrice: 195 },
    { id: 'aluminum6063', name: 'ألومنيوم 6063 فبركة (Aluminum)', density: 2.70, defaultPrice: 180 },
    { id: 'copper_yellow', name: 'نحاس أصفر (Brass)', density: 8.50, defaultPrice: 380 },
    { id: 'copper_red', name: 'نحاس أحمر نقي (Red Copper)', density: 8.96, defaultPrice: 490 },
    { id: 'lead', name: 'رصاص نقي (Lead)', density: 11.34, defaultPrice: 150 }
  ];

  readonly shapesList: MetalShape[] = [
    { id: 'sheet', name: 'صاج وألواح (Sheet / Plate)' },
    { id: 'bar', name: 'عمود عود مدور (Solid Round Bar)' },
    { id: 'tube', name: 'مواسير مدورة (Round Tube)' },
    { id: 'angle', name: 'زوايا حديد (L-Shape Angle)' }
  ];

  getMetalById(id: string): MetalType {
    return this.metalsList.find(m => m.id === id) || this.metalsList[0];
  }

  getShapeById(id: string): MetalShape {
    return this.shapesList.find(s => s.id === id) || this.shapesList[0];
  }

  /**
   * Calculates volume in cm³ for a single unit based on shape dimensions
   */
  calculateSingleVolumeCm3(input: Partial<CalculatorInput>): number {
    const lenCm = Math.max(0, input.lengthM || 0) * 100;
    const thickCm = Math.max(0, input.thicknessMm || 0) / 10;
    const widthCm = Math.max(0, input.widthCm || 0);

    switch (input.shapeId) {
      case 'sheet':
        return lenCm * widthCm * thickCm;

      case 'bar': {
        const radiusCm = Math.max(0, input.outerDiameterMm || 0) / 20;
        return Math.PI * radiusCm * radiusCm * lenCm;
      }

      case 'tube': {
        const outerRadiusCm = Math.max(0, input.outerDiameterMm || 0) / 20;
        const innerRadiusCm = Math.max(0, outerRadiusCm - thickCm);
        const crossAreaCm2 = Math.PI * (outerRadiusCm * outerRadiusCm - innerRadiusCm * innerRadiusCm);
        return crossAreaCm2 * lenCm;
      }

      case 'angle': {
        const leg1 = Math.max(0, input.leg1Cm || 0);
        const leg2 = Math.max(0, input.leg2Cm || 0);
        const crossAreaCm2 = Math.max(0, (leg1 + leg2 - thickCm) * thickCm);
        return crossAreaCm2 * lenCm;
      }

      default:
        return 0;
    }
  }

  /**
   * Complete calculation returning total weight, tons, and price
   */
  calculate(input: CalculatorInput): CalculatorResult {
    const metal = this.getMetalById(input.metalId);
    const shape = this.getShapeById(input.shapeId);

    const singleVolumeCm3 = this.calculateSingleVolumeCm3(input);
    const qty = Math.max(1, input.quantity || 1);
    const totalGrams = singleVolumeCm3 * metal.density * qty;

    const totalWeightKg = Number((totalGrams / 1000).toFixed(2));
    const totalWeightTons = Number((totalWeightKg / 1000).toFixed(3));
    const totalPriceEgp = Math.round(totalWeightKg * (input.pricePerKg || 0));

    return {
      metal,
      shape,
      singleVolumeCm3,
      totalWeightKg,
      totalWeightTons,
      totalPriceEgp,
      quantity: qty
    };
  }
}
