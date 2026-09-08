'use strict';

(function installModalScrollLock() {
  let locked = false;
  let scrollX = 0;
  let scrollY = 0;
  let previousBodyStyles = null;
  let previousHtmlOverflow = '';

  function hasOpenDialog() {
    return Boolean(document.querySelector('dialog[open]'));
  }

  function lockPage() {
    if (locked) return;

    locked = true;
    scrollX = window.scrollX;
    scrollY = window.scrollY;

    const body = document.body;
    const html = document.documentElement;

    previousBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    previousHtmlOverflow = html.style.overflow;

    html.classList.add('modal-scroll-locked');
    body.classList.add('modal-scroll-locked');

    html.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = `-${scrollX}px`;
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  function unlockPage() {
    if (!locked) return;

    locked = false;
    const body = document.body;
    const html = document.documentElement;

    html.classList.remove('modal-scroll-locked');
    body.classList.remove('modal-scroll-locked');

    html.style.overflow = previousHtmlOverflow;

    if (previousBodyStyles) {
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      body.style.overflow = previousBodyStyles.overflow;
    }

    window.scrollTo(scrollX, scrollY);
    previousBodyStyles = null;
  }

  function syncLock() {
    if (hasOpenDialog()) lockPage();
    else unlockPage();
  }

  const observer = new MutationObserver(syncLock);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open'],
  });

  document.addEventListener('close', () => requestAnimationFrame(syncLock), true);
  document.addEventListener('cancel', () => requestAnimationFrame(syncLock), true);
  window.addEventListener('pageshow', syncLock);

  syncLock();
})();
