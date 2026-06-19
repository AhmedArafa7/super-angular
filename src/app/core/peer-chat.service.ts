import { Injectable, signal, computed } from '@angular/core';

export type MessageType = 'text' | 'image' | 'file';

export interface PeerContact {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  status: 'online' | 'offline';
  platform: 'Si-Neuro' | 'whatsapp' | 'telegram' | 'instagram';
  bio: string;
}

export interface PeerMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  imageUrl?: string;
  type: MessageType;
  isRead: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PeerChatService {
  private readonly STORAGE_KEY = 'Si-Neuro-peer-chat-state-v1';

  // Signals
  contacts = signal<PeerContact[]>([
    {
      id: 'peer_1',
      name: 'عمر الفاروق',
      username: 'omar_farooq',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      status: 'online',
      platform: 'Si-Neuro',
      bio: 'عضو اللجنة التقنية العليا للشبكة العصبية.'
    },
    {
      id: 'peer_2',
      name: 'ليلى أحمد',
      username: 'layla_ahmed',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      status: 'offline',
      platform: 'Si-Neuro',
      bio: 'مهندسة برمجيات متخصصة في المحاكيات وتصميم الواجهات.'
    },
    {
      id: 'peer_3',
      name: 'عبد الرحمن',
      username: 'abdurrahman',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
      status: 'online',
      platform: 'Si-Neuro',
      bio: 'أخصائي التشفير العصبي الفائق وحماية البيانات.'
    }
  ]);

  messages = signal<PeerMessage[]>([]);
  activeChatId = signal<string | null>(null);

  // Channels integration states
  whatsappConnected = signal<boolean>(false);
  whatsappQrCode = signal<string | null>(null);

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.messages) this.messages.set(parsed.messages);
        if (parsed.whatsappConnected) this.whatsappConnected.set(parsed.whatsappConnected);
        return;
      } catch (e) {
        console.error("PeerChat Load Error", e);
      }
    }

    // Seed initial message history for superb fidelity
    const seeds: PeerMessage[] = [
      {
        id: 'msg_seed_1',
        chatId: 'me_peer_1',
        senderId: 'peer_1',
        text: 'السلام عليكم يا مهندس، هل قمت بمراجعة التحديثات الأمنية الأخيرة لعقدتنا؟',
        type: 'text',
        isRead: true,
        timestamp: Date.now() - 3600000 * 2
      },
      {
        id: 'msg_seed_2',
        chatId: 'me_peer_1',
        senderId: 'me',
        text: 'وعليكم السلام يا عمر، نعم تم التحقق والبروتوكول يعمل بكفاءة 100%.',
        type: 'text',
        isRead: true,
        timestamp: Date.now() - 3600000
      },
      {
        id: 'msg_seed_3',
        chatId: 'me_peer_3',
        senderId: 'peer_3',
        text: 'تقرير تشفير القنوات جاهز للمراجعة الفورية.',
        type: 'text',
        isRead: false,
        timestamp: Date.now() - 600000
      }
    ];

    this.messages.set(seeds);
    this.saveState();
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      messages: this.messages(),
      whatsappConnected: this.whatsappConnected()
    }));
  }

  getChatId(userId: string, targetId: string): string {
    return [userId, targetId].sort().join('_');
  }

  sendMessage(currentUserId: string, targetUserId: string, text: string, type: MessageType = 'text', imageUrl?: string): void {
    const chatId = this.getChatId(currentUserId, targetUserId);
    const newMsg: PeerMessage = {
      id: `peer_msg_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      senderId: currentUserId,
      text,
      imageUrl,
      type,
      isRead: false,
      timestamp: Date.now()
    };

    this.messages.update(list => [...list, newMsg]);
    this.saveState();

    // Trigger realistic reply simulator
    if (currentUserId === 'me') {
      this.simulateIncomingReply(targetUserId, text);
    }
  }

  markAsRead(chatId: string): void {
    this.messages.update(list => {
      return list.map(m => m.chatId === chatId && m.senderId !== 'me' ? { ...m, isRead: true } : m);
    });
    this.saveState();
  }

  private simulateIncomingReply(targetUserId: string, userText: string): void {
    const contact = this.contacts().find(c => c.id === targetUserId);
    if (!contact || contact.status !== 'online') return;

    // Simulate thinking delay
    setTimeout(() => {
      let replyText = 'مستعد لمساعدتك يا صديقي، يرجى الاستمرار.';
      if (userText.includes('سلام') || userText.includes('مرحبا')) {
        replyText = `أهلاً بك يا زميل العمل! أنا ${contact.name}، كيف يمكنني مساعدتك اليوم؟`;
      } else if (userText.includes('تقرير') || userText.includes('تحديث')) {
        replyText = 'تم تسليم كافة المستندات والتحديثات العصبية للشبكة بنجاح، جاري التدقيق الآن.';
      } else if (userText.includes('رصيد') || userText.includes('محفظة')) {
        replyText = 'يرجى مراجعة صفحة المحفظة الذكية للتحقق من الأصول بشكل آمن.';
      }

      const replyMsg: PeerMessage = {
        id: `peer_msg_${Math.random().toString(36).substr(2, 9)}`,
        chatId: this.getChatId('me', targetUserId),
        senderId: targetUserId,
        text: replyText,
        type: 'text',
        isRead: false,
        timestamp: Date.now()
      };

      this.messages.update(list => [...list, replyMsg]);
      this.saveState();
    }, 1500);
  }
}
