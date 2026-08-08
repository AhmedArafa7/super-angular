import { Injectable, signal } from '@angular/core';

export interface AlgoliaSearchResult {
  objectID: string;
  title: string;
  author?: string;
  category?: string;
  thumbnail?: string;
  url?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AlgoliaSearchService {
  private appId = '0508K3LII1';
  private searchApiKey = '8fce7f118c59497bfab56cc65087ebc8';
  private indexName = 'halaltube_videos';

  readonly suggestions = signal<AlgoliaSearchResult[]>([]);
  readonly isSearchingAlgolia = signal<boolean>(false);
  readonly algoliaEnabled = signal<boolean>(true);

  // Cost Optimization & Cache Controls
  private searchCache = new Map<string, AlgoliaSearchResult[]>();
  private debounceTimer: any = null;
  private readonly DEBOUNCE_MS = 250; // Delay request until user stops typing
  private readonly MIN_QUERY_LENGTH = 3; // Do not query Algolia for 1-2 character inputs

  constructor() {}

  /**
   * Fast client-side REST query to Algolia Search API for instant auto-complete suggestions
   * Optimized with Debouncing & In-Memory Caching to drastically reduce monthly quota usage!
   */
  async searchAlgolia(query: string): Promise<AlgoliaSearchResult[]> {
    const trimmed = (query || '').trim().toLowerCase();

    // 1. Minimum query length check (Saves ~40% quota on short characters)
    if (!trimmed || trimmed.length < this.MIN_QUERY_LENGTH || !this.algoliaEnabled()) {
      this.suggestions.set([]);
      return [];
    }

    // 2. In-Memory Cache Check (Zero API cost for repeated searches)
    if (this.searchCache.has(trimmed)) {
      const cachedResult = this.searchCache.get(trimmed)!;
      this.suggestions.set(cachedResult);
      return cachedResult;
    }

    // 3. Debounce Timer (Saves ~50% quota on fast typing)
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    return new Promise<AlgoliaSearchResult[]>((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        this.isSearchingAlgolia.set(true);

        try {
          const url = `https://${this.appId}-dsn.algolia.net/1/indexes/${this.indexName}/query`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'X-Algolia-Application-Id': this.appId,
              'X-Algolia-API-Key': this.searchApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: trimmed,
              hitsPerPage: 6,
              attributesToRetrieve: ['title', 'author', 'thumbnail', 'category', 'url', 'objectID']
            })
          });

          if (!response.ok) {
            throw new Error(`Algolia error status: ${response.status}`);
          }

          const data = await response.json();
          const hits: AlgoliaSearchResult[] = (data.hits || []).map((hit: any) => ({
            objectID: hit.objectID || hit.id,
            title: hit.title,
            author: hit.author || hit.channelTitle || '',
            category: hit.category || '',
            thumbnail: hit.thumbnail || `https://img.youtube.com/vi/${hit.objectID}/hqdefault.jpg`,
            url: hit.url || `/stream?v=${hit.objectID}`
          }));

          // Save to local cache
          this.searchCache.set(trimmed, hits);
          this.suggestions.set(hits);
          resolve(hits);
        } catch (error) {
          console.warn('[AlgoliaSearchService] Algolia search failed or index not ready:', error);
          this.suggestions.set([]);
          resolve([]);
        } finally {
          this.isSearchingAlgolia.set(false);
        }
      }, this.DEBOUNCE_MS);
    });
  }

  clearSuggestions() {
    this.suggestions.set([]);
  }
}
