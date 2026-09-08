'use strict';

(function installRainbowPwaWidgetSetup() {
  const PERSISTENT_TOKEN_KEY = 'rainbow_pk_token';
  const WIDGET_PREF_KEY = 'rainbow_current_front_widget_enabled';

  function ensureHeadLink(rel, href, extra = {}) {
    let link = document.head.querySelector(`link[rel="${rel}"][href="${href}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      Object.entries(extra).forEach(([key, value]) => link.setAttribute(key, value));
      document.head.append(link);
    }
    return link;
  }

  ensureHeadLink('manifest', 'manifest.webmanifest');
  ensureHeadLink('apple-touch-icon', 'rainbowpk.png');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }, { once: true });
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function hasPersistentLogin() {
    return Boolean(localStorage.getItem(PERSISTENT_TOKEN_KEY));
  }

  function isConnected() {
    return navigator.onLine && Boolean(state?.system) && Boolean(state?.token);
  }

  function requirementRow(id, title, detail) {
    const row = document.createElement('div');
    row.className = 'widget-requirement';
    row.dataset.widgetRequirement = id;

    const mark = document.createElement('span');
    mark.className = 'widget-requirement-mark';
    mark.textContent = '•';

    const copy = document.createElement('span');
    copy.className = 'widget-requirement-copy';

    const strong = document.createElement('strong');
    strong.textContent = title;

    const small = document.createElement('small');
    small.textContent = detail;

    copy.append(strong, small);
    row.append(mark, copy);
    return row;
  }

  function installPanel() {
    if (!window.matchMedia('(max-width: 760px)').matches) return null;
    const settingsGrid = document.querySelector('#settingsRoute .settings-grid');
    if (!settingsGrid) return null;

    let panel = document.querySelector('#currentFrontWidgetPanel');
    if (panel) return panel;

    panel = document.createElement('article');
    panel.id = 'currentFrontWidgetPanel';
    panel.className = 'panel section-panel';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Mobile app';

    const title = document.createElement('h3');
    title.textContent = 'Current Front widget';

    const intro = document.createElement('p');
    intro.className = 'widget-settings-copy';
    intro.textContent = 'Prepare Rainbow to expose only your current fronters to a future phone Home Screen widget.';

    const requirements = document.createElement('div');
    requirements.className = 'widget-requirements';
    requirements.append(
      requirementRow('persistent', 'Keep me signed in', 'Your PluralKit token must be remembered on this browser.'),
      requirementRow('installed', 'Rainbow installed as an app', 'Open Rainbow from its installed Home Screen app, not a normal browser tab.'),
      requirementRow('connected', 'Online and connected', 'Rainbow must currently be online and connected to PluralKit.')
    );

    const toggleRow = document.createElement('div');
    toggleRow.className = 'widget-toggle-row';

    const toggleCopy = document.createElement('div');
    toggleCopy.className = 'widget-toggle-copy';
    const toggleTitle = document.createElement('strong');
    toggleTitle.textContent = 'Allow Current Front widget';
    const toggleStatus = document.createElement('small');
    toggleStatus.id = 'currentFrontWidgetStatus';
    toggleStatus.textContent = 'Complete the requirements above first.';
    toggleCopy.append(toggleTitle, toggleStatus);

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'widget-switch';
    toggleLabel.setAttribute('aria-label', 'Allow Current Front widget');
    const checkbox = document.createElement('input');
    checkbox.id = 'currentFrontWidgetToggle';
    checkbox.type = 'checkbox';
    const track = document.createElement('span');
    track.className = 'widget-switch-track';
    toggleLabel.append(checkbox, track);

    toggleRow.append(toggleCopy, toggleLabel);

    const privacy = document.createElement('p');
    privacy.className = 'widget-privacy-note';
    privacy.textContent = 'Privacy note: a Home Screen widget can make current fronter names and images visible outside Rainbow. Only enable this on a phone you trust.';

    panel.append(eyebrow, title, intro, requirements, toggleRow, privacy);

    const securityPanel = [...settingsGrid.children].find(child =>
      child.querySelector?.('h3')?.textContent === 'How this login works'
    );
    if (securityPanel) settingsGrid.insertBefore(panel, securityPanel);
    else settingsGrid.append(panel);

    checkbox.addEventListener('change', () => {
      const eligible = hasPersistentLogin() && isStandalone() && isConnected();
      if (!eligible) {
        checkbox.checked = false;
        localStorage.removeItem(WIDGET_PREF_KEY);
        renderState();
        return;
      }

      if (checkbox.checked) {
        localStorage.setItem(WIDGET_PREF_KEY, 'true');
        if (typeof showToast === 'function') {
          showToast('Widget access enabled', 'Rainbow is ready for the native Current Front widget bridge.');
        }
      } else {
        localStorage.removeItem(WIDGET_PREF_KEY);
        if (typeof showToast === 'function') {
          showToast('Widget access disabled', 'Current Front widget access is turned off.');
        }
      }
      renderState();
    });

    return panel;
  }

  function setRequirement(id, met) {
    const row = document.querySelector(`[data-widget-requirement="${id}"]`);
    if (!row) return;
    row.classList.toggle('met', met);
    const mark = row.querySelector('.widget-requirement-mark');
    if (mark) mark.textContent = met ? '✓' : '•';
  }

  function renderState() {
    const panel = installPanel();
    if (!panel) return;

    const persistent = hasPersistentLogin();
    const installed = isStandalone();
    const connected = isConnected();
    const eligible = persistent && installed && connected;

    setRequirement('persistent', persistent);
    setRequirement('installed', installed);
    setRequirement('connected', connected);

    const checkbox = document.querySelector('#currentFrontWidgetToggle');
    const status = document.querySelector('#currentFrontWidgetStatus');
    if (!checkbox || !status) return;

    checkbox.disabled = !eligible;

    if (!eligible) {
      checkbox.checked = false;
      localStorage.removeItem(WIDGET_PREF_KEY);
      const missing = [];
      if (!persistent) missing.push('remember your login');
      if (!installed) missing.push('open the installed Rainbow app');
      if (!connected) missing.push('connect to PluralKit');
      status.textContent = `Required: ${missing.join(', ')}.`;
      return;
    }

    checkbox.checked = localStorage.getItem(WIDGET_PREF_KEY) === 'true';
    status.textContent = checkbox.checked
      ? 'Enabled. Ready for the native widget bridge.'
      : 'All requirements are complete. You can enable widget access.';
  }

  const oldRenderAll = window.renderAll;
  if (typeof oldRenderAll === 'function') {
    window.renderAll = function renderAllWithWidgetSetup() {
      oldRenderAll();
      renderState();
    };
  }

  window.addEventListener('online', renderState);
  window.addEventListener('offline', renderState);
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', renderState);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderState();
  });

  window.setInterval(() => {
    if (!document.querySelector('#settingsRoute')?.hidden) renderState();
  }, 1500);

  installPanel();
  renderState();
})();
