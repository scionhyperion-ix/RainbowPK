'use strict';

const CACHE_NAME = 'rainbow-shell-v3';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './enhancements.css',
  './themes.css',
  './mobile.css',
  './mobile-front-timers.css',
  './mobile-system-summary.css',
  './assets/css/member-sort.css',
  './assets/css/mobile-members.css',
  './assets/css/mobile-member-editor.css',
  './assets/css/mobile-member-tabs-placement.css',
  './assets/css/pwa-widget.css',
  './assets/css/restore-loading.css',
  './assets/css/top-fronter.css',
  './app.js',
  './enhancements.js',
  './member-sort.js',
  './top-fronter.js',
  './themes.js',
  './assets/js/mobile-member-editor-tabs.js',
  './assets/js/pwa-widget.js',
  './rainbowpk.png',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
        return caches.match(request);
      })
  );
});
