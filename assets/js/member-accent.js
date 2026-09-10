'use strict';

(function installMemberAccentTheme() {
  const dialog = document.getElementById('memberDialog');
  if (!dialog) return;

  function normalizeAccent(value) {
    const color = String(value || '').trim().replace(/^#/, '');
    return /^[0-9a-f]{6}$/i.test(color) ? `#${color}` : '';
  }

  function applyAccent(value) {
    const accent = normalizeAccent(value);
    const card = dialog.querySelector('.member-editor-card');

    [dialog, card].filter(Boolean).forEach(element => {
      if (accent) {
        element.style.setProperty('--member-accent', accent);
        element.dataset.memberAccent = 'true';
      } else {
        element.style.removeProperty('--member-accent');
        element.removeAttribute('data-member-accent');
      }
    });
  }

  function syncFromField() {
    applyAccent(document.getElementById('memberColor')?.value || '');
  }

  document.addEventListener('input', event => {
    if (event.target?.id === 'memberColor') syncFromField();
  });

  document.addEventListener('change', event => {
    if (event.target?.id === 'memberColor') syncFromField();
  });

  dialog.addEventListener('toggle', () => {
    if (dialog.open) requestAnimationFrame(syncFromField);
  });

  dialog.addEventListener('close', () => applyAccent(''));
})();
