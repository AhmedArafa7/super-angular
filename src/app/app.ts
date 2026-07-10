import { Component, inject, Inject, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { RouterOutlet } from '@angular/router';
import { SyncService } from './core/services/sync.service';
import { GlobalVideoPlayerComponent } from './features/wetube/components/global-video-player/global-video-player.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LightboxComponent } from './shared/components/lightbox/lightbox.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalVideoPlayerComponent, ToastComponent, LightboxComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  private syncService = inject(SyncService);
  private router = inject(Router);
  private document = inject(DOCUMENT);

  private readonly SINEURO_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧠</text></svg>';
  private readonly BAKERY_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🥐</text></svg>';

  ngOnInit() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      if (event.urlAfterRedirects.includes('/bakery')) {
        this.setFavicon(this.BAKERY_FAVICON);
      } else {
        this.setFavicon(this.SINEURO_FAVICON);
      }
    });
  }

  private setFavicon(iconUrl: string) {
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel*='icon']");
    if (!link) {
      link = this.document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'icon';
      this.document.head.appendChild(link);
    }
    link.href = iconUrl;
  }
}
