// CREATOR WORKSPACE Service Worker
// Network-first HTML, cache only static shell.
// Supabase/API responses are not cached.

const CACHE = 'creator-shell-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (!/\.(png|webmanifest)$/.test(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) {
        await cache.put(event.request, response.clone());
      }
      return response;
    })
  );
});

// Receive Web Push notifications.
self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      title: 'CREATOR WORKSPACE',
      body: event.data ? event.data.text() : '新しい通知があります。'
    };
  }

  const title = String(payload.title || 'CREATOR WORKSPACE');

  const options = {
    body: String(payload.body || '制作予定が更新されました。'),
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: String(payload.tag || 'creator-workspace'),
    data: {
      url: typeof payload.url === 'string' ? payload.url : './'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Open CREATOR WORKSPACE when a notification is tapped.
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const destination = new URL(
    event.notification.data?.url || './',
    self.registration.scope
  );

  const scope = new URL(self.registration.scope);

  // Allow navigation only inside this application.
  if (
    destination.origin !== scope.origin ||
    !destination.pathname.startsWith(scope.pathname)
  ) return;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const windowClient of windows) {
      if (windowClient.url === destination.href) {
        await windowClient.focus();
        return;
      }
    }

    await clients.openWindow(destination.href);
  })());
});
