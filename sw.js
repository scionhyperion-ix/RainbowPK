'use strict';

const CACHE_NAME = 'rainbow-shell-v17';
const APP_SHELL = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/css/enhancements.css',
  './assets/css/themes.css',
  './assets/css/site-features.css?v=1',
  './assets/css/history-behavior.css?v=1',
  './assets/css/member-editor-v2.css?v=1',
  './assets/css/groups-route.css?v=1',
  './assets/css/groups-members-access.css?v=2',
  './assets/css/guide-popovers.css?v=3',
  './assets/css/member-view-menu.css?v=1',
  './assets/css/modal-scroll-lock.css?v=1',
  './assets/css/mobile.css',
  './assets/css/mobile-front-timers.css?v=2',
  './assets/css/mobile-system-summary.css?v=3',
  './assets/css/member-sort.css',
  './assets/css/mobile-members.css?v=1',
  './assets/css/mobile-member-editor.css?v=3',
  './assets/css/mobile-member-tabs-placement.css?v=1',
  './assets/css/pwa-widget.css?v=1',
  './assets/css/native-app.css?v=1',
  './assets/css/restore-loading.css',
  './assets/css/top-fronter.css',
  './assets/js/app.js',
  './assets/js/enhancements.js',
  './assets/js/member-sort.js',
  './assets/js/top-fronter.js',
  './assets/js/themes.js',
  './assets/js/site-features.js?v=1',
  './assets/js/site-features-runtime.js?v=1',
  './assets/js/history-behavior.js?v=1',
  './assets/js/member-editor-v2.js?v=1',
  './assets/js/groups-route.js?v=1',
  './assets/js/groups-route-runtime.js?v=1',
  './assets/js/groups-members-access.js?v=2',
  './assets/js/guide-popovers.js?v=3',
  './assets/js/member-view-menu.js?v=1',
  './assets/js/modal-scroll-lock.js?v=1',
  './assets/js/mobile-member-editor-tabs.js?v=2',
  './assets/js/pwa-widget.js?v=1',
  './assets/js/native-app.js?v=1',
  './assets/images/rainbowpk.png',
  './assets/images/site-icon.png',
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
