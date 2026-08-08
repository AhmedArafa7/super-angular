import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, Bell, Plus, Search, Mic, Menu, MicOff, Sparkles, Play } from 'lucide-angular';
import { halaltubeService } from '../../halaltube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { AlgoliaSearchService, AlgoliaSearchResult } from '../../../../core/services/algolia-search.service';

@Component({
  selector: 'app-halaltube-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './halaltube-topbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class halaltubeTopbarComponent {
  searchQuery = signal('');
  isListening = signal(false);
  showSuggestions = signal(false);
  
  halaltube = inject(halaltubeService);
  firebase = inject(FirebaseService);
  algolia = inject(AlgoliaSearchService);
  router = inject(Router);

  // Icons
  Bell = Bell;
  Plus = Plus;
  Search = Search;
  Mic = Mic;
  MicOff = MicOff;
  Menu = Menu;
  Sparkles = Sparkles;
  Play = Play;

  get userPhoto(): string {
    const user = this.firebase.currentUser();
    return user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=4f46e5&color=fff`;
  }

  onInputChange(query: string) {
    this.searchQuery.set(query);
    if (query.trim().length > 1) {
      this.algolia.searchAlgolia(query);
      this.showSuggestions.set(true);
    } else {
      this.algolia.clearSuggestions();
      this.showSuggestions.set(false);
    }
  }

  selectSuggestion(item: AlgoliaSearchResult) {
    this.showSuggestions.set(false);
    if (item.url && item.url.includes('?v=')) {
      const vidId = item.url.split('?v=')[1];
      this.router.navigate(['/stream/watch', vidId]);
    } else {
      this.searchQuery.set(item.title);
      this.onSearch();
    }
  }

  onSearch() {
    this.showSuggestions.set(false);
    const q = this.searchQuery().trim();
    if (!q) return;
    this.halaltube.search(q);
    this.router.navigate(['/stream']);
  }

  startVoiceSearch() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('البحث الصوتي غير مدعوم في متصفحك الحالي.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.interimResults = false;
      this.isListening.set(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          this.searchQuery.set(transcript);
          this.onSearch();
        }
        this.isListening.set(false);
      };

      recognition.onerror = () => {
        this.isListening.set(false);
      };

      recognition.onend = () => {
        this.isListening.set(false);
      };

      recognition.start();
    } catch (e) {
      this.isListening.set(false);
    }
  }

  onLogoClick(): void {
    this.searchQuery.set('');
    this.halaltube.setSearchQuery('');
    this.halaltube.setActiveCategory('الكل');
    this.halaltube.setActiveTab('home');
    this.router.navigate(['/stream']);
  }
}
