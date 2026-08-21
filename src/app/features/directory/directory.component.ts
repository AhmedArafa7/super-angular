import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DirectoryService, NetworkNode } from '../../core/directory.service';
import { WalletService, CurrencyCode, CURRENCIES } from '../../core/wallet.service';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './directory.component.html',
  styleUrls: ['./directory.component.scss']
})
export class DirectoryComponent implements OnInit {
  directoryService = inject(DirectoryService);
  walletService = inject(WalletService);
  router = inject(Router);

  // States
  searchQuery = signal<string>('');
  filterType = signal<'all' | 'human' | 'ai_agent' | 'online'>('all');

  // Modals
  selectedNode = signal<NetworkNode | null>(null);
  transferModalNode = signal<NetworkNode | null>(null);
  transferAmount = signal<number>(50);
  transferCurrency = signal<CurrencyCode>('EGC');
  transferSuccess = signal<boolean>(false);
  transferError = signal<string>('');

  // Toast
  toastMsg = signal<string | null>(null);

  // Active nodes count
  activeNodesCount = computed(() => {
    return this.directoryService.nodes().filter(n => n.status === 'online').length;
  });

  // Filtered nodes
  filteredNodes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.filterType();
    let list = this.directoryService.nodes();

    if (q) {
      list = list.filter(n => 
        n.name.toLowerCase().includes(q) ||
        n.username.toLowerCase().includes(q) ||
        n.rankLabel.toLowerCase().includes(q) ||
        n.nodeId.toLowerCase().includes(q)
      );
    }

    if (filter === 'human') {
      list = list.filter(n => n.type === 'human');
    } else if (filter === 'ai_agent') {
      list = list.filter(n => n.type === 'ai_agent');
    } else if (filter === 'online') {
      list = list.filter(n => n.status === 'online');
    }

    return list;
  });

  availableCurrencies = CURRENCIES.filter(c => !c.issave);

  ngOnInit(): void {}

  // Open Direct Message / Chat
  openPeerChat(node: NetworkNode): void {
    if (node.type === 'ai_agent') {
      this.router.navigate(['/chat']);
    } else {
      this.router.navigate(['/peer-chat'], { queryParams: { user: node.username } });
    }
  }

  // Open Transfer Modal
  openTransferModal(node: NetworkNode): void {
    this.transferModalNode.set(node);
    this.transferAmount.set(50);
    this.transferError.set('');
    this.transferSuccess.set(false);
  }

  // Execute Transfer
  executeTransfer(): void {
    const node = this.transferModalNode();
    const amt = Number(this.transferAmount());
    const curr = this.transferCurrency();

    if (!node || !amt || amt <= 0) return;

    const success = this.directoryService.transferToNode(node, amt, curr);
    if (success) {
      this.transferSuccess.set(true);
      this.triggerToast(`تم تحويل ${amt} ${curr} إلى ${node.name} بنجاح ✅`);
      setTimeout(() => {
        this.transferModalNode.set(null);
      }, 1200);
    } else {
      this.transferError.set('رصيدك الحالي غير كافٍ لإتمام عملية التحويل.');
    }
  }

  triggerToast(msg: string): void {
    this.toastMsg.set(msg);
    setTimeout(() => {
      if (this.toastMsg() === msg) {
        this.toastMsg.set(null);
      }
    }, 3000);
  }
}
