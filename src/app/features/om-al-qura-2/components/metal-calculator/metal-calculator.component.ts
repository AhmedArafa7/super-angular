import { Component, ChangeDetectionStrategy, input, output, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { MetalCalculatorService, CalculatorResult } from '../../../../core/services/metal-calculator.service';
import { OmAlQura2Service, OmAlQura2Product } from '../../../../core/services/om-al-qura-2.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-metal-calculator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideDynamicIcon],
  templateUrl: './metal-calculator.component.html',
  styleUrls: ['./metal-calculator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetalCalculatorComponent implements OnInit, OnDestroy {
  calcService = inject(MetalCalculatorService);
  omAlQuraService = inject(OmAlQura2Service);
  private fb = inject(FormBuilder);

  /** Inputs & Outputs */
  isOpen = input<boolean>(false);
  isAdmin = input<boolean>(false); // Controls whether price input can be edited
  closeModal = output<void>();
  itemAddedToCart = output<void>();

  /** Reactive Form */
  calcForm!: FormGroup;

  /** Calculation Result Signal for Instant Reactive OnPush View Updates */
  calculationResult = signal<CalculatorResult | null>(null);

  private formSub?: Subscription;

  ngOnInit() {
    this.initForm();
    this.recalculate();
  }

  ngOnDestroy() {
    this.formSub?.unsubscribe();
  }

  private initForm() {
    const defaultMetal = this.calcService.metalsList[0];

    this.calcForm = this.fb.group({
      metalId: [defaultMetal.id, Validators.required],
      shapeId: ['sheet', Validators.required],
      lengthM: [6, [Validators.required, Validators.min(0.01)]],
      widthCm: [125, [Validators.min(0.01)]],
      thicknessMm: [2.0, [Validators.min(0.01)]],
      outerDiameterMm: [50, [Validators.min(0.01)]],
      leg1Cm: [5, [Validators.min(0.01)]],
      leg2Cm: [5, [Validators.min(0.01)]],
      pricePerKg: [defaultMetal.defaultPrice, [Validators.required, Validators.min(0.01)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      customerQuoteName: ['']
    });

    this.updateShapeValidators('sheet');

    // Re-calculate on any form value change reactively
    this.formSub = this.calcForm.valueChanges.subscribe(() => {
      this.recalculate();
    });
  }

  onMetalChange() {
    const metalId = this.calcForm.get('metalId')?.value;
    const metal = this.calcService.getMetalById(metalId);
    if (metal) {
      this.calcForm.patchValue({ pricePerKg: metal.defaultPrice }, { emitEvent: true });
    }
  }

  onShapeChange() {
    const shapeId = this.calcForm.get('shapeId')?.value;
    this.updateShapeValidators(shapeId);
    this.recalculate();
  }

  /**
   * Adjusts reactive validators based on selected metal shape
   */
  private updateShapeValidators(shapeId: string) {
    const widthControl = this.calcForm.get('widthCm');
    const thickControl = this.calcForm.get('thicknessMm');
    const diaControl = this.calcForm.get('outerDiameterMm');
    const leg1Control = this.calcForm.get('leg1Cm');
    const leg2Control = this.calcForm.get('leg2Cm');

    // Reset validators
    [widthControl, thickControl, diaControl, leg1Control, leg2Control].forEach(ctrl => {
      ctrl?.clearValidators();
    });

    if (shapeId === 'sheet') {
      widthControl?.setValidators([Validators.required, Validators.min(0.01)]);
      thickControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else if (shapeId === 'bar') {
      diaControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else if (shapeId === 'tube') {
      diaControl?.setValidators([Validators.required, Validators.min(0.01)]);
      thickControl?.setValidators([Validators.required, Validators.min(0.01)]);
    } else if (shapeId === 'angle') {
      leg1Control?.setValidators([Validators.required, Validators.min(0.01)]);
      leg2Control?.setValidators([Validators.required, Validators.min(0.01)]);
      thickControl?.setValidators([Validators.required, Validators.min(0.01)]);
    }

    [widthControl, thickControl, diaControl, leg1Control, leg2Control].forEach(ctrl => {
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  /**
   * Recalculates weight & price using MetalCalculatorService
   */
  recalculate() {
    if (!this.calcForm || this.calcForm.invalid) {
      this.calculationResult.set(null);
      return;
    }

    const val = this.calcForm.getRawValue();
    const result = this.calcService.calculate({
      metalId: val.metalId,
      shapeId: val.shapeId,
      lengthM: val.lengthM || 0,
      widthCm: val.widthCm || 0,
      thicknessMm: val.thicknessMm || 0,
      outerDiameterMm: val.outerDiameterMm || 0,
      leg1Cm: val.leg1Cm || 0,
      leg2Cm: val.leg2Cm || 0,
      pricePerKg: val.pricePerKg || 0,
      quantity: val.quantity || 1,
      customerQuoteName: val.customerQuoteName
    });

    this.calculationResult.set(result);
  }

  /** Form Control Validation Helper */
  isInvalid(controlName: string): boolean {
    const ctrl = this.calcForm.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  /** Add Custom Weight Item to Cart */
  addCalculatedItemToCart() {
    if (this.calcForm.invalid) {
      this.calcForm.markAllAsTouched();
      return;
    }

    const res = this.calculationResult();
    if (!res) return;

    const val = this.calcForm.getRawValue();
    const name = `${res.metal.name} - ${res.shape.name} (وزن ${res.totalWeightKg} كجم)`;

    const customProd: OmAlQura2Product = {
      id: 'custom-' + Date.now(),
      name: name,
      category: 'قطاعات ومقاسات مخصصة',
      price: res.totalPriceEgp,
      stockQuantity: 99,
      discountPercent: 0,
      isBoycott: false,
      boycottAlternatives: [],
      locationInStore: 'الممر 1 (علوي)',
      isInWarehouse: false,
      imageUrl: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=400',
      description: `خام معدني مخصص بالوزن والأبعاد: نوع ${res.metal.name}، شكل ${res.shape.name}، الطول ${val.lengthM}م، الكمية: ${val.quantity} قطعة، الوزن الإجمالي: ${res.totalWeightKg} كجم.`,
      salesCount: 1
    };

    this.omAlQuraService.addToCart(customProd);
    this.itemAddedToCart.emit();
    this.closeModal.emit();
  }

  /** Export Official Quote PDF */
  exportCalculatorPdf() {
    if (this.calcForm.invalid) {
      this.calcForm.markAllAsTouched();
      return;
    }

    const res = this.calculationResult();
    if (!res) return;
    const val = this.calcForm.getRawValue();

    this.omAlQuraService.generateOfficialQuotePdf({
      customerName: val.customerQuoteName,
      metalName: res.metal.name,
      density: res.metal.density,
      shapeName: res.shape.name,
      lengthM: val.lengthM,
      widthCm: val.shapeId === 'sheet' ? val.widthCm : undefined,
      thicknessMm: ['sheet', 'tube', 'angle'].includes(val.shapeId) ? val.thicknessMm : undefined,
      outerDiameterMm: ['bar', 'tube'].includes(val.shapeId) ? val.outerDiameterMm : undefined,
      leg1Cm: val.shapeId === 'angle' ? val.leg1Cm : undefined,
      leg2Cm: val.shapeId === 'angle' ? val.leg2Cm : undefined,
      quantity: val.quantity,
      pricePerKg: val.pricePerKg,
      totalWeightKg: res.totalWeightKg,
      totalWeightTons: res.totalWeightTons,
      totalPriceEgp: res.totalPriceEgp
    });
  }

  /** Send WhatsApp Discount Quote Link */
  sendCalculatorToWhatsApp() {
    if (this.calcForm.invalid) {
      this.calcForm.markAllAsTouched();
      return;
    }

    const res = this.calculationResult();
    if (!res) return;
    const val = this.calcForm.getRawValue();

    let widthOrDia = '';
    if (val.shapeId === 'sheet') widthOrDia = `عرض ${val.widthCm}سم`;
    else if (val.shapeId === 'bar' || val.shapeId === 'tube') widthOrDia = `قطر ${val.outerDiameterMm}مم`;
    else if (val.shapeId === 'angle') widthOrDia = `جناحين ${val.leg1Cm}×${val.leg2Cm}سم`;

    const url = this.omAlQuraService.getWhatsAppQuoteLink('01000000000', {
      metalName: res.metal.name,
      shapeName: res.shape.name,
      lengthM: val.lengthM,
      widthOrDia: widthOrDia,
      thicknessMm: val.thicknessMm || 0,
      quantity: val.quantity,
      weightKg: res.totalWeightKg,
      priceEgp: res.totalPriceEgp,
      customerName: val.customerQuoteName
    });

    window.open(url, '_blank');
  }

  onClose() {
    this.closeModal.emit();
  }
}
