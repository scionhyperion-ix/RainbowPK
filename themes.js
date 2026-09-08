'use strict';

(function installRainbowThemes() {
  const THEME_KEY = 'rainbow_appearance_theme';
  const themes = [
    { id: 'twilight', name: 'Twilight', description: 'Violet and lavender' },
    { id: 'ocean', name: 'Ocean', description: 'Blue and cyan' },
    { id: 'rose', name: 'Rose', description: 'Berry and pink' },
    { id: 'forest', name: 'Forest', description: 'Emerald and mint' },
    { id: 'amber', name: 'Amber', description: 'Gold and warm orange' },
  ];

  const validThemes = new Set(themes.map(theme => theme.id));
  let themeButtons = [];

  function savedTheme() {
    const value = localStorage.getItem(THEME_KEY);
    return validThemes.has(value) ? value : 'twilight';
  }

  function syncThemeButtons(activeTheme) {
    themeButtons.forEach(button => {
      const selected = button.dataset.themeChoice === activeTheme;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  }

  function applyTheme(themeId, { save = true, notify = false } = {}) {
    const nextTheme = validThemes.has(themeId) ? themeId : 'twilight';
    document.documentElement.dataset.theme = nextTheme;

    if (save) {
      localStorage.setItem(THEME_KEY, nextTheme);
    }

    syncThemeButtons(nextTheme);

    if (notify && typeof showToast === 'function') {
      const theme = themes.find(item => item.id === nextTheme);
      showToast('Appearance updated', `${theme.name} theme is now active.`);
    }
  }

  function makeThemeOption(theme) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-option';
    button.dataset.themeChoice = theme.id;
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', `${theme.name}: ${theme.description}`);

    const swatch = document.createElement('span');
    swatch.className = `theme-swatch theme-swatch-${theme.id}`;
    swatch.setAttribute('aria-hidden', 'true');

    const copy = document.createElement('span');
    copy.className = 'theme-option-copy';

    const name = document.createElement('strong');
    name.textContent = theme.name;

    const description = document.createElement('small');
    description.textContent = theme.description;

    copy.append(name, description);

    const check = document.createElement('span');
    check.className = 'theme-check';
    check.textContent = '✓';
    check.setAttribute('aria-hidden', 'true');

    button.append(swatch, copy, check);
    button.addEventListener('click', () => applyTheme(theme.id, { notify: true }));
    return button;
  }

  function installThemeSettings() {
    const settingsGrid = document.querySelector('.settings-grid');
    if (!settingsGrid || document.querySelector('#appearanceThemePanel')) return;

    const panel = document.createElement('article');
    panel.id = 'appearanceThemePanel';
    panel.className = 'panel section-panel appearance-panel';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Appearance';

    const title = document.createElement('h3');
    title.textContent = 'Theme';

    const intro = document.createElement('p');
    intro.className = 'muted appearance-copy';
    intro.textContent = 'Choose a color theme for Rainbow. This preference is stored only in this browser.';

    const group = document.createElement('div');
    group.className = 'theme-options';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', 'Rainbow appearance theme');

    themeButtons = themes.map(makeThemeOption);
    themeButtons.forEach(button => group.append(button));

    panel.append(eyebrow, title, intro, group);

    settingsGrid.append(panel);
    syncThemeButtons(document.documentElement.dataset.theme || 'twilight');
  }

  function ensureStylesheet(href, media = '') {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    if (media) link.media = media;
    document.head.append(link);
  }

  function ensureScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.append(script);
  }

  function installMobileStyles() {
    ensureStylesheet('mobile.css', '(max-width: 760px)');
    ensureStylesheet('mobile-front-timers.css', '(max-width: 760px)');
    ensureStylesheet('mobile-member-editor.css?v=3', '(max-width: 760px)');
    ensureStylesheet('mobile-member-tabs-placement.css?v=1', '(max-width: 760px)');
    ensureStylesheet('mobile-members.css?v=1', '(max-width: 760px)');
    ensureScript('mobile-member-editor-tabs.js?v=1');
  }

  function installSiteChrome() {
    const iconHref = 'rainbowpk.png';

    ['icon', 'shortcut icon', 'apple-touch-icon'].forEach(rel => {
      let link = document.head.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.append(link);
      }
      link.href = iconHref;
      if (rel !== 'apple-touch-icon') link.type = 'image/png';
    });
  }

  applyTheme(savedTheme(), { save: false });
  installMobileStyles();
  installThemeSettings();
  installSiteChrome();
})();
