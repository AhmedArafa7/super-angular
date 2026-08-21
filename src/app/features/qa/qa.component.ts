import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { QAService, QAPost, QACategory } from '../../core/qa.service';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-qa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './qa.component.html',
  styleUrls: ['./qa.component.scss']
})
export class QAComponent implements OnInit {
  qaService = inject(QAService);
  firebase = inject(FirebaseService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  // Filters & Search
  searchQuery = signal<string>('');
  activeCategoryFilter = signal<'all' | 'question' | 'request'>('all');

  // Add Modal State
  isAddOpen = signal<boolean>(false);
  newPostText = signal<string>('');
  newPostCategory = signal<QACategory>('question');
  newPostAnonymous = signal<boolean>(true);
  authorNameInput = signal<string>('');

  // Edit Post Modal State
  editingPost = signal<QAPost | null>(null);
  editText = signal<string>('');
  editAnonymous = signal<boolean>(false);

  // Admin Answer Modal State
  answeringPost = signal<QAPost | null>(null);
  answerText = signal<string>('');
  answerAlert = signal<string>('');
  adminResponderName = signal<string>('أحمد عرفه');

  // Follow-up Inquiry Modal State
  followUpPost = signal<QAPost | null>(null);
  followUpText = signal<string>('');

  // Follow-up Answer Modal State
  followUpAnsweringPost = signal<QAPost | null>(null);
  followUpAnswerText = signal<string>('');

  // Success Toast
  showToastMsg = signal<string | null>(null);

  // Current User Display Name
  currentUserDisplayName = computed(() => {
    const u = this.firebase.userData();
    return u?.displayName || u?.name || 'أحمد عرفه';
  });

  // Filtered Posts
  filteredPosts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.activeCategoryFilter();
    let list = this.qaService.posts();

    // Search filter
    if (query) {
      list = list.filter(p => 
        p.text.toLowerCase().includes(query) ||
        p.authorName.toLowerCase().includes(query) ||
        (p.answer && p.answer.toLowerCase().includes(query)) ||
        (p.followUpText && p.followUpText.toLowerCase().includes(query)) ||
        (p.followUpAnswer && p.followUpAnswer.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (cat !== 'all') {
      list = list.filter(p => p.category === cat);
    }

    // Sort by createdAt desc
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ngOnInit(): void {
    this.authorNameInput.set(this.currentUserDisplayName());
    this.adminResponderName.set(this.currentUserDisplayName());

    // Listen to query params (e.g. ?filter=question or ?tab=qa)
    this.route.queryParams.subscribe(params => {
      if (params['filter'] === 'question' || params['filter'] === 'questions') {
        this.activeCategoryFilter.set('question');
      } else if (params['filter'] === 'request' || params['filter'] === 'requests') {
        this.activeCategoryFilter.set('request');
      }
    });
  }

  // --- Add New Post ---
  async submitNewPost(): Promise<void> {
    const text = this.newPostText().trim();
    if (!text) return;

    const author = this.authorNameInput().trim() || this.currentUserDisplayName();
    await this.qaService.addPost(
      this.newPostCategory(),
      text,
      author,
      this.newPostAnonymous()
    );

    this.newPostText.set('');
    this.isAddOpen.set(false);
    this.triggerToast('تم نشر السؤال / الطلب بنجاح ✅');
  }

  // --- Edit Post ---
  openEditDialog(post: QAPost): void {
    this.editingPost.set(post);
    this.editText.set(post.text);
    this.editAnonymous.set(post.isAnonymous || false);
  }

  async submitEdit(): Promise<void> {
    const post = this.editingPost();
    const text = this.editText().trim();
    if (!post || !text) return;

    await this.qaService.updatePost(post.id, text, this.editAnonymous());
    this.editingPost.set(null);
    this.triggerToast('تم تعديل المنشور بنجاح');
  }

  // --- Delete Post ---
  async deletePost(post: QAPost): Promise<void> {
    if (confirm('هل أنت متأكد من حذف هذه المشاركة؟')) {
      await this.qaService.deletePost(post.id);
      this.triggerToast('تم حذف المشاركة');
    }
  }

  // --- Admin Answer ---
  openAnswerDialog(post: QAPost): void {
    this.answeringPost.set(post);
    this.answerText.set(post.answer || '');
    this.answerAlert.set(post.answerAlert || '');
    this.adminResponderName.set(this.currentUserDisplayName());
  }

  async submitAnswer(): Promise<void> {
    const post = this.answeringPost();
    const answer = this.answerText().trim();
    if (!post || !answer) return;

    await this.qaService.answerPost(
      post.id,
      answer,
      this.adminResponderName().trim() || 'أحمد عرفه',
      this.answerAlert().trim()
    );
    this.answeringPost.set(null);
    this.triggerToast('تم حفظ الرد الإداري بنجاح ✅');
  }

  // --- User Follow-up Inquiry ---
  openFollowUpDialog(post: QAPost): void {
    this.followUpPost.set(post);
    this.followUpText.set(post.followUpText || '');
  }

  async submitFollowUp(): Promise<void> {
    const post = this.followUpPost();
    const text = this.followUpText().trim();
    if (!post || !text) return;

    await this.qaService.addFollowUp(post.id, text);
    this.followUpPost.set(null);
    this.triggerToast('تم إرسال الاستفسار التكميلي بنجاح ✅');
  }

  // --- Admin Follow-up Answer ---
  openFollowUpAnswerDialog(post: QAPost): void {
    this.followUpAnsweringPost.set(post);
    this.followUpAnswerText.set(post.followUpAnswer || '');
  }

  async submitFollowUpAnswer(): Promise<void> {
    const post = this.followUpAnsweringPost();
    const text = this.followUpAnswerText().trim();
    if (!post || !text) return;

    await this.qaService.answerFollowUp(
      post.id,
      text,
      this.adminResponderName().trim() || 'أحمد عرفه'
    );
    this.followUpAnsweringPost.set(null);
    this.triggerToast('تم الرد على الاستفسار التكميلي ✅');
  }

  // --- Upvote / Like ---
  async upvotePost(post: QAPost): Promise<void> {
    await this.qaService.likePost(post.id);
  }

  // --- Toast ---
  triggerToast(msg: string): void {
    this.showToastMsg.set(msg);
    setTimeout(() => {
      if (this.showToastMsg() === msg) {
        this.showToastMsg.set(null);
      }
    }, 3000);
  }
}
