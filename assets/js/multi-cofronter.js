'use strict';

(function installMultiCofronterPicker() {
  const dialog = document.getElementById('frontDialog');
  const picker = document.getElementById('frontMemberPicker');
  const addButton = document.getElementById('addCoFronterButton');
  const saveButton = document.getElementById('saveFrontButton');
  const title = document.getElementById('frontDialogTitle');
  const search = document.getElementById('frontMemberSearch');
  if (!dialog || !picker || !addButton || !saveButton || !title || !search) return;

  function currentMemberIds() {
    return new Set((state.fronters?.members || []).flatMap(member => [member?.id, member?.uuid]).filter(Boolean));
  }

  function ensureHelper() {
    let helper = dialog.querySelector('#cofronterMultiHelper');
    if (helper) return helper;

    helper = document.createElement('div');
    helper.id = 'cofronterMultiHelper';
    helper.className = 'cofronter-multi-helper';
    helper.hidden = true;
    helper.innerHTML = '<span>Select multiple members to add them together.</span><strong id="cofronterSelectedCount">0 selected</strong>';
    picker.insertAdjacentElement('beforebegin', helper);
    return helper;
  }

  function isAddMode() {
    return dialog.querySelector('input[name="frontMode"]:checked')?.value === 'add';
  }

  function decoratePicker() {
    const addMode = isAddMode();
    const helper = ensureHelper();
    helper.hidden = !addMode;

    title.textContent = addMode ? 'Add co-fronters' : 'Manage front';
    saveButton.textContent = addMode ? 'Add selected to front' : 'Log switch';

    const currentIds = currentMemberIds();
    picker.querySelectorAll('.picker-row').forEach(row => {
      const input = row.querySelector('input');
      if (!input) return;

      input.type = 'checkbox';
      const alreadyFronting = addMode && currentIds.has(input.value);
      input.disabled = alreadyFronting;
      row.classList.toggle('already-fronting', alreadyFronting);

      let badge = row.querySelector('.already-fronting-badge');
      if (alreadyFronting && !badge) {
        badge = document.createElement('span');
        badge.className = 'already-fronting-badge';
        badge.textContent = 'Fronting';
        row.querySelector('.picker-copy')?.append(badge);
      } else if (!alreadyFronting && badge) {
        badge.remove();
      }
    });

    updateCount();
  }

  function updateCount() {
    const count = [...picker.querySelectorAll('input:checked:not(:disabled)')].length;
    const counter = dialog.querySelector('#cofronterSelectedCount');
    if (counter) counter.textContent = `${count} selected`;
    if (isAddMode()) saveButton.textContent = count ? `Add ${count} to front` : 'Add selected to front';
  }

  addButton.addEventListener('click', () => {
    requestAnimationFrame(() => {
      decoratePicker();
      search.focus();
    });
  });

  dialog.querySelectorAll('input[name="frontMode"]').forEach(input => {
    input.addEventListener('change', () => requestAnimationFrame(decoratePicker));
  });

  search.addEventListener('input', () => requestAnimationFrame(decoratePicker));
  picker.addEventListener('change', updateCount);

  const observer = new MutationObserver(() => {
    if (dialog.open) requestAnimationFrame(decoratePicker);
  });
  observer.observe(picker, { childList: true });
})();
