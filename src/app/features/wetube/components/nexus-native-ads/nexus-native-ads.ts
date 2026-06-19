import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ExternalLink } from 'lucide-angular';

@Component({
  selector: 'app-nexus-native-ads',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './nexus-native-ads.html',
  styleUrls: ['./nexus-native-ads.scss']
})
export class NexusNativeAdsComponent {
  @Input() adSlot: string = 'default';
  @Input() category: string = '';
  
  ExternalLink = ExternalLink;
  
  ads = [
    { id: 1, title: 'تعلم Angular مع أفضل الكورسات', description: 'دورة شاملة تغطي كل ما تحتاجه', image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=400', cta: 'سجل الآن', url: '#' },
    { id: 2, title: 'أجهزة لابتوب احترافية', description: 'خصم 30% على أحدث الموديلات', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=400', cta: 'تسوق', url: '#' },
    { id: 3, title: 'استضافة مواقع موثوقة', description: 'سرعة فائقة ودعم فني 24/7', image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400', cta: 'ابدأ الآن', url: '#' }
  ];
  
  get currentAd() {
    const slot = this.adSlot.charCodeAt(0) % this.ads.length;
    return this.ads[slot];
  }
}
