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
    const primaryProxy = `${this.baseUrl}/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const fallbackProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

    return this.http.get(primaryProxy, {
      responseType: 'text',
      observe: 'body'
    }).pipe(
      catchError(() => {
        // If primary proxy fails or times out, seamlessly try fallback proxy
        return this.http.get(fallbackProxy, {
          responseType: 'text',
          observe: 'body'
        }).pipe(
          catchError(() => of(''))
        );
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
      let startIndex = html.indexOf(`var ${variableName} = `);
      let patternLen = `var ${variableName} = `.length;
      if (startIndex === -1) {
        startIndex = html.indexOf(`${variableName} = `);
        patternLen = `${variableName} = `.length;
      }
      if (startIndex === -1) return null;

      const jsonStart = html.indexOf('{', startIndex + patternLen);
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
