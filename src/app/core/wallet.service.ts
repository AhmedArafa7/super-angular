import { Injectable, signal, computed } from '@angular/core';

export type RealCurrencyCode = 'EGC' | 'DLC' | 'MDC' | 'GMC' | 'BKC';
export type SaveCurrencyCode = 'EGC_save' | 'DLC_save' | 'MDC_save' | 'GMC_save' | 'BKC_save';
export type CurrencyCode = RealCurrencyCode | SaveCurrencyCode;

export interface CurrencyDefinition {
  code: CurrencyCode;
  name: string;
  nameAr: string;
  issave: boolean;
  realCounterpart?: RealCurrencyCode;
  color: string;
  icon: string;
}

export const CURRENCIES: CurrencyDefinition[] = [
  { code: 'EGC', name: 'Egyptian Coin', nameAr: 'العملة المصرية', issave: false, color: 'emerald', icon: '🇪🇬' },
  { code: 'DLC', name: 'Dollar Coin', nameAr: 'عملة الدولار', issave: false, color: 'green', icon: '💵' },
  { code: 'MDC', name: 'Media Coin', nameAr: 'عملة الميديا', issave: false, color: 'blue', icon: '🎬' },
  { code: 'GMC', name: 'Game Coin', nameAr: 'عملة الألعاب', issave: false, color: 'purple', icon: '🎮' },
  { code: 'BKC', name: 'Back Coin', nameAr: 'عملة الباك', issave: false, color: 'amber', icon: '🔙' },
  { code: 'EGC_save', name: 'Egyptian Coin (Internal)', nameAr: 'المصرية (داخلي)', issave: true, realCounterpart: 'EGC', color: 'emerald', icon: '🇪🇬' },
  { code: 'DLC_save', name: 'Dollar Coin (Internal)', nameAr: 'الدولار (داخلي)', issave: true, realCounterpart: 'DLC', color: 'green', icon: '💵' },
  { code: 'MDC_save', name: 'Media Coin (Internal)', nameAr: 'الميديا (داخلي)', issave: true, realCounterpart: 'MDC', color: 'blue', icon: '🎬' },
  { code: 'GMC_save', name: 'Game Coin (Internal)', nameAr: 'الألعاب (داخلي)', issave: true, realCounterpart: 'GMC', color: 'purple', icon: '🎮' },
  { code: 'BKC_save', name: 'Back Coin (Internal)', nameAr: 'الباك (داخلي)', issave: true, realCounterpart: 'BKC', color: 'amber', icon: '🔙' },
];

export type TransactionType = 'deposit' | 'withdrawal' | 'purchase_hold' | 'purchase_release' | 'purchase_refund' | 'conversion';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  currency: CurrencyCode;
  toCurrency?: CurrencyCode;
  toAmount?: number;
  status: 'completed' | 'failed' | 'pending';
  description: string;
  timestamp: string;
}

export interface PendingTransaction {
  id: string;
  title: string;
  price: number;
  currency: CurrencyCode;
  status: 'pending_sync' | 'failed_needs_action';
  timestamp: string;
}

export interface UserUnfreezeRule {
  id: string;
  currencyCode: SaveCurrencyCode;
  conditionLabel: string;
  status: 'pending' | 'fulfilled' | 'waived';
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private readonly STORAGE_KEY = 'Si-Neuro-wallet-registry';

  // Real-time reactive signals for wallet state
  balances = signal<Record<CurrencyCode, number>>(this.createEmptyBalances());
  frozenBalances = signal<Record<CurrencyCode, number>>(this.createEmptyBalances());
  transactions = signal<Transaction[]>([]);
  pendingTransactions = signal<PendingTransaction[]>([]);

  // Computed totals
  totalRealBalance = computed(() => {
    let sum = 0;
    const current = this.balances();
    CURRENCIES.forEach(c => {
      if (!c.issave) {
        // Simple 1:1 equivalency display summation in credits
        sum += current[c.code] || 0;
      }
    });
    return sum;
  });

  totalsaveBalance = computed(() => {
    let sum = 0;
    const current = this.balances();
    CURRENCIES.forEach(c => {
      if (c.issave) {
        sum += current[c.code] || 0;
      }
    });
    return sum;
  });

  totalPendingDebt = computed(() => {
    let sum = 0;
    this.pendingTransactions().forEach(t => {
      sum += t.price;
    });
    return sum;
  });

  constructor() {
    this.loadState();
  }

  // Load from local storage with mock seed data if empty
  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.balances.set(parsed.balances || this.createEmptyBalances());
        this.frozenBalances.set(parsed.frozenBalances || this.createEmptyBalances());
        this.transactions.set(parsed.transactions || []);
        this.pendingTransactions.set(parsed.pendingTransactions || []);
        return;
      } catch (e) {
        console.error("Wallet Load Error", e);
      }
    }

    // Seed default balances
    const initialBalances = this.createEmptyBalances();
    initialBalances['EGC'] = 15000;
    initialBalances['DLC'] = 2500;
    initialBalances['MDC'] = 750;
    initialBalances['GMC'] = 100;
    initialBalances['BKC'] = 5;
    initialBalances['EGC_save'] = 45000;
    initialBalances['DLC_save'] = 10000;
    initialBalances['MDC_save'] = 1500;
    initialBalances['GMC_save'] = 300;
    initialBalances['BKC_save'] = 25;

    this.balances.set(initialBalances);

    // Initial seed transaction log
    const initialTxs: Transaction[] = [
      {
        id: 'tx_seed_1',
        amount: 15000,
        type: 'deposit',
        currency: 'EGC',
        status: 'completed',
        description: 'إيداع أولي للنواة العصبية - Si-Neuro Core Seed',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'tx_seed_2',
        amount: 2500,
        type: 'deposit',
        currency: 'DLC',
        status: 'completed',
        description: 'إيداع تحفيز خارجي - External Stimulus',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
      }
    ];
    this.transactions.set(initialTxs);

    // Initial seed failed synchronization debt items
    this.pendingTransactions.set([
      {
        id: 'tx_pend_1',
        title: 'باقة الميديا الفائقة',
        price: 250,
        currency: 'MDC',
        status: 'failed_needs_action',
        timestamp: new Date().toISOString()
      }
    ]);

    this.saveState();
  }

  private saveState(): void {
    const data = {
      balances: this.balances(),
      frozenBalances: this.frozenBalances(),
      transactions: this.transactions(),
      pendingTransactions: this.pendingTransactions()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // Core operations
  adjustFunds(amount: number, type: TransactionType, currency: CurrencyCode = 'EGC'): boolean {
    const balCopy = { ...this.balances() };
    const frzCopy = { ...this.frozenBalances() };

    const currentBal = balCopy[currency] || 0;
    const currentFrz = frzCopy[currency] || 0;

    let newBal = currentBal;
    let newFrz = currentFrz;

    if (type === 'deposit') {
      newBal += amount;
    } else if (type === 'withdrawal') {
      if (currentBal < amount) return false;
      newBal -= amount;
    } else if (type === 'purchase_hold') {
      if (currentBal < amount) return false;
      newBal -= amount;
      newFrz += amount;
    } else if (type === 'purchase_release') {
      if (currentFrz < amount) return false;
      newFrz -= amount;
    } else if (type === 'purchase_refund') {
      newBal += amount;
      newFrz -= amount;
    }

    balCopy[currency] = newBal;
    frzCopy[currency] = newFrz;

    this.balances.set(balCopy);
    this.frozenBalances.set(frzCopy);

    // Push standard transaction log
    const newTx: Transaction = {
      id: `tx_${Math.random().toString(36).substr(2, 9)}`,
      amount: (type === 'deposit' || type === 'purchase_refund') ? amount : -amount,
      type,
      currency,
      status: 'completed',
      description: `عملية عصبية: ${type.replace('_', ' ')} [${currency}]`,
      timestamp: new Date().toISOString()
    };

    this.transactions.update(txs => [newTx, ...txs]);
    this.saveState();
    return true;
  }

  convertCurrency(from: CurrencyCode, to: CurrencyCode, amount: number): boolean {
    const balCopy = { ...this.balances() };
    const fromBal = balCopy[from] || 0;

    if (fromBal < amount) return false;

    // Direct 1:1 equivalency conversions
    balCopy[from] = fromBal - amount;
    balCopy[to] = (balCopy[to] || 0) + amount;

    this.balances.set(balCopy);

    const fromDef = CURRENCIES.find(c => c.code === from);
    const toDef = CURRENCIES.find(c => c.code === to);

    const newTx: Transaction = {
      id: `tx_${Math.random().toString(36).substr(2, 9)}`,
      amount: -amount,
      type: 'conversion',
      currency: from,
      toCurrency: to,
      toAmount: amount,
      status: 'completed',
      description: `تحويل عملة: ${amount} ${fromDef?.nameAr || from} ➔ ${amount} ${toDef?.nameAr || to}`,
      timestamp: new Date().toISOString()
    };

    this.transactions.update(txs => [newTx, ...txs]);
    this.saveState();
    return true;
  }

  // Pending acquisitions actions
  addPendingTransaction(tx: PendingTransaction): void {
    this.pendingTransactions.update(pending => [tx, ...pending]);
    this.saveState();
  }

  removePendingTransaction(id: string): void {
    this.pendingTransactions.update(pending => pending.filter(t => t.id !== id));
    this.saveState();
  }

  retryTransaction(id: string): boolean {
    const tx = this.pendingTransactions().find(t => t.id === id);
    if (!tx) return false;

    const success = this.adjustFunds(tx.price, 'purchase_hold', tx.currency);
    if (success) {
      this.removePendingTransaction(id);
      return true;
    }
    return false;
  }

  // Help generate empty multi-currency record
  private createEmptyBalances(): Record<CurrencyCode, number> {
    const res: any = {};
    CURRENCIES.forEach(c => {
      res[c.code] = 0;
    });
    return res;
  }
}
