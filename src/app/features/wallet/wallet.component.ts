import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { WalletService, CURRENCIES, CurrencyCode, Transaction, PendingTransaction } from '../../core/wallet.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class WalletComponent {
  walletService = inject(WalletService);

  // Filter settings
  showsave = false;
  filterCurrency = 'all';

  // Currency Converter state
  isConvertOpen = false;
  convertFrom: CurrencyCode = 'EGC_save';
  convertTo: CurrencyCode = 'EGC';
  convertAmount = '';
  isConverting = false;

  // Custom alert/toast notifications
  showToast = false;
  toastTitle = '';
  toastDesc = '';

  // Get active currencies list dynamically based on toggle
  get displayCurrencies() {
    return CURRENCIES.filter(c => this.showsave ? true : !c.issave);
  }

  // Get filtered transaction logs
  get filteredTransactions(): Transaction[] {
    const list = this.walletService.transactions();
    if (this.filterCurrency === 'all') return list;
    return list.filter(tx => tx.currency === this.filterCurrency || tx.toCurrency === this.filterCurrency);
  }

  // Get dynamic conversion target currencies list
  get convertToOptions() {
    return CURRENCIES.filter(c => c.code !== this.convertFrom);
  }

  get isConvertDisabled(): boolean {
    const amt = Number(this.convertAmount);
    return this.isConverting || !this.convertAmount || amt <= 0;
  }

  // Get display details for currency definitions
  getCurrencyName(code: CurrencyCode): string {
    const def = CURRENCIES.find(c => c.code === code);
    return def ? def.nameAr : code;
  }

  getCurrencyIcon(code: CurrencyCode): string {
    const def = CURRENCIES.find(c => c.code === code);
    return def ? def.icon : '🪙';
  }

  getCurrencyColor(code: CurrencyCode): string {
    const def = CURRENCIES.find(c => c.code === code);
    return def ? def.color : 'indigo';
  }

  // Convert handler
  async handleConvert(): Promise<void> {
    const amt = Number(this.convertAmount);
    if (!this.convertAmount || amt <= 0) return;

    this.isConverting = true;

    // Simulate standard crypto ledger delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For internal save coins: simulate check rule
    const fromDef = CURRENCIES.find(c => c.code === this.convertFrom);
    if (fromDef?.issave) {
      // Seed unfreeze constraint alert block
      const rand = Math.random();
      if (rand > 0.6) {
        this.triggerToast("التحويل مجمّد", "تنبيه: يجب تصفية شروط الأدمن المحددة والتحقق من الهوية أولاً.");
        this.isConverting = false;
        return;
      }
    }

    const success = this.walletService.convertCurrency(this.convertFrom, this.convertTo, amt);
    if (success) {
      const fromName = this.getCurrencyName(this.convertFrom);
      const toName = this.getCurrencyName(this.convertTo);
      this.triggerToast("تم التحويل بنجاح", `تم تحويل ${amt} من ${fromName} إلى ${toName}.`);
      this.isConvertOpen = false;
      this.convertAmount = '';
    } else {
      this.triggerToast("فشل التحويل", "رصيد المصدر غير كافٍ لإتمام العملية.");
    }

    this.isConverting = false;
  }

  // Pending acquisitions actions
  handleRetry(id: string): void {
    const success = this.walletService.retryTransaction(id);
    if (success) {
      this.triggerToast("اكتملت المزامنة", "تم استيفاء الرصيد ونقل المعاملة للشبكة الرئيسية.");
    } else {
      this.triggerToast("فشل التحويل", "بروتوكول التحقق: رصيدك الحالي لا يزال غير كافٍ.");
    }
  }

  handlePayLater(tx: PendingTransaction): void {
    this.walletService.removePendingTransaction(tx.id);
    this.triggerToast("Negotiation Pivot", `تم نقل استحواذ "${tx.title}" لبروتوكول التفاوض.`);
  }

  handleRemove(id: string): void {
    this.walletService.removePendingTransaction(id);
    this.triggerToast("حذف المعاملة", "تم إلغاء طلب المعاملة المعلق.");
  }

  private triggerToast(title: string, desc: string): void {
    this.toastTitle = title;
    this.toastDesc = desc;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }
}
