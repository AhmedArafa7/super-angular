import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, limit, updateDoc, doc } from 'firebase/firestore';

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
  timestamp: any;
}

@Injectable({
  providedIn: 'root'
})
export class PeerChatService {
  private firebase = inject(FirebaseService);

  contacts = signal<PeerContact[]>([]);
  messages = signal<PeerMessage[]>([]);
  activeChatId = signal<string | null>(null);
  whatsappConnected = signal<boolean>(false);

  constructor() {
    this.initContacts();
  }

  private initContacts(): void {
    const usersRef = collection(this.firebase.firestore, 'users');
    const q = query(usersRef, limit(50));

    onSnapshot(q, (snapshot) => {
      const contacts = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          name: data.displayName || data.name || 'مستخدم',
          username: data.username || 'guest',
          avatar_url: data.photoURL || data.avatar_url || 'https://picsum.photos/100',
          status: 'online', // يمكن تحديثها لاحقاً بناءً على آخر نشاط
          platform: 'Si-Neuro',
          bio: data.bio || 'عضو في الشبكة العصبية'
        } as PeerContact;
      });
      this.contacts.set(contacts);
    });
  }

  // جلب الرسائل لحظياً من Firestore
  loadMessages(currentUserId: string, targetUserId: string): () => void {
    const chatId = this.getChatId(currentUserId, targetUserId);
    this.activeChatId.set(chatId);
    
    const messagesRef = collection(this.firebase.firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(d => ({
        id: d.id,
        chatId: chatId,
        ...d.data()
      } as PeerMessage));
      this.messages.set(messages);
    });
  }

  // إرسال الرسالة إلى Firestore
  async sendMessage(senderId: string, targetUserId: string, text: string, type: MessageType = 'text', imageUrl?: string): Promise<void> {
    const chatId = this.getChatId(senderId, targetUserId);
    const messagesRef = collection(this.firebase.firestore, 'chats', chatId, 'messages');
    
    await addDoc(messagesRef, {
      senderId,
      text: text || "",
      imageUrl: imageUrl || null,
      type,
      isRead: false,
      timestamp: Timestamp.now()
    });
  }

  markAsRead(chatId: string, messageId: string): Promise<void> {
    const msgRef = doc(this.firebase.firestore, 'chats', chatId, 'messages', messageId);
    return updateDoc(msgRef, { isRead: true });
  }

  getChatId(userId: string, targetUserId: string): string {
    return [userId, targetUserId].sort().join('_');
  }
}
