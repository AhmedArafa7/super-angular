/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
if (typeof window !== 'undefined') {
  (() => {
    const coi = {
      shouldRegister: () => true,
      shouldDeregister: () => false,
      quiet: true,
      ...window.coi
    };

    if (coi.shouldRegister() && typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.register('/assets/coi-serviceworker.js').catch(err => {
        console.warn('COI SW registration notice:', err);
      });
    }
  })();
} else {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.status === 0) return response;

          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Embedder-Policy', 'credentialless');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders
          });
        })
        .catch(e => console.error(e))
    );
  });
}
