'use strict';

(function stabilizeCurrentFrontViewport() {
  const frontList = document.getElementById('currentFrontMembers');
  const homeRoute = document.getElementById('homeRoute');
  const appView = document.getElementById('appView');
  if (!frontList) return;

  let frame = 0;
  let secondFrame = 0;

  function isVisibleForMeasurement() {
    if (appView?.hidden || homeRoute?.hidden) return false;
    return frontList.getClientRects().length > 0 && frontList.getBoundingClientRect().width > 0;
  }

  function clearBadLimit() {
    frontList.style.removeProperty('--front-list-limit');
  }

  function measureVisibleCards() {
    const cards = [...frontList.querySelectorAll('.front-person')];

    if (cards.length <= 3) {
      delete frontList.dataset.frontScroll;
      clearBadLimit();
      frontList.scrollTop = 0;
      return;
    }

    frontList.dataset.frontScroll = 'true';

    // Hidden routes have zero-sized card rects. Never turn those values into a
    // persistent scroll limit. The route/app observers below will retry once
    // Home becomes visible again.
    if (!isVisibleForMeasurement()) {
      clearBadLimit();
      return;
    }

    // Remove any stale limit first. This lets the first three cards settle at
    // their natural height before we measure them again.
    clearBadLimit();

    cancelAnimationFrame(secondFrame);
    secondFrame = requestAnimationFrame(() => {
      if (!isVisibleForMeasurement()) return;

      const currentCards = [...frontList.querySelectorAll('.front-person')].slice(0, 3);
      if (currentCards.length < 3) return;

      const heights = currentCards.map(card => card.getBoundingClientRect().height);
      if (heights.some(height => !Number.isFinite(height) || height < 20)) {
        // Images/fonts/layout may still be settling. Retry on the next frame
        // instead of committing a collapsed viewport.
        scheduleMeasure();
        return;
      }

      const style = getComputedStyle(frontList);
      const rowGap = parseFloat(style.rowGap || style.gap) || 0;
      const paddingTop = parseFloat(style.paddingTop) || 0;
      const paddingBottom = parseFloat(style.paddingBottom) || 0;
      const cardsHeight = heights.reduce((total, height) => total + height, 0);
      const limit = Math.ceil(cardsHeight + (rowGap * 2) + paddingTop + paddingBottom);

      // A three-card viewport should never plausibly be tiny. This guard also
      // protects against transient zero/partial layouts from browser timing.
      if (!Number.isFinite(limit) || limit < 180) {
        scheduleMeasure();
        return;
      }

      const nextValue = `${limit}px`;
      if (frontList.style.getPropertyValue('--front-list-limit') !== nextValue) {
        frontList.style.setProperty('--front-list-limit', nextValue);
      }
    });
  }

  function scheduleMeasure() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measureVisibleCards);
  }

  const listObserver = new MutationObserver(scheduleMeasure);
  listObserver.observe(frontList, { childList: true, subtree: true });

  const visibilityObserver = new MutationObserver(scheduleMeasure);
  if (homeRoute) visibilityObserver.observe(homeRoute, { attributes: true, attributeFilter: ['hidden'] });
  if (appView) visibilityObserver.observe(appView, { attributes: true, attributeFilter: ['hidden'] });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => scheduleMeasure());
    resizeObserver.observe(frontList);
  }

  frontList.addEventListener('load', scheduleMeasure, true);
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('hashchange', scheduleMeasure, { passive: true });
  window.addEventListener('pageshow', scheduleMeasure, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleMeasure).catch(() => {});
  }

  scheduleMeasure();
})();
