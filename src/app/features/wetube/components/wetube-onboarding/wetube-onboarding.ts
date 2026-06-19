import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Search, Sparkles, TrendingUp, Music, Gamepad2, Code, Newspaper, ChefHat, Trophy, Lightbulb } from 'lucide-angular';
import { WeTubeService } from '../../wetube.service';
import { FirebaseService, UserData } from '../../../../core/services/firebase.service';

interface SuggestedTopic {
  id: string;
  label: string;
  icon: any;
  query: string;
}

@Component({
  selector: 'app-wetube-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './wetube-onboarding.html',
  styleUrls: ['./wetube-onboarding.scss']
})
export class WeTubeOnboardingComponent implements OnInit {
  wetube = inject(WeTubeService);
  firebaseService = inject(FirebaseService);
  router = inject(Router);

  Search = Search;
  Sparkles = Sparkles;
  TrendingUp = TrendingUp;

  currentStep = signal<number>(1);
  searchInput = signal<string>('');
  selectedInterests = signal<string[]>([]);
  searchResultsPreview = signal<any[]>([]);
  isSearching = signal<boolean>(false);

  suggestedTopics: SuggestedTopic[] = [
    { id: 'tech', label: 'تكنولوجيا وبرمجة', icon: Code, query: 'الذكاء الاصطناعي' },
    { id: 'gaming', label: 'ألعاب فيديو', icon: Gamepad2, query: 'ألعاب' },
    { id: 'music', label: 'موسيقى وفن', icon: Music, query: 'موسيقى عربية' },
    { id: 'news', label: 'أخبار', icon: Newspaper, query: 'أخبار التكنولوجيا' },
    { id: 'cooking', label: 'طبخ ووصفات', icon: ChefHat, query: 'طبخ' },
    { id: 'sports', label: 'رياضة', icon: Trophy, query: 'كرة القدم' },
    { id: 'learning', label: 'تعليم ومعرفة', icon: Lightbulb, query: 'تعلم' },
  ];

  canContinue = computed(() => this.selectedInterests().length >= 2 || this.searchInput().length > 0);

  ngOnInit() {
    const userData = this.firebaseService.userData();
    if (userData?.onboardingComplete) {
      this.router.navigate(['/stream']);
    }
  }

  toggleInterest(topic: SuggestedTopic) {
    const current = this.selectedInterests();
    if (current.includes(topic.id)) {
      this.selectedInterests.set(current.filter(t => t !== topic.id));
    } else {
      this.selectedInterests.set([...current, topic.id]);
    }
  }

  isSelected(topicId: string): boolean {
    return this.selectedInterests().includes(topicId);
  }

  nextStep() {
    if (this.currentStep() === 1) {
      this.currentStep.set(2);
    } else {
      this.finishOnboarding();
    }
  }

  prevStep() {
    if (this.currentStep() === 2) {
      this.currentStep.set(1);
    }
  }

  async searchAndPreview() {
    const query = this.searchInput().trim();
    if (!query) return;

    this.isSearching.set(true);
    try {
      await this.wetube.search(query);
      this.searchResultsPreview.set(this.wetube.searchResults().slice(0, 3));
    } finally {
      this.isSearching.set(false);
    }
  }

  async finishOnboarding() {
    const userId = this.firebaseService.getUserId();
    if (!userId) return;

    const interests = [
      ...this.selectedInterests().map(id => {
        const topic = this.suggestedTopics.find(t => t.id === id);
        return topic?.query || id;
      }),
      this.searchInput().trim()
    ].filter(Boolean);

    const allSearches = interests.join(', ');

    try {
      const { doc, updateDoc, getFirestore } = await import('firebase/firestore');
      const firestore = getFirestore();
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        interests,
        onboardingComplete: true,
        searchHistory: [allSearches],
        onboardingCompletedAt: Date.now()
      });

      this.firebaseService.userData.update((u: UserData | null) => u ? { ...u, interests, onboardingComplete: true } : u);

      this.router.navigate(['/stream']);
    } catch (err) {
      console.error('[Onboarding] Failed to save:', err);
    }
  }
}
