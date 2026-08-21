import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OffersService, NegotiationProposal, ProposalStatus } from '../../core/offers.service';
import { WalletService, CurrencyCode, CURRENCIES } from '../../core/wallet.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.scss']
})
export class OffersComponent {
  offersService = inject(OffersService);
  walletService = inject(WalletService);

  // States
  isRefreshing = signal<boolean>(false);
  filterStatus = signal<string>('all');

  // New Proposal Modal
  isNewProposalOpen = signal<boolean>(false);
  newAssetName = signal<string>('');
  newAssetType = signal<string>('برمجيات');
  newOfferedAmount = signal<number>(100);
  newCurrency = signal<CurrencyCode>('DLC');
  newMessage = signal<string>('');

  // Counter Modal
  counterProposalTarget = signal<NegotiationProposal | null>(null);
  counterAmount = signal<number>(0);

  // Toast
  toastMsg = signal<string | null>(null);

  // Filtered Proposals
  filteredProposals = computed(() => {
    const list = this.offersService.proposals();
    const filter = this.filterStatus();
    if (filter === 'all') return list;
    return list.filter(p => p.status === filter);
  });

  availableCurrencies = CURRENCIES.filter(c => !c.issave);

  // Refresh
  handleRefresh(): void {
    this.isRefreshing.set(true);
    setTimeout(() => {
      this.isRefreshing.set(false);
      this.triggerToast('تم تحديث تدفق العروض (Negotiation Stream) بنجاح.');
    }, 600);
  }

  // Accept Proposal
  handleAccept(proposal: NegotiationProposal): void {
    const success = this.offersService.acceptProposal(proposal.id);
    if (success) {
      this.triggerToast(`تم قبول العرض وإيداع +${proposal.offeredAmount} ${proposal.currency} في محفظتك بنجاح ✅`);
    }
  }

  // Decline Proposal
  handleDecline(proposal: NegotiationProposal): void {
    this.offersService.declineProposal(proposal.id);
    this.triggerToast('تم رفض العرض وإشعار صاحب الطلب.');
  }

  // Open Counter Modal
  openCounterModal(proposal: NegotiationProposal): void {
    this.counterProposalTarget.set(proposal);
    this.counterAmount.set(Math.round(proposal.offeredAmount * 1.15));
  }

  // Submit Counter Offer
  submitCounterOffer(): void {
    const p = this.counterProposalTarget();
    const amt = Number(this.counterAmount());
    if (!p || !amt || amt <= 0) return;

    this.offersService.counterOffer(p.id, amt);
    this.triggerToast(`تم إرسال عرضك المقابل بقيمة ${amt} ${p.currency} بنجاح.`);
    this.counterProposalTarget.set(null);
  }

  // Submit New Proposal
  submitNewProposal(): void {
    if (!this.newAssetName() || !this.newOfferedAmount() || this.newOfferedAmount() <= 0) return;

    this.offersService.createProposal({
      senderNode: {
        name: 'أنت (المستخدم الحالي)',
        username: '@my_node',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=250&auto=format&fit=crop'
      },
      assetName: this.newAssetName(),
      assetType: this.newAssetType(),
      offeredAmount: Number(this.newOfferedAmount()),
      currency: this.newCurrency(),
      message: this.newMessage()
    });

    this.triggerToast('تم إنشاء وإرسال طلب التفاوض بنجاح.');
    this.isNewProposalOpen.set(false);
    this.newAssetName.set('');
    this.newMessage.set('');
  }

  // Seed Demo
  handleSeedDemo(): void {
    this.offersService.seedDemoProposal();
    this.triggerToast('تم توليد عرض تفاوض تجريبي للمعاينة.');
  }

  triggerToast(msg: string): void {
    this.toastMsg.set(msg);
    setTimeout(() => {
      if (this.toastMsg() === msg) {
        this.toastMsg.set(null);
      }
    }, 3500);
  }
}
