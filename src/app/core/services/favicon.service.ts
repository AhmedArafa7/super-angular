import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class FaviconService {
  private document = inject(DOCUMENT);
  private originalFavicon: string | null = null;
  private originalTitle: string | null = null;
  private originalManifest: string | null = null;
  private originalThemeColor: string | null = null;

  // SVG Data URI of the spray bottle icon matching header logo exactly
  private omAlQuraSvgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="50%" stop-color="#14b8a6"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="16" fill="url(#bgGrad)"/>
  <rect width="60" height="60" x="2" y="2" rx="14" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  <g transform="translate(8, 9) scale(1.4)">
    <path d="M12 9 C12 7 14 6 16 6 C18 6 20 7 20 9 L20 12 L12 12 Z" fill="#67e8f9" opacity="0.95"/>
    <path d="M10 12 L22 12 L24 28 C24 29.5 22.5 30 21 30 L11 30 C9.5 30 8 29.5 8 28 Z" fill="#ffffff" opacity="0.25"/>
    <path d="M10 12 L22 12 L24 28 C24 29.5 22.5 30 21 30 L11 30 C9.5 30 8 29.5 8 28 Z" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 6 L16 2 L20 2" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 4 L8 6 L12 9" stroke="#fef08a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="21" cy="18" r="2.5" fill="#67e8f9" opacity="0.9"/>
    <circle cx="14" cy="22" r="3.5" fill="#fef08a" opacity="0.85"/>
    <circle cx="18" cy="25" r="2" fill="#ffffff" opacity="0.95"/>
    <path d="M26 3 L27 5.5 L29.5 6.5 L27 7.5 L26 10 L25 7.5 L22.5 6.5 L25 5.5 Z" fill="#fef08a"/>
    <path d="M6 14 L6.8 15.8 L8.6 16.6 L6.8 17.4 L6 19.2 L5.2 17.4 L3.4 16.6 L5.2 15.8 Z" fill="#67e8f9"/>
  </g>
</svg>
  `.trim())}`;

  /**
   * Configures complete standalone app identity for Om Al Qura page:
   * Sets app title, dynamic PWA manifest, theme color, favicon, and apple-touch-icon.
   */
  setOmAlQuraIdentity(): void {
    // 1. Save original title, favicon, manifest & theme color
    if (this.originalTitle === null) {
      this.originalTitle = this.document.title;
    }
    
    let manifestLink: HTMLLinkElement | null = this.document.querySelector("link[rel='manifest']");
    if (this.originalManifest === null && manifestLink) {
      this.originalManifest = manifestLink.getAttribute('href') || 'manifest.webmanifest';
    }

    let themeMeta: HTMLMetaElement | null = this.document.querySelector("meta[name='theme-color']");
    if (this.originalThemeColor === null && themeMeta) {
      this.originalThemeColor = themeMeta.getAttribute('content') || '#1976d2';
    }

    let iconLink: HTMLLinkElement | null = this.document.querySelector("link[rel*='icon']");
    if (this.originalFavicon === null && iconLink) {
      this.originalFavicon = iconLink.getAttribute('href') || '/favicon.ico';
    }

    // 2. Set standalone Om Al Qura Title & Brand Name
    this.document.title = 'متجر أم القرى';

    // 3. Update PWA Web Manifest to Om Al Qura Standalone Manifest
    if (!manifestLink) {
      manifestLink = this.document.createElement('link');
      manifestLink.rel = 'manifest';
      this.document.head.appendChild(manifestLink);
    }
    manifestLink.setAttribute('href', 'om-al-qura.webmanifest');

    // 4. Update Theme Color
    if (!themeMeta) {
      themeMeta = this.document.createElement('meta');
      themeMeta.name = 'theme-color';
      this.document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', '#064e3b');

    // 5. Update Favicon & Apple Touch Icon
    if (!iconLink) {
      iconLink = this.document.createElement('link');
      iconLink.rel = 'icon';
      this.document.head.appendChild(iconLink);
    }
    iconLink.setAttribute('href', this.omAlQuraSvgDataUri);
    iconLink.setAttribute('type', 'image/svg+xml');

    let appleIconLink: HTMLLinkElement | null = this.document.querySelector("link[rel='apple-touch-icon']");
    if (!appleIconLink) {
      appleIconLink = this.document.createElement('link');
      appleIconLink.rel = 'apple-touch-icon';
      this.document.head.appendChild(appleIconLink);
    }
    appleIconLink.setAttribute('href', 'assets/icons/om-al-qura-favicon.svg');
  }

  /**
   * Sets custom favicon
   */
  setFavicon(iconUrl: string): void {
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel*='icon']");
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'icon';
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', iconUrl);
  }

  /**
   * Alias for setOmAlQuraIdentity
   */
  setOmAlQuraFavicon(): void {
    this.setOmAlQuraIdentity();
  }

  /**
   * Restores the default application identity and manifest when leaving the page.
   */
  restoreDefaultIdentity(): void {
    if (this.originalTitle !== null) {
      this.document.title = this.originalTitle;
    }

    if (this.originalManifest !== null) {
      let manifestLink: HTMLLinkElement | null = this.document.querySelector("link[rel='manifest']");
      if (manifestLink) {
        manifestLink.setAttribute('href', this.originalManifest);
      }
    }

    if (this.originalThemeColor !== null) {
      let themeMeta: HTMLMetaElement | null = this.document.querySelector("meta[name='theme-color']");
      if (themeMeta) {
        themeMeta.setAttribute('content', this.originalThemeColor);
      }
    }

    if (this.originalFavicon !== null) {
      let link: HTMLLinkElement | null = this.document.querySelector("link[rel*='icon']");
      if (link) {
        link.setAttribute('href', this.originalFavicon);
        link.setAttribute('type', 'image/x-icon');
      }
    }
  }

  restoreDefaultFavicon(): void {
    this.restoreDefaultIdentity();
  }
}
