import { Injectable, signal } from '@angular/core';

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
  likes: number; // premium extra metric: upvotes
  likedBy: string[]; // tracking user likes
}

@Injectable({
  providedIn: 'root'
})
export class QAService {
  private readonly STORAGE_KEY = 'Si-Neuro-qa-store';

  // Signals
  posts = signal<QAPost[]>([]);
  isAdminMode = signal<boolean>(false);

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    const dataStr = localStorage.getItem(this.STORAGE_KEY);
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        this.posts.set(parsed || []);
      } catch (e) {
        console.error("Q&A state load error", e);
      }
    } else {
      // Seed rich default questions and requests
      const defaultPosts: QAPost[] = [
        {
          id: 'qa_1',
          category: 'question',
          text: 'هل يمكنني برمجة شريحة ESP32 مباشرة من متصفح الويب في معمل المتحكمات؟',
          authorId: 'user_1',
          authorName: 'المهندس أحمد',
          isAnonymous: false,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          answer: 'نعم بالتأكيد! نحن نستخدم Web Serial API المباشرة للاتصال بالمتحكمات من المتصفح دون الحاجة لتثبيت أي برامج خارجية.',
          answeredAt: new Date(Date.now() - 3600000).toISOString(),
          answeredBy: 'المؤسس الإداري',
          answerAlert: 'تنبيه: يجب استخدام متصفح يدعم بروتوكول Serial مثل Google Chrome أو Microsoft Edge.',
          likes: 12,
          likedBy: []
        },
        {
          id: 'qa_2',
          category: 'request',
          text: 'يرجى إضافة خيار تصفية ذكي في محرك البحث WeTube لتصفية الفيديوهات التي تزيد مدتها عن ساعة.',
          authorId: 'user_2',
          authorName: 'سارة خالد',
          isAnonymous: true,
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          likes: 8,
          likedBy: []
        },
        {
          id: 'qa_3',
          category: 'question',
          text: 'هل نظام الخزنة المركزية آمن ويقوم بتشفير الملفات قبل تخزينها؟',
          authorId: 'user_3',
          authorName: 'يوسف الهواري',
          isAnonymous: false,
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          answer: 'أهلاً يوسف! نعم، الخزنة المركزية تعتمد على تشفير محلي قوي للملفات المخزنة محلياً لضمان عدم وصول أي طرف خارجي لبياناتك الخاصة.',
          answeredAt: new Date(Date.now() - 3600000 * 18).toISOString(),
          answeredBy: 'مسؤول الحماية الإدارية',
          likes: 19,
          likedBy: [],
          followUpText: 'هل هذا يعني أنه حتى لو ضاع جهاز الكمبيوتر لا يمكن استرداد الملفات دون كلمة المرور؟',
          followUpAt: new Date(Date.now() - 3600000 * 10).toISOString(),
          followUpAnswer: 'بالضبط! بدون مفتاح التشفير وكلمة المرور المشفرة محلياً، يستحيل فك تشفير البيانات أو قراءة محتويات الملفات.',
          followUpAnswerAt: new Date(Date.now() - 3600000 * 8).toISOString(),
          followUpAnswerBy: 'مسؤول الحماية الإدارية'
        }
      ];
      this.posts.set(defaultPosts);
      this.saveState();
    }
  }

  saveState(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.posts()));
  }

  // Create post
  addPost(category: QACategory, text: string, authorName: string, isAnonymous: boolean): void {
    const newPost: QAPost = {
      id: 'qa_' + Math.random().toString(36).substr(2, 9),
      category,
      text,
      authorId: 'current_user',
      authorName: authorName || 'مستخدم نكسوس',
      isAnonymous,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: []
    };

    this.posts.update(list => [newPost, ...list]);
    this.saveState();
  }

  // Update post
  updatePost(postId: string, text: string, isAnonymous: boolean): void {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId && !post.answer) {
          return {
            ...post,
            text,
            isAnonymous,
            updatedAt: new Date().toISOString()
          };
        }
        return post;
      })
    );
    this.saveState();
  }

  // Delete post
  deletePost(postId: string): void {
    this.posts.update(list => list.filter(post => post.id !== postId));
    this.saveState();
  }

  // Like/Upvote post
  likePost(postId: string, userId: string = 'current_user'): void {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          const hasLiked = post.likedBy.includes(userId);
          const likedBy = hasLiked 
            ? post.likedBy.filter(id => id !== userId) 
            : [...post.likedBy, userId];
          const likes = hasLiked ? post.likes - 1 : post.likes + 1;
          return { ...post, likes, likedBy };
        }
        return post;
      })
    );
    this.saveState();
  }

  // Admin Answer
  answerPost(postId: string, answer: string, adminName: string, answerAlert?: string): void {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            answer,
            answerAlert: answerAlert || undefined,
            answeredAt: new Date().toISOString(),
            answeredBy: adminName || 'الإدارة المركزية'
          };
        }
        return post;
      })
    );
    this.saveState();
  }

  // User Follow-up
  addFollowUp(postId: string, text: string): void {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            followUpText: text,
            followUpAt: new Date().toISOString()
          };
        }
        return post;
      })
    );
    this.saveState();
  }

  // Admin Answer Follow-up
  answerFollowUp(postId: string, answer: string, adminName: string): void {
    this.posts.update(list => 
      list.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            followUpAnswer: answer,
            followUpAnswerAt: new Date().toISOString(),
            followUpAnswerBy: adminName || 'الإدارة المركزية'
          };
        }
        return post;
      })
    );
    this.saveState();
  }
}
