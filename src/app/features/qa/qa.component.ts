import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { QAService, QAPost, QACategory } from '../../core/qa.service';

@Component({
  selector: 'app-qa',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './qa.component.html',
  styleUrls: ['./qa.component.scss']
})
export class QAComponent {
  qaService = inject(QAService);

  // States
  searchQuery = signal<string>('');
  activeCategoryFilter = signal<'all' | 'question' | 'request'>('all');
  activeStatusFilter = signal<'all' | 'answered' | 'pending'>('all');

  // Input bindings
  authorName = signal<string>('أحمد عرفة');
  newPostText = signal<string>('');
  newPostCategory = signal<QACategory>('question');
  newPostAnonymous = signal<boolean>(false);

  // Modal open states
  isAddOpen = signal<boolean>(false);
  
  // Edit dialog state
  editingPost = signal<QAPost | null>(null);
  editText = signal<string>('');
  editAnonymous = signal<boolean>(false);

  // Admin answer dialog state
  answeringPost = signal<QAPost | null>(null);
  answerText = signal<string>('');
  answerAlert = signal<string>('');
  adminResponderName = signal<string>('مطور النظام');

  // Follow-up dialog state
  followUpPost = signal<QAPost | null>(null);
  followUpText = signal<string>('');

  // Follow-up answer dialog state
  followUpAnsweringPost = signal<QAPost | null>(null);
  followUpAnswerText = signal<string>('');

  // Computed filtered list
  filteredPosts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.activeCategoryFilter();
    const stat = this.activeStatusFilter();
    let list = this.qaService.posts();

    // 1. Text filter
    if (query) {
      list = list.filter(p => 
        p.text.toLowerCase().includes(query) ||
        p.authorName.toLowerCase().includes(query) ||
        (p.answer && p.answer.toLowerCase().includes(query))
      );
    }

    // 2. Category filter
    if (cat !== 'all') {
      list = list.filter(p => p.category === cat);
    }

    // 3. Status filter
    if (stat === 'answered') {
      list = list.filter(p => !!p.answer);
    } else if (stat === 'pending') {
      list = list.filter(p => !p.answer);
    }

    // Sort by likes, then by createdAt desc
    return [...list].sort((a, b) => b.likes - a.likes || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // Action handlers
  submitNewPost(): void {
    if (!this.newPostText().trim()) return;
    
    this.qaService.addPost(
      this.newPostCategory(),
      this.newPostText().trim(),
      this.authorName().trim(),
      this.newPostAnonymous()
    );

    // Reset fields & close
    this.newPostText.set('');
    this.newPostAnonymous.set(false);
    this.isAddOpen.set(false);
  }

  // Like/Upvote post
  upvotePost(post: QAPost): void {
    this.qaService.likePost(post.id);
  }

  // Edit triggers
  openEditDialog(post: QAPost): void {
    this.editingPost.set(post);
    this.editText.set(post.text);
    this.editAnonymous.set(post.isAnonymous || false);
  }

  submitEdit(): void {
    const post = this.editingPost();
    if (!post || !this.editText().trim()) return;

    this.qaService.updatePost(post.id, this.editText().trim(), this.editAnonymous());
    this.editingPost.set(null);
  }

  deletePost(post: QAPost): void {
    if (confirm("هل أنت متأكد من حذف هذه المشاركة؟")) {
      this.qaService.deletePost(post.id);
    }
  }

  // Answer triggers (Admin Mode)
  openAnswerDialog(post: QAPost): void {
    this.answeringPost.set(post);
    this.answerText.set(post.answer || '');
    this.answerAlert.set(post.answerAlert || '');
  }

  submitAnswer(): void {
    const post = this.answeringPost();
    if (!post || !this.answerText().trim()) return;

    this.qaService.answerPost(
      post.id,
      this.answerText().trim(),
      this.adminResponderName().trim(),
      this.answerAlert().trim()
    );
    this.answeringPost.set(null);
  }

  // User Follow-up triggers
  openFollowUpDialog(post: QAPost): void {
    this.followUpPost.set(post);
    this.followUpText.set('');
  }

  submitFollowUp(): void {
    const post = this.followUpPost();
    if (!post || !this.followUpText().trim()) return;

    this.qaService.addFollowUp(post.id, this.followUpText().trim());
    this.followUpPost.set(null);
  }

  // Admin Answer Follow-up triggers
  openFollowUpAnswerDialog(post: QAPost): void {
    this.followUpAnsweringPost.set(post);
    this.followUpAnswerText.set('');
  }

  submitFollowUpAnswer(): void {
    const post = this.followUpAnsweringPost();
    if (!post || !this.followUpAnswerText().trim()) return;

    this.qaService.answerFollowUp(
      post.id,
      this.followUpAnswerText().trim(),
      this.adminResponderName().trim()
    );
    this.followUpAnsweringPost.set(null);
  }

  // Helper date parsing
  getRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  }
}
