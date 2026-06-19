import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { PeerChatService, PeerContact, PeerMessage, MessageType } from '../../core/peer-chat.service';

@Component({
  selector: 'app-peer-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './peer-chat.component.html',
  styleUrls: ['./peer-chat.component.scss']
})
export class PeerChatComponent {
  chatService = inject(PeerChatService);

  // States
  searchQuery = signal<string>('');
  selectedId = signal<string | null>(null);
  viewMode = signal<'chat' | 'channels'>('channels'); // 'chat' or 'channels'
  
  // Messaging input states
  textInput = signal<string>('');
  
  // Channels manager connection states
  activeChannel = signal<string | null>(null);
  channelStep = signal<number>(1); // 1: Select, 2: Scan QR
  isConnecting = signal<boolean>(false);
  qrCodeVal = signal<string | null>(null);

  // Constant channel nodes
  channelsList = [
    { 
      id: 'whatsapp', 
      name: 'WhatsApp Direct', 
      icon: 'message-circle', 
      color: 'text-emerald-400', 
      connected: false,
      desc: 'ربط حسابك الشخصي لمراسلة أصدقائك مباشرة وعقد الشبكة.'
    },
    { 
      id: 'telegram', 
      name: 'Telegram Secure', 
      icon: 'send', 
      color: 'text-sky-400', 
      connected: false,
      desc: 'مزامنة محادثات تليجرام الشخصية والقنوات المحمية.'
    },
    { 
      id: 'instagram', 
      name: 'Instagram Hub', 
      icon: 'star', 
      color: 'text-pink-400', 
      connected: false,
      desc: 'إدارة رسائل إنستقرام المباشرة بشكل ممرر وموحد.'
    }
  ];

  // Filters contacts list
  filteredContacts = computed(() => {
    const list = this.chatService.contacts();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return list;
    return list.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.username.toLowerCase().includes(query)
    );
  });

  // Selected contact details
  activeContact = computed(() => {
    return this.chatService.contacts().find(c => c.id === this.selectedId());
  });

  // Current chat messages list filter
  activeChatMessages = computed(() => {
    const targetId = this.selectedId();
    if (!targetId) return [];
    const chatId = this.chatService.getChatId('me', targetId);
    return this.chatService.messages().filter(m => m.chatId === chatId);
  });

  // Select contact node trigger
  selectContact(c: PeerContact): void {
    this.selectedId.set(c.id);
    this.viewMode.set('chat');
    
    // Mark as read
    const chatId = this.chatService.getChatId('me', c.id);
    this.chatService.markAsRead(chatId);
  }

  // Check if contact has unread messages
  hasUnread(c: PeerContact): boolean {
    const chatId = this.chatService.getChatId('me', c.id);
    return this.chatService.messages().some(m => m.chatId === chatId && m.senderId !== 'me' && !m.isRead);
  }

  // Sending messaging trigger
  submitMessage(): void {
    const text = this.textInput().trim();
    const targetId = this.selectedId();
    if (!text || !targetId) return;

    this.chatService.sendMessage('me', targetId, text, 'text');
    this.textInput.set('');

    // Auto mark read
    const chatId = this.chatService.getChatId('me', targetId);
    setTimeout(() => this.chatService.markAsRead(chatId), 100);
  }

  // Simulate file / image upload
  triggerMediaUpload(type: 'image' | 'file'): void {
    const targetId = this.selectedId();
    if (!targetId) return;

    if (type === 'image') {
      const imageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop";
      this.chatService.sendMessage('me', targetId, 'صورة فضائية مرسلة عصبياً', 'image', imageUrl);
    } else {
      const fileUrl = "https://example.com/Si-Neuro_data_package.zip";
      this.chatService.sendMessage('me', targetId, 'Si-Neuro_data_package.zip', 'file', fileUrl);
    }
    
    alert(`🎉 تم إرسال ومزامنة ${type === 'image' ? 'الصورة' : 'الملف'} بنجاح!`);
  }

  // Channels connections flows
  initiateChannelLink(channelId: string): void {
    this.activeChannel.set(channelId);
    this.channelStep.set(1);
    this.isConnecting.set(false);
    this.qrCodeVal.set(null);
  }

  startLinkingFlow(): void {
    this.isConnecting.set(true);
    
    setTimeout(() => {
      this.isConnecting.set(false);
      this.channelStep.set(2);
      // Mock generated QR
      this.qrCodeVal.set("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Si-NeuroSecurePairingNode");
    }, 1500);
  }

  confirmPairing(): void {
    const active = this.activeChannel();
    if (active === 'whatsapp') {
      this.chatService.whatsappConnected.set(true);
    }
    alert(`🎉 تم ربط ومزامنة قناة ${active} بنجاح! جميع الرسائل مشفرة بنظام Direct Link.`);
    this.activeChannel.set(null);
  }
}
