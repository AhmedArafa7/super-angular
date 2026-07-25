import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LucideAngularModule, Bell, Plus, Search, Mic, Menu, MicOff } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { FirebaseService } from '../../../../core/services/firebase.service';

@Component({
  selector: 'app-wetube-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  templateUrl: './wetube-topbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeTubeTopbarComponent {
  searchQuery = signal('');
  isListening = signal(false);
  wetube = inject(WeTubeService);
  firebase = inject(FirebaseService);
  router = inject(Router);

  // Icons
  Bell = Bell;
  Plus = Plus;
  Search = Search;
  Mic = Mic;
  MicOff = MicOff;
  Menu = Menu;

  get userPhoto(): string {
    const user = this.firebase.currentUser();
    return user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=4f46e5&color=fff`;
  }

  onSearch() {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.wetube.search(q);
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
    this.wetube.setSearchQuery('');
    this.wetube.setActiveCategory('الكل');
    this.wetube.setActiveTab('home');
    this.router.navigate(['/stream']);
  }
}
