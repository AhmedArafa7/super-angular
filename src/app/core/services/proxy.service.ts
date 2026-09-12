import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProxyService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiBaseUrl;

  fetch(targetUrl: string, options?: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: any;
  }): Observable<string> {
    const proxyUrl = `${this.baseUrl}/api/proxy?url=${encodeURIComponent(targetUrl)}`;

    const headers = new HttpHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'X-Silent-Error': 'true',
      ...(options?.headers || {})
    });

    return this.http.get(proxyUrl, {
      headers,
      responseType: 'text',
      observe: 'body'
    }).pipe(
      catchError(() => {
        return of('');
      })
    );
  }

  fetchJSON<T = any>(targetUrl: string): Observable<T | null> {
    return this.fetch(targetUrl).pipe(
      map(html => this.extractJSONFromHTML(html, 'ytInitialData') as T)
    );
  }

  private extractJSONFromHTML(html: string, variableName: string): any {
    try {
      const pattern = `var ${variableName} = `;
      const startIndex = html.indexOf(pattern);
      if (startIndex === -1) return null;

      const jsonStart = html.indexOf('{', startIndex + pattern.length);
      if (jsonStart === -1) return null;

      let braceCount = 0;
      let inString = false;
      let escape = false;

      for (let i = jsonStart; i < html.length; i++) {
        const char = html[i];

        if (escape) {
          escape = false;
          continue;
        }

        if (char === '\\') {
          escape = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              const jsonString = html.substring(jsonStart, i + 1);
              return JSON.parse(jsonString);
            }
          }
        }
      }
      return null;
    } catch (e) {
      console.error(`[ProxyService] Error parsing ${variableName}`, e);
      return null;
    }
  }
}
