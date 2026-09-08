'use strict';

(function installNativeRainbowMode() {
  const bridge = window.RainbowAndroid;
  const isNative = Boolean(bridge) && (
    typeof bridge.isNativeApp === 'function' ||
    typeof bridge.setWidgetAccess === 'function'
  );

  if (!isNative) return;

  document.documentElement.classList.add('native-app');
  document.body?.classList.add('native-app');
  document.title = 'Rainbow';

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el && el.textContent !== value) el.textContent = value;
  }

  function setNativeCopy() {
    document.documentElement.classList.add('native-app');
    document.body?.classList.add('native-app');

    setText('.brand-lockup-login .eyebrow', 'PluralKit companion');
    setText('.login-intro', 'Sign in with your PluralKit token to use Rainbow on this device. Rainbow connects directly to PluralKit and does not require a separate Rainbow account.');
    setText('#loginButton', 'Sign in to Rainbow');

    const rememberRow = document.querySelector('#rememberToken')?.closest('.check-row');
    if (rememberRow) {
      const strong = rememberRow.querySelector('strong');
      const small = rememberRow.querySelector('small');
      if (strong) strong.textContent = 'Keep me signed in on this device';
      if (small) small.textContent = 'Saves your PluralKit token on this device until you sign out. This is required for the Home Screen widget.';
    }

    const loginSecurity = document.querySelector('.security-note');
    if (loginSecurity) {
      const strong = loginSecurity.querySelector('strong');
      const p = loginSecurity.querySelector('p');
      if (strong) strong.textContent = 'Using your PluralKit token';
      if (p) p.innerHTML = 'Get your token with <code>pk;token</code> in Discord. Rainbow sends it only to PluralKit for authenticated requests.';
    }

    setText('.sidebar-brand small', 'PluralKit companion');

    const refresh = document.querySelector('#refreshButton');
    if (refresh) {
      refresh.textContent = '↻';
      refresh.setAttribute('aria-label', 'Refresh PluralKit data');
      refresh.setAttribute('title', 'Refresh');
      refresh.classList.add('native-refresh-button');
    }

    const connectionPanel = document.querySelector('#settingsRoute .settings-grid > .panel:first-child');
    if (connectionPanel) {
      const title = connectionPanel.querySelector('h3');
      if (title) title.textContent = 'PluralKit connection';
    }

    const storage = document.querySelector('#settingsTokenStorage');
    if (storage) {
      const value = storage.textContent.trim();
      if (value === 'This browser' || value === 'This browser session') storage.textContent = 'This device';
      if (value === 'Current browser session' || value === 'Until page refresh' || value === 'Session only') storage.textContent = 'Until Rainbow closes';
    }

    setText('#signOutButton', 'Sign out and remove token');

    const securityPanels = [...document.querySelectorAll('#settingsRoute .settings-grid > .panel')];
    const securityPanel = securityPanels.find(panel => {
      const heading = panel.querySelector('h3')?.textContent || '';
      return heading === 'How this login works' || heading === 'Privacy and security';
    });

    if (securityPanel) {
      const eyebrow = securityPanel.querySelector('.eyebrow');
      const h3 = securityPanel.querySelector('h3');
      const prose = securityPanel.querySelector('.prose-stack');
      if (eyebrow) eyebrow.textContent = 'Privacy';
      if (h3) h3.textContent = 'Privacy and security';
      if (prose && prose.dataset.nativeCopy !== 'true') {
        prose.dataset.nativeCopy = 'true';
        prose.replaceChildren();
        [
          'Your PluralKit token is never built into Rainbow.',
          'Rainbow connects directly to PluralKit. There is no separate Rainbow account or Rainbow user database.',
          'If this phone is shared, sign out when you are finished.'
        ].forEach(text => {
          const p = document.createElement('p');
          p.textContent = text;
          prose.append(p);
        });
      }
    }

    const appearanceCopy = document.querySelector('#appearanceThemePanel .appearance-copy');
    if (appearanceCopy) appearanceCopy.textContent = 'Choose how Rainbow looks on this device.';

    const widgetPanel = document.querySelector('#currentFrontWidgetPanel');
    if (widgetPanel) {
      const eyebrow = widgetPanel.querySelector('.eyebrow');
      const h3 = widgetPanel.querySelector('h3');
      const intro = widgetPanel.querySelector('.widget-settings-copy');
      if (eyebrow) eyebrow.textContent = 'Android';
      if (h3) h3.textContent = 'Home Screen widget';
      if (intro) intro.textContent = 'Show your current PluralKit fronters on your Android Home Screen.';

      const installedRequirement = widgetPanel.querySelector('[data-widget-requirement="installed"]');
      if (installedRequirement) installedRequirement.hidden = true;

      const persistentRequirement = widgetPanel.querySelector('[data-widget-requirement="persistent"]');
      if (persistentRequirement) {
        const strong = persistentRequirement.querySelector('strong');
        const small = persistentRequirement.querySelector('small');
        if (strong) strong.textContent = 'Saved sign-in';
        if (small) small.textContent = 'Required so the widget can refresh after Rainbow is closed.';
      }

      const connectedRequirement = widgetPanel.querySelector('[data-widget-requirement="connected"]');
      if (connectedRequirement) {
        const strong = connectedRequirement.querySelector('strong');
        const small = connectedRequirement.querySelector('small');
        if (strong) strong.textContent = 'Internet connection';
        if (small) small.textContent = 'Needed whenever Rainbow or the widget refreshes PluralKit data.';
      }

      const toggleTitle = widgetPanel.querySelector('.widget-toggle-copy strong');
      if (toggleTitle) toggleTitle.textContent = 'Current Front widget';

      const privacy = widgetPanel.querySelector('.widget-privacy-note');
      if (privacy) privacy.textContent = 'Current fronter names can be visible whenever your Home Screen is visible. Only enable this on a phone you trust.';
    }
  }

  setNativeCopy();

  const observer = new MutationObserver(() => setNativeCopy());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
