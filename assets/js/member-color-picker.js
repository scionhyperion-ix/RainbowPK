'use strict';

(function installMemberColorPicker() {
  const dialog = document.getElementById('memberDialog');
  if (!dialog) return;

  let picker = null;

  function validHex(value) {
    const cleaned = String(value || '').trim().replace(/^#/, '');
    return /^[0-9a-f]{6}$/i.test(cleaned) ? '#' + cleaned.toUpperCase() : '';
  }

  function syncPickerFromHex() {
    const hexInput = document.getElementById('memberColor');
    if (!hexInput || !picker) return;

    const normalized = validHex(hexInput.value);
    if (normalized) {
      picker.value = normalized;
      picker.style.setProperty('--picked-color', normalized);
    }
  }

  function install() {
    const hexInput = document.getElementById('memberColor');
    if (!hexInput || document.getElementById('memberColorPicker')) return;

    const label = hexInput.closest('label');
    if (!label) return;

    const control = document.createElement('div');
    control.className = 'member-color-control';

    picker = document.createElement('input');
    picker.id = 'memberColorPicker';
    picker.className = 'member-color-picker';
    picker.type = 'color';
    picker.value = validHex(hexInput.value) || '#8B7CF6';
    picker.setAttribute('aria-label', 'Choose member color');
    picker.title = 'Choose color';

    hexInput.classList.add('member-color-hex');
    hexInput.replaceWith(control);
    control.append(picker, hexInput);

    picker.addEventListener('input', () => {
      const color = picker.value.toUpperCase();
      picker.style.setProperty('--picked-color', color);
      hexInput.value = color;
      hexInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    picker.addEventListener('change', () => {
      hexInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    hexInput.addEventListener('input', syncPickerFromHex);

    hexInput.addEventListener('blur', () => {
      const normalized = validHex(hexInput.value);
      if (!normalized) return;
      hexInput.value = normalized;
      syncPickerFromHex();
      hexInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    picker.style.setProperty('--picked-color', picker.value);
    syncPickerFromHex();
  }

  install();

  const observer = new MutationObserver(() => {
    install();
    if (dialog.open) requestAnimationFrame(syncPickerFromHex);
  });

  observer.observe(dialog, {
    attributes: true,
    attributeFilter: ['open'],
    childList: true,
    subtree: true,
  });

  dialog.addEventListener('toggle', () => {
    if (dialog.open) requestAnimationFrame(syncPickerFromHex);
  });
})();
