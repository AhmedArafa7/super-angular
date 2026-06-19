import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';

export type ConsentStatus = 'none' | 'agreed' | 'declined';

@Component({
  selector: 'app-privacy-consent',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon],
  templateUrl: './privacy.html',
  styleUrls: ['./privacy.scss']
})
export class PrivacyConsentComponent implements OnInit {
  isOpen = signal<boolean>(false);
  pendingChoice = signal<ConsentStatus | null>(null);
  verificationText = signal<string>('');
  isUpdating = signal<boolean>(false);

  requiredAgreeText = 'أوافق على الشروط';
  requiredDeclineText = 'أرفض المشاركة';

  ngOnInit(): void {
    const consent = localStorage.getItem('Si-Neuro-data-consent-v1');
    if (!consent) {
      this.isOpen.set(true);
    }
  }

  setChoice(choice: ConsentStatus): void {
    this.pendingChoice.set(choice);
    this.verificationText.set('');
  }

  handleFinalize(): void {
    const choice = this.pendingChoice();
    if (!choice) return;

    const isValid = choice === 'agreed'
      ? this.verificationText().trim() === this.requiredAgreeText
      : this.verificationText().trim() === this.requiredDeclineText;

    if (!isValid) return;

    this.isUpdating.set(true);
    setTimeout(() => {
      localStorage.setItem('Si-Neuro-data-consent-v1', choice);
      this.isOpen.set(false);
      this.isUpdating.set(false);
    }, 800);
  }

  resetChoice(): void {
    this.pendingChoice.set(null);
    this.verificationText.set('');
  }
}
