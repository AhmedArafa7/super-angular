import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './services/firebase.service';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getFirestore } from 'firebase/firestore';

export type QACategory = 'question' | 'request';

export interface QAPost {
  id: string;
  category: QACategory;
  text: string;
  authorId: string;
  authorName: string;
  isAnonymous?: boolean;
  createdAt: string;
  updatedAt?: string;
  answer?: string;
  answeredAt?: string;
  answeredBy?: string;
  answerAlert?: string;
  followUpText?: string;
  followUpAt?: string;
  followUpAnswer?: string;
  followUpAnswerAt?: string;
  followUpAnswerBy?: string;
  likes: number;
  likedBy: string[];
}

@Injectable({
  providedIn: 'root'
})
export class QAService {
  private firebaseService = inject(FirebaseService);
  private readonly STORAGE_KEY = 'Si-Neuro-qa-store-v2';

  // Signals
  posts = signal<QAPost[]>([]);
  isAdminMode = signal<boolean>(true); // Default to admin for full functionality

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
          this.posts.set(parsed);
          return;
        }
      } catch (e) {
        console.error("Q&A state load error", e);
      }
    }

    // Seed default questions and requests matching screenshot
    const defaultPosts: QAPost[] = [
      {
        id: 'qa_screenshot_1',
        category: 'question',
        text: 'ما هي قوانين العمل عندكم',
        authorId: 'user_ahmed',
        authorName: 'أحمد عرفه',
        isAnonymous: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(), // 4 months ago
        answer: '1 معاد التسليم ليس . هو فقط محاولة لتنظيم الوقت فالجودة أهم من الكمية',
        answeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        answeredBy: 'أحمد عرفه',
        likes: 5,
        likedBy: []
      },
      {
        id: 'qa_screenshot_2',
        category: 'request',
        text: 'يرجى إضافة قسم خاص لمزامنة المشاريع البرمجية واستعراضها عبر المتصفح بشكل فوري.',
        authorId: 'user_ahmed',
        authorName: 'أحمد عرفه',
        isAnonymous: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        likes: 3,
        likedBy: []
      },
      {
        id: 'qa_3',
        category: 'question',
        text: 'هل نظام الخزنة المركزية آمن ويقوم بتشفير الملفات قبل تخزينها؟',
        authorId: 'user_3',
        authorName: 'يوسف الهواري',
        isAnonymous: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        answer: 'أهلاً يوسف! نعم، الخزنة المركزية تعتمد على تشفير محلي قوي للملفات المخزنة محلياً لضمان عدم وصول أي طرف خارجي لبياناتك الخاصة.',
        answeredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        answeredBy: 'أحمد عرفه',
        likes: 19,
        likedBy: []
      }
    ];

    this.posts.set(defaultPosts);
    this.saveState();
  }

  private initFirestoreSync(): void {
    try {
      if (this.firebaseService.firestore) {
        const qaCollection = collection(this.firebaseService.firestore, 'qa_posts');
        onSnapshot(qaCollection, (snapshot) => {
          if (!snapshot.empty) {
            const remotePosts: QAPost[] = [];
            snapshot.forEach(docSnap => {
              remotePosts.push({ id: docSnap.id, ...docSnap.data() } as QAPost);
            });
            if (remotePosts.length > 0) {
              this.posts.set(remotePosts);
              this.saveState();
            }
          }
        }, (err) => {
          console.warn('[QAService] Firestore live sync notice:', err.message);
        });
      }
    } catch (e) {
      console.warn('[QAService] Firestore sync init skipped:', e);
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.posts()));
  }

  // Create post
  async addPost(category: QACategory, text: string, authorName: string, isAnonymous: boolean): Promise<void> {
    const cleanAuthor = authorName.trim() || 'أحمد عرفه';
    const newPost: QAPost = {
      id: 'qa_' + Math.random().toString(36).substr(2, 9),
      category,
      text: text.trim(),
      authorId: this.firebaseService.currentUser()?.uid || 'user_local',
      authorName: cleanAuthor,
      isAnonymous,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: []
    };

    this.posts.update(list => [newPost, ...list]);
    this.saveState();

    // Sync with Firestore
    try {
      if (this.firebaseService.firestore) {
        const postRef = doc(this.firebaseService.firestore, 'qa_posts', newPost.id);
        await setDoc(postRef, newPost, { merge: true });
      }
    } catch (e) {
      console.warn('[QAService] Remote save error:', e);
    }
  }

  // Update post
  async updatePost(postId: string, text: string, isAnonymous: boolean): Promise<void> {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          const updated = {
            ...post,
            text: text.trim(),
            isAnonymous,
            updatedAt: new Date().toISOString()
          };
          this.syncPostToFirestore(updated);
          return updated;
        }
        return post;
      })
    );
    this.saveState();
  }

  // Delete post
  async deletePost(postId: string): Promise<void> {
    this.posts.update(list => list.filter(post => post.id !== postId));
    this.saveState();

    try {
      if (this.firebaseService.firestore) {
        const postRef = doc(this.firebaseService.firestore, 'qa_posts', postId);
        await deleteDoc(postRef);
      }
    } catch (e) {
      console.warn('[QAService] Remote delete error:', e);
    }
  }

  // Like/Upvote post
  async likePost(postId: string, userId: string = 'current_user'): Promise<void> {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          const hasLiked = post.likedBy.includes(userId);
          const likedBy = hasLiked 
            ? post.likedBy.filter(id => id !== userId) 
            : [...post.likedBy, userId];
          const likes = hasLiked ? Math.max(0, post.likes - 1) : post.likes + 1;
          const updated = { ...post, likes, likedBy };
          this.syncPostToFirestore(updated);
          return updated;
        }
        return post;
      })
    );
    this.saveState();
  }

  // Admin Answer
  async answerPost(postId: string, answer: string, adminName: string, answerAlert?: string): Promise<void> {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          const updated: QAPost = {
            ...post,
            answer: answer.trim(),
            answerAlert: answerAlert?.trim() || undefined,
            answeredAt: new Date().toISOString(),
            answeredBy: adminName.trim() || 'أحمد عرفه'
          };
          this.syncPostToFirestore(updated);
          return updated;
        }
        return post;
      })
    );
    this.saveState();
  }

  // User Follow-up
  async addFollowUp(postId: string, text: string): Promise<void> {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          const updated: QAPost = {
            ...post,
            followUpText: text.trim(),
            followUpAt: new Date().toISOString()
          };
          this.syncPostToFirestore(updated);
          return updated;
        }
        return post;
      })
    );
    this.saveState();
  }

  // Admin Answer Follow-up
  async answerFollowUp(postId: string, answer: string, adminName: string): Promise<void> {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          const updated: QAPost = {
            ...post,
            followUpAnswer: answer.trim(),
            followUpAnswerAt: new Date().toISOString(),
            followUpAnswerBy: adminName.trim() || 'أحمد عرفه'
          };
          this.syncPostToFirestore(updated);
          return updated;
        }
        return post;
      })
    );
    this.saveState();
  }

  private async syncPostToFirestore(post: QAPost): Promise<void> {
    try {
      if (this.firebaseService.firestore) {
        const postRef = doc(this.firebaseService.firestore, 'qa_posts', post.id);
        await setDoc(postRef, post, { merge: true });
      }
    } catch (e) {
      console.warn('[QAService] syncPostToFirestore error:', e);
    }
  }

  // Relative Time Formatter in Arabic
  formatRelativeTime(isoString: string): string {
    if (!isoString) return 'قبل فترة';
    const now = Date.now();
    const past = new Date(isoString).getTime();
    const diffMs = now - past;

    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 45) return 'منذ لحظات';
    if (diffMin < 2) return 'منذ دقيقة';
    if (diffMin < 11) return `قبل ${diffMin} دقائق`;
    if (diffMin < 60) return `قبل ${diffMin} دقيقة`;
    if (diffHour === 1) return 'قبل ساعة';
    if (diffHour === 2) return 'قبل ساعتين';
    if (diffHour < 11) return `قبل ${diffHour} ساعات`;
    if (diffHour < 24) return `قبل ${diffHour} ساعة`;
    if (diffDay === 1) return 'أمس';
    if (diffDay === 2) return 'قبل يومين';
    if (diffDay < 11) return `قبل ${diffDay} أيام`;
    if (diffDay < 30) return `قبل ${diffDay} يوماً`;
    if (diffMonth === 1) return 'قبل شهر';
    if (diffMonth === 2) return 'قبل شهرين';
    if (diffMonth < 11) return `قبل ${diffMonth} أشهر`;
    if (diffMonth < 12) return `قبل ${diffMonth} شهراً`;
    if (diffYear === 1) return 'قبل سنة';
    return `قبل ${diffYear} سنوات`;
  }
}
