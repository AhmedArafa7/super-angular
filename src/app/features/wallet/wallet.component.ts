import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { WalletService, CURRENCIES, CurrencyCode, Transaction, PendingTransaction } from '../../core/wallet.service';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class WalletComponent {
  walletService = inject(WalletService);

  // States
  showsave = signal<boolean>(false);
  filterCurrency = signal<string>('all');
  isRefreshing = signal<boolean>(false);

  // Convert Modal State
  isConvertOpen = signal<boolean>(false);
  convertFrom = signal<CurrencyCode>('DLC');
  convertTo = signal<CurrencyCode>('EGC');
  convertAmount = signal<string>('');
  isConverting = signal<boolean>(false);

  // Deposit Modal State
  isDepositOpen = signal<boolean>(false);
  depositCurrency = signal<CurrencyCode>('EGC');
  depositAmount = signal<number>(500);

  // Toast State
  showToast = signal<boolean>(false);
  toastTitle = signal<string>('');
  toastDesc = signal<string>('');

  // Primary 5 currencies (Matching screenshot exactly)
  primaryCurrencies = [
    { code: 'BKC' as CurrencyCode, nameAr: 'عملة تيك', color: 'text-amber-400', iconType: 'back', badge: 'BACK' },
    { code: 'GMC' as CurrencyCode, nameAr: 'عملة الألعاب', color: 'text-indigo-400', iconType: 'gamepad', badge: '' },
    { code: 'MDC' as CurrencyCode, nameAr: 'عملة الميديا', color: 'text-blue-400', iconType: 'clapperboard', badge: '' },
    { code: 'DLC' as CurrencyCode, nameAr: 'عملة الدولار', color: 'text-emerald-400', iconType: 'dollar', badge: '' },
    { code: 'EGC' as CurrencyCode, nameAr: 'العملة المصرية', color: 'text-emerald-400', iconType: 'eg', badge: 'EG' }
  ];

  // Internal currencies if toggled
  internalCurrencies = [
    { code: 'BKC_save' as CurrencyCode, nameAr: 'تيك (داخلي)', color: 'text-amber-400/70', iconType: 'back', badge: 'V-TIK' },
    { code: 'GMC_save' as CurrencyCode, nameAr: 'ألعاب (داخلي)', color: 'text-indigo-400/70', iconType: 'gamepad', badge: 'V-GAME' },
    { code: 'MDC_save' as CurrencyCode, nameAr: 'ميديا (داخلي)', color: 'text-blue-400/70', iconType: 'clapperboard', badge: 'V-MEDIA' },
    { code: 'DLC_save' as CurrencyCode, nameAr: 'دولار (داخلي)', color: 'text-emerald-400/70', iconType: 'dollar', badge: 'V-USD' },
    { code: 'EGC_save' as CurrencyCode, nameAr: 'مصرية (داخلي)', color: 'text-emerald-400/70', iconType: 'eg', badge: 'V-EGP' }
  ];

  // Filtered Transactions
  filteredTransactions = computed(() => {
    const list = this.walletService.transactions();
    const filter = this.filterCurrency();
    if (filter === 'all') return list;
    return list.filter(tx => tx.currency === filter || tx.toCurrency === filter);
  });

  // Convert Options
  availableCurrencies = CURRENCIES;

  // Refresh Trigger
  handleRefresh(): void {
    this.isRefreshing.set(true);
    setTimeout(() => {
      this.isRefreshing.set(false);
      this.triggerToast('تمت المزامنة', 'تم تحديث أرصدة المحفظة العصبية بنجاح.');
    }, 600);
  }

  // Convert Action
  async handleConvert(): Promise<void> {
    const amt = Number(this.convertAmount());
    if (!amt || amt <= 0) return;

    this.isConverting.set(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const success = this.walletService.convertCurrency(this.convertFrom(), this.convertTo(), amt);
    if (success) {
      const fromDef = CURRENCIES.find(c => c.code === this.convertFrom());
      const toDef = CURRENCIES.find(c => c.code === this.convertTo());
      this.triggerToast('تم التحويل بنجاح ✅', `تم تحويل ${amt} من ${fromDef?.nameAr || this.convertFrom()} إلى ${toDef?.nameAr || this.convertTo()}.`);
      this.isConvertOpen.set(false);
      this.convertAmount.set('');
    } else {
      this.triggerToast('فشل التحويل', 'رصيد العملة المصدر غير كافٍ لإتمام عملية التحويل.');
    }

    this.isConverting.set(false);
  }

  // Deposit Action
  handleDeposit(): void {
    const amt = Number(this.depositAmount());
    if (!amt || amt <= 0) return;

    this.walletService.depositFunds(amt, this.depositCurrency(), `شحن رصيد تجريبي مباشر`);
    const currDef = CURRENCIES.find(c => c.code === this.depositCurrency());
    this.triggerToast('تم الشحن بنجاح 🚀', `تمت إضافة +${amt} إلى رصيد ${currDef?.nameAr || this.depositCurrency()}.`);
    this.isDepositOpen.set(false);
  }

  getCurrencyName(code: CurrencyCode): string {
    const def = CURRENCIES.find(c => c.code === code);
    return def ? def.nameAr : code;
  }

  triggerToast(title: string, desc: string): void {
    this.toastTitle.set(title);
    this.toastDesc.set(desc);
    this.showToast.set(true);
    setTimeout(() => {
      this.showToast.set(false);
    }, 3500);
  }
}
