'use strict';

(function stabilizeCurrentFrontViewport() {
  const frontList = document.getElementById('currentFrontMembers');
  const homeRoute = document.getElementById('homeRoute');
  const appView = document.getElementById('appView');
  if (!frontList) return;

  let frame = 0;
  let settleFrame = 0;
  let retryTimer = 0;

  function isVisibleForMeasurement() {
    if (appView?.hidden || homeRoute?.hidden) return false;
    return frontList.getClientRects().length > 0 && frontList.getBoundingClientRect().width > 0;
  }

  function clearLimit() {
    frontList.style.removeProperty('--front-list-limit');
  }

  function applyMeasuredLimit() {
    const cards = [...frontList.querySelectorAll('.front-person')];

    if (cards.length <= 3) {
      delete frontList.dataset.frontScroll;
      clearLimit();
      frontList.scrollTop = 0;
      return;
    }

    frontList.dataset.frontScroll = 'true';

    // Never measure a hidden route. Hidden elements report zero-sized rects,
    // which was the source of the occasional collapsed Current Front viewport.
    if (!isVisibleForMeasurement()) {
      clearLimit();
      return;
    }

    const firstThree = cards.slice(0, 3);
    const heights = firstThree.map(card => card.getBoundingClientRect().height);

    if (heights.some(height => !Number.isFinite(height) || height < 20)) {
      // Give fonts/images one short chance to settle. Do not recursively chase
      // layout changes, because that can create a ResizeObserver-style loop.
      clearTimeout(retryTimer);
      retryTimer = window.setTimeout(scheduleMeasure, 80);
      return;
    }

    const style = getComputedStyle(frontList);
    const rowGap = parseFloat(style.rowGap || style.gap) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const cardsHeight = heights.reduce((total, height) => total + height, 0);
    const limit = Math.ceil(cardsHeight + (rowGap * 2) + paddingTop + paddingBottom);

    if (!Number.isFinite(limit) || limit < 180) {
      clearTimeout(retryTimer);
      retryTimer = window.setTimeout(scheduleMeasure, 80);
      return;
    }

    const nextValue = `${limit}px`;
    if (frontList.style.getPropertyValue('--front-list-limit') !== nextValue) {
      frontList.style.setProperty('--front-list-limit', nextValue);
    }
  }

  function measureAfterLayoutSettles() {
    cancelAnimationFrame(settleFrame);
    settleFrame = requestAnimationFrame(applyMeasuredLimit);
  }

  function scheduleMeasure() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measureAfterLayoutSettles);
  }

  // Only react to events that can genuinely change the list or its visibility.
  // In particular, do NOT observe frontList size changes: changing the max-height
  // ourselves would retrigger that observer and cause layout thrashing/flicker.
  const listObserver = new MutationObserver(scheduleMeasure);
  listObserver.observe(frontList, { childList: true, subtree: true });

  const visibilityObserver = new MutationObserver(scheduleMeasure);
  if (homeRoute) visibilityObserver.observe(homeRoute, { attributes: true, attributeFilter: ['hidden'] });
  if (appView) visibilityObserver.observe(appView, { attributes: true, attributeFilter: ['hidden'] });

  frontList.addEventListener('load', scheduleMeasure, true);
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  window.addEventListener('hashchange', scheduleMeasure, { passive: true });
  window.addEventListener('pageshow', scheduleMeasure, { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleMeasure).catch(() => {});
  }

  scheduleMeasure();
})();
