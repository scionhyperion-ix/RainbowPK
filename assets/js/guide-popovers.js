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

  function closeAll(except = null) {
    document.querySelectorAll('.guide-popover[data-open="true"]').forEach(wrapper => {
      if (wrapper === except) return;
      wrapper.dataset.open = 'false';
      const button = wrapper.querySelector('.guide-popover-button');
      if (button) button.setAttribute('aria-expanded', 'false');
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

  function enhanceGuide(content, config) {
    if (!content || content.dataset.guidePopoverReady === 'true') return;
    content.dataset.guidePopoverReady = 'true';

    const wrapper = document.createElement('span');
    wrapper.className = `guide-popover guide-popover-${config.kind}`;
    wrapper.dataset.open = 'false';

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

    button.addEventListener('click', event => {
      if (isFinePointer()) return;
      event.preventDefault();
      const opening = wrapper.dataset.open !== 'true';
      closeAll(opening ? wrapper : null);
      wrapper.dataset.open = String(opening);
      button.setAttribute('aria-expanded', String(opening));
    });

    button.addEventListener('focus', () => {
      if (!isFinePointer()) return;
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
})();
