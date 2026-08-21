import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { WalletService, CurrencyCode } from './wallet.service';
import { collection, doc, setDoc, onSnapshot, getFirestore } from 'firebase/firestore';

export type NodeType = 'human' | 'ai_agent' | 'system_node';
export type NodeRank = 'founder' | 'core_architect' | 'pro_member' | 'developer' | 'ai_assistant';

export interface NetworkNode {
  id: string;
  nodeId: string;
  name: string;
  username: string;
  avatar: string;
  type: NodeType;
  rank: NodeRank;
  rankLabel: string;
  status: 'online' | 'busy' | 'offline';
  pingMs: number;
  isVerified: boolean;
  e2eeProtocol: string;
  bio: string;
  location: string;
  joinedDate: string;
  walletAddress: string;
  reputation: number;
}

@Injectable({
  providedIn: 'root'
})
export class DirectoryService {
  private firebase = inject(FirebaseService);
  private walletService = inject(WalletService);
  private readonly STORAGE_KEY = 'Si-Neuro-network-directory-v2';

  // Signals
  nodes = signal<NetworkNode[]>([]);

  constructor() {
    this.loadState();
    this.initFirestoreSync();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          this.nodes.set(parsed);
          return;
        }
      } catch (e) {
        console.error('Directory state load error', e);
      }
    }

    // Default Seed Network Nodes
    const seedNodes: NetworkNode[] = [
      {
        id: 'node_1',
        nodeId: 'NODE_0001',
        name: 'أحمد عرفه',
        username: '@ahmed1999',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
        type: 'human',
        rank: 'founder',
        rankLabel: 'مؤسس النواة (Core Founder)',
        status: 'online',
        pingMs: 8,
        isVerified: true,
        e2eeProtocol: 'AES-GCM-256',
        bio: 'مطور منصة Si-Neuro ومصمم الأنظمة العصبية المتكاملة.',
        location: 'القاهرة، مصر 🇪🇬',
        joinedDate: '2024-01-15',
        walletAddress: '0x71C...8821',
        reputation: 998
      },
      {
        id: 'node_2',
        nodeId: 'NODE_0002',
        name: 'المهندس العصبي الذكي',
        username: '@neural_architect',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=250&auto=format&fit=crop',
        type: 'ai_agent',
        rank: 'core_architect',
        rankLabel: 'وكيل ذكي فائق (Autonomous AI)',
        status: 'online',
        pingMs: 4,
        isVerified: true,
        e2eeProtocol: 'Quantum-Safe RSA-4096',
        bio: 'وكيل برمجي ذاتي لتوليد الأكواد وتصميم المشاريع التفاعلية.',
        location: 'السحابة العصبية المركزية ⚡',
        joinedDate: '2024-02-01',
        walletAddress: '0x94B...4412',
        reputation: 950
      },
      {
        id: 'node_3',
        nodeId: 'NODE_0003',
        name: 'سارة خالد',
        username: '@sara_dev',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=250&auto=format&fit=crop',
        type: 'human',
        rank: 'developer',
        rankLabel: 'مطور واجهات ومكتبات (Frontend Dev)',
        status: 'online',
        pingMs: 14,
        isVerified: true,
        e2eeProtocol: 'AES-GCM-256',
        bio: 'مهندسة برمجيات متخصصة في Angular و Signal State Management.',
        location: 'الإسكندرية، مصر 🇪🇬',
        joinedDate: '2024-03-10',
        walletAddress: '0x33F...9100',
        reputation: 780
      },
      {
        id: 'node_4',
        nodeId: 'NODE_0004',
        name: 'يوسف الهواري',
        username: '@youssef_h',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop',
        type: 'human',
        rank: 'pro_member',
        rankLabel: 'عضو Pro مميز (Nexus Pro)',
        status: 'online',
        pingMs: 18,
        isVerified: true,
        e2eeProtocol: 'AES-GCM-256',
        bio: 'صانع محتوى في halaltube ومتحمس للأنظمة المدمجة ومعمل ESP32.',
        location: 'الجيزة، مصر 🇪🇬',
        joinedDate: '2024-04-05',
        walletAddress: '0x12A...5567',
        reputation: 620
      },
      {
        id: 'node_5',
        nodeId: 'NODE_0005',
        name: 'مساعد الدردشة Si-NeuroAI',
        username: '@gemini_flash',
        avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=250&auto=format&fit=crop',
        type: 'ai_agent',
        rank: 'ai_assistant',
        rankLabel: 'محرك المحادثة والمعرفة (Gemini 2.5)',
        status: 'online',
        pingMs: 2,
        isVerified: true,
        e2eeProtocol: 'TLS 1.3 + E2EE',
        bio: 'المحرك المعرفي للحوار الذكي والردود التقنية الفورية.',
        location: 'Google AI Core 🌐',
        joinedDate: '2024-01-01',
        walletAddress: '0x88E...0011',
        reputation: 999
      },
      {
        id: 'node_6',
        nodeId: 'NODE_0006',
        name: 'المهندس كريم محمود',
        username: '@karim_m',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=250&auto=format&fit=crop',
        type: 'human',
        rank: 'developer',
        rankLabel: 'مهندس عتاد ومتحكمات (Embedded Engineer)',
        status: 'busy',
        pingMs: 22,
        isVerified: true,
        e2eeProtocol: 'AES-GCM-256',
        bio: 'متخصص في برمجة رقاقات STM32 و ESP32 وتصميم الدوائر الإلكترونية.',
        location: 'المنصورة، مصر 🇪🇬',
        joinedDate: '2024-05-12',
        walletAddress: '0x55C...7722',
        reputation: 540
      }
    ];

    this.nodes.set(seedNodes);
    this.saveState();
  }

  private initFirestoreSync(): void {
    try {
      if (this.firebase.firestore) {
        const col = collection(this.firebase.firestore, 'network_nodes');
        onSnapshot(col, (snapshot) => {
          if (!snapshot.empty) {
            const remote: NetworkNode[] = [];
            snapshot.forEach(docSnap => {
              remote.push({ id: docSnap.id, ...docSnap.data() } as NetworkNode);
            });
            if (remote.length > 0) {
              this.nodes.set(remote);
              this.saveState();
            }
          }
        }, (err) => {
          console.warn('[DirectoryService] Firestore sync notice:', err.message);
        });
      }
    } catch (e) {
      console.warn('[DirectoryService] Firestore sync init skipped:', e);
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.nodes()));
  }

  // Transfer funds to node directly via WalletService
  transferToNode(targetNode: NetworkNode, amount: number, currency: CurrencyCode): boolean {
    const success = this.walletService.adjustFunds(amount, 'withdrawal', currency);
    if (success) {
      this.saveState();
      return true;
    }
    return false;
  }
}
