'use strict';

(function stabilizeMemberFeatureReview() {
  const oldList = document.querySelector('#memberReviewList');
  if (oldList) {
    const cleanList = oldList.cloneNode(false);
    oldList.replaceWith(cleanList);
  }

  const form = document.querySelector('#memberForm');
  form?.addEventListener('submit', () => {
    const list = document.querySelector('#memberReviewList');
    if (list) list.dataset.featuresAdded = 'false';
  });

  function ensureStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  }

  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    document.body.append(script);
  }

  ensureStylesheet('assets/css/history-behavior.css?v=1');
  ensureStylesheet('assets/css/member-editor-v2.css?v=1');
  ensureStylesheet('assets/css/groups-route.css?v=1');
  loadScript('assets/js/history-behavior.js?v=1');
  loadScript('assets/js/member-editor-v2.js?v=1');
  loadScript('assets/js/groups-route.js?v=1');
})();
