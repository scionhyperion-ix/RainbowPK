'use strict';

(function installRainbowGuidePopovers() {
  let nextGuideId = 1;

  const targets = [
    { selector: '#frontTimingNote', label: 'Front timing information', kind: 'front-timing' },
    { selector: '.member-preview-hint', label: 'Image link help', kind: 'member-images' },
  ];

  function isFinePointer() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function closeAll(except = null) {
    document.querySelectorAll('.guide-popover[data-open="true"]').forEach(wrapper => {
      if (wrapper === except) return;
      wrapper.dataset.open = 'false';
      wrapper.querySelector('.guide-popover-button')?.setAttribute('aria-expanded', 'false');
    });
  }

  function syncWrapperVisibility(wrapper, content) {
    wrapper.hidden = Boolean(content.hidden);
    if (wrapper.hidden) {
      wrapper.dataset.open = 'false';
      wrapper.querySelector('.guide-popover-button')?.setAttribute('aria-expanded', 'false');
    }
  }

  function placeFrontTimingGuide(wrapper) {
    const heading = document.querySelector('.current-front-panel .panel-heading');
    const timer = document.getElementById('frontDuration');
    if (!heading || !timer) return;

    let tools = heading.querySelector('.current-front-heading-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.className = 'current-front-heading-tools';
      heading.append(tools);
    }

    if (timer.parentElement !== tools) tools.append(timer);
    tools.insertBefore(wrapper, timer);
  }

  function positionGuide(wrapper) {
    if (!wrapper || wrapper.hidden) return;

    const button = wrapper.querySelector('.guide-popover-button');
    const content = wrapper.querySelector('.guide-popover-content');
    if (!button || !content) return;

    const margin = 10;
    const gap = 9;
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const buttonRect = button.getBoundingClientRect();
    const popupRect = content.getBoundingClientRect();
    const popupWidth = Math.min(popupRect.width || 360, viewportWidth - margin * 2);
    const popupHeight = popupRect.height || 80;
    const frontTiming = wrapper.classList.contains('guide-popover-front-timing');

    const preferredLeft = frontTiming
      ? buttonRect.right - popupWidth
      : buttonRect.left;
    const left = clamp(preferredLeft, margin, viewportWidth - popupWidth - margin);

    let placement = frontTiming ? 'below' : 'above';
    let top = placement === 'below'
      ? buttonRect.bottom + gap
      : buttonRect.top - popupHeight - gap;

    if (placement === 'below' && top + popupHeight > viewportHeight - margin) {
      const above = buttonRect.top - popupHeight - gap;
      if (above >= margin) {
        placement = 'above';
        top = above;
      }
    } else if (placement === 'above' && top < margin) {
      const below = buttonRect.bottom + gap;
      if (below + popupHeight <= viewportHeight - margin) {
        placement = 'below';
        top = below;
      }
    }

    top = clamp(top, margin, viewportHeight - popupHeight - margin);

    const arrowCenter = buttonRect.left + buttonRect.width / 2 - left;
    const arrowLeft = clamp(arrowCenter - 4.5, 9, popupWidth - 18);

    wrapper.dataset.placement = placement;
    wrapper.style.setProperty('--guide-left', `${Math.round(left)}px`);
    wrapper.style.setProperty('--guide-top', `${Math.round(top)}px`);
    wrapper.style.setProperty('--guide-arrow-left', `${Math.round(arrowLeft)}px`);
    wrapper.style.setProperty('--guide-enter-y', placement === 'below' ? '-4px' : '4px');
    wrapper.style.setProperty('--guide-origin', placement === 'below' ? 'center top' : 'center bottom');
  }

  function enhanceGuide(content, config) {
    if (!content || content.dataset.guidePopoverReady === 'true') return;
    content.dataset.guidePopoverReady = 'true';

    const wrapper = document.createElement('span');
    wrapper.className = `guide-popover guide-popover-${config.kind}`;
    wrapper.dataset.open = 'false';
    wrapper.dataset.placement = config.kind === 'front-timing' ? 'below' : 'above';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guide-popover-button';
    button.setAttribute('aria-label', config.label);
    button.setAttribute('aria-expanded', 'false');
    button.textContent = 'i';

    const popupId = `rainbowGuidePopover${nextGuideId++}`;
    content.id = content.id || popupId;
    if (!content.id.startsWith('rainbowGuidePopover')) {
      content.dataset.guidePopupId = popupId;
      content.setAttribute('aria-label', config.label);
    }
    content.classList.add('guide-popover-content');
    content.setAttribute('role', 'tooltip');
    button.setAttribute('aria-controls', content.id);

    const parent = content.parentNode;
    parent.insertBefore(wrapper, content);
    wrapper.append(button, content);

    if (config.kind === 'front-timing') placeFrontTimingGuide(wrapper);

    const hiddenObserver = new MutationObserver(() => syncWrapperVisibility(wrapper, content));
    hiddenObserver.observe(content, { attributes: true, attributeFilter: ['hidden'] });
    syncWrapperVisibility(wrapper, content);

    wrapper.addEventListener('pointerenter', () => {
      if (isFinePointer()) positionGuide(wrapper);
    });

    button.addEventListener('click', event => {
      if (isFinePointer()) return;
      event.preventDefault();
      const opening = wrapper.dataset.open !== 'true';
      closeAll(opening ? wrapper : null);
      wrapper.dataset.open = String(opening);
      button.setAttribute('aria-expanded', String(opening));
      if (opening) requestAnimationFrame(() => positionGuide(wrapper));
    });

    button.addEventListener('focus', () => {
      if (!isFinePointer()) return;
      positionGuide(wrapper);
      button.setAttribute('aria-expanded', 'true');
    });

    button.addEventListener('blur', () => {
      if (!isFinePointer()) return;
      requestAnimationFrame(() => {
        if (!wrapper.matches(':focus-within')) button.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function scan(root = document) {
    targets.forEach(config => {
      if (root instanceof Element && root.matches(config.selector)) enhanceGuide(root, config);
      root.querySelectorAll?.(config.selector).forEach(element => enhanceGuide(element, config));
    });
  }

  function repositionVisibleGuides() {
    document.querySelectorAll('.guide-popover').forEach(wrapper => {
      const visible = wrapper.dataset.open === 'true' ||
        (isFinePointer() && (wrapper.matches(':hover') || wrapper.matches(':focus-within')));
      if (visible) positionGuide(wrapper);
    });
  }

  scan();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof Element) scan(node);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('pointerdown', event => {
    if (isFinePointer()) return;
    const active = event.target.closest?.('.guide-popover');
    closeAll(active || null);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAll();
  });

  window.addEventListener('resize', repositionVisibleGuides, { passive: true });
  window.addEventListener('scroll', repositionVisibleGuides, { passive: true, capture: true });
})();
