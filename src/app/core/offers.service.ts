import { Injectable, signal, computed, inject } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { WalletService, CurrencyCode } from './wallet.service';
import { collection, doc, setDoc, updateDoc, onSnapshot, getFirestore } from 'firebase/firestore';

export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'countered';

export interface NegotiationProposal {
  id: string;
  proposalCode: string;
  senderNode: {
    name: string;
    username: string;
    avatar: string;
  };
  assetName: string;
  assetType: string;
  offeredAmount: number;
  currency: CurrencyCode;
  originalPrice?: number;
  message?: string;
  status: ProposalStatus;
  createdAt: string;
  counterOfferAmount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OffersService {
  private firebase = inject(FirebaseService);
  private walletService = inject(WalletService);
  private readonly STORAGE_KEY = 'Si-Neuro-negotiation-stream-v1';

  // Signals
  proposals = signal<NegotiationProposal[]>([]);

  // Computed pending count
  pendingCount = computed(() => {
    return this.proposals().filter(p => p.status === 'pending').length;
  });

  constructor() {
    this.loadState();
    this.initFirestoreSync();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed && Array.isArray(parsed)) {
          this.proposals.set(parsed);
          return;
        }
      } catch (e) {
        console.error('Offers state load error', e);
      }
    }

    // Default: Start clear (as seen in screenshot) or with 1 sample completed proposal
    this.proposals.set([]);
    this.saveState();
  }

  private initFirestoreSync(): void {
    try {
      if (this.firebase.firestore) {
        const col = collection(this.firebase.firestore, 'negotiation_offers');
        onSnapshot(col, (snapshot) => {
          if (!snapshot.empty) {
            const remote: NegotiationProposal[] = [];
            snapshot.forEach(docSnap => {
              remote.push({ id: docSnap.id, ...docSnap.data() } as NegotiationProposal);
            });
            if (remote.length > 0) {
              this.proposals.set(remote);
              this.saveState();
            }
          }
        }, (err) => {
          console.warn('[OffersService] Firestore sync notice:', err.message);
        });
      }
    } catch (e) {
      console.warn('[OffersService] Firestore sync init skipped:', e);
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.proposals()));
  }

  // Create new proposal
  createProposal(proposal: Omit<NegotiationProposal, 'id' | 'proposalCode' | 'createdAt' | 'status'>): void {
    const newProposal: NegotiationProposal = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      proposalCode: `PROP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...proposal
    };

    this.proposals.update(list => [newProposal, ...list]);
    this.saveState();
    this.syncProposalToCloud(newProposal);
  }

  // Accept proposal -> deposit funds to wallet
  acceptProposal(proposalId: string): boolean {
    const p = this.proposals().find(item => item.id === proposalId);
    if (!p) return false;

    // Deposit funds to seller wallet
    this.walletService.depositFunds(p.offeredAmount, p.currency, `قبول عرض تفاوض: ${p.assetName} (#${p.proposalCode})`);

    this.proposals.update(list => list.map(item => item.id === proposalId ? { ...item, status: 'accepted' } : item));
    this.saveState();
    this.updateCloudStatus(proposalId, 'accepted');
    return true;
  }

  // Decline proposal
  declineProposal(proposalId: string): void {
    this.proposals.update(list => list.map(item => item.id === proposalId ? { ...item, status: 'declined' } : item));
    this.saveState();
    this.updateCloudStatus(proposalId, 'declined');
  }

  // Counter offer
  counterOffer(proposalId: string, counterAmount: number): void {
    this.proposals.update(list => list.map(item => item.id === proposalId ? { 
      ...item, 
      status: 'countered',
      counterOfferAmount: counterAmount 
    } : item));
    this.saveState();
    this.updateCloudStatus(proposalId, 'countered', counterAmount);
  }

  // Clear / Seed demo proposal for instant testing
  seedDemoProposal(): void {
    this.createProposal({
      senderNode: {
        name: 'أحمد عرفه',
        username: '@ahmed1999',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop'
      },
      assetName: 'لوحة تحكم ESP32 الذكية (Pro Core Node)',
      assetType: 'عتاد إلكتروني',
      offeredAmount: 750,
      currency: 'DLC',
      originalPrice: 900,
      message: 'مرحباً، أود الاستحواذ على هذا العتاد مقابل 750 دولار كاش مع الشحن الفوري.'
    });
  }

  private async syncProposalToCloud(proposal: NegotiationProposal): Promise<void> {
    try {
      if (this.firebase.firestore) {
        await setDoc(doc(this.firebase.firestore, 'negotiation_offers', proposal.id), proposal);
      }
    } catch (e) {
      console.warn('[OffersService] Cloud sync error:', e);
    }
  }

  private async updateCloudStatus(proposalId: string, status: ProposalStatus, counterAmount?: number): Promise<void> {
    try {
      if (this.firebase.firestore) {
        const updateData: any = { status };
        if (counterAmount) updateData.counterOfferAmount = counterAmount;
        await updateDoc(doc(this.firebase.firestore, 'negotiation_offers', proposalId), updateData);
      }
    } catch (e) {
      console.warn('[OffersService] Cloud status update error:', e);
    }
  }
}
