'use strict';

(function installHomeSystemControls() {
  const frontList = document.getElementById('currentFrontMembers');
  const systemPanel = document.querySelector('.system-summary-panel');
  let frontMeasureFrame = 0;

  function updateFrontViewport() {
    if (!frontList) return;

    cancelAnimationFrame(frontMeasureFrame);
    frontMeasureFrame = requestAnimationFrame(() => {
      const cards = [...frontList.querySelectorAll('.front-person')];
      if (cards.length <= 3) {
        delete frontList.dataset.frontScroll;
        frontList.style.removeProperty('--front-list-limit');
        frontList.scrollTop = 0;
        return;
      }

      frontList.dataset.frontScroll = 'true';

      requestAnimationFrame(() => {
        const currentCards = [...frontList.querySelectorAll('.front-person')].slice(0, 3);
        if (currentCards.length < 3) return;

        const style = getComputedStyle(frontList);
        const rowGap = parseFloat(style.rowGap || style.gap) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        const cardsHeight = currentCards.reduce((total, card) => total + card.getBoundingClientRect().height, 0);
        const limit = Math.ceil(cardsHeight + (rowGap * 2) + paddingTop + paddingBottom);
        frontList.style.setProperty('--front-list-limit', `${limit}px`);
      });
    });
  }

  if (frontList) {
    const frontObserver = new MutationObserver(updateFrontViewport);
    frontObserver.observe(frontList, { childList: true });
    window.addEventListener('resize', updateFrontViewport, { passive: true });
    updateFrontViewport();
  }

  function systemName(system = state.system || {}) {
    return system.name || (system.id ? `System ${system.id}` : 'System');
  }

  function ensureSystemEditButton() {
    if (!systemPanel) return null;
    let button = document.getElementById('editSystemButton');
    if (button) return button;

    button = document.createElement('button');
    button.id = 'editSystemButton';
    button.type = 'button';
    button.className = 'secondary-button system-edit-button';
    button.textContent = 'Edit system';
    button.addEventListener('click', openSystemEditor);
    systemPanel.append(button);
    return button;
  }

  function ensureSystemEditor() {
    let dialog = document.getElementById('systemEditorDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'systemEditorDialog';
    dialog.className = 'modal-dialog system-editor-dialog';
    dialog.innerHTML = `
      <form id="systemEditorForm" class="modal-card system-editor-card">
        <div class="modal-heading system-editor-heading">
          <div>
            <p class="eyebrow">PluralKit system</p>
            <h3>Edit system</h3>
            <p class="muted system-editor-subtitle">Update the profile shown for your connected PluralKit system.</p>
          </div>
          <button id="closeSystemEditor" class="icon-button" type="button" aria-label="Close">×</button>
        </div>

        <div class="system-editor-body">
          <aside class="system-editor-preview" aria-label="System profile preview">
            <div id="systemEditorBannerPreview" class="system-editor-preview-banner"></div>
            <div class="system-editor-preview-content">
              <div class="system-editor-avatar-wrap">
                <img id="systemEditorAvatarPreview" class="system-editor-preview-avatar" alt="" hidden>
                <div id="systemEditorAvatarFallback" class="system-editor-preview-avatar fallback-avatar">R</div>
              </div>
              <div id="systemEditorColorPreview" class="system-editor-color-preview"></div>
              <strong id="systemEditorNamePreview">System</strong>
              <span id="systemEditorPronounsPreview" class="muted"></span>
              <p id="systemEditorDescriptionPreview" class="muted">No description yet.</p>
            </div>
          </aside>

          <section class="system-editor-fields">
            <div class="form-grid two-col system-editor-grid">
              <label>Name<input id="systemEditName" maxlength="100"></label>
              <label>Pronouns<input id="systemEditPronouns" maxlength="100"></label>
              <label>System tag<input id="systemEditTag" maxlength="79" placeholder="Optional system tag"></label>
              <label>Color<input id="systemEditColor" maxlength="7" placeholder="#8b7cf6" pattern="#?[0-9A-Fa-f]{6}"></label>
              <label class="system-editor-wide">Avatar URL<input id="systemEditAvatar" type="url" maxlength="256" placeholder="https://..."></label>
              <label class="system-editor-wide">Banner URL<input id="systemEditBanner" type="url" maxlength="256" placeholder="https://..."></label>
            </div>
            <label class="system-editor-description">Description<textarea id="systemEditDescription" maxlength="1000" rows="6"></textarea></label>
            <p id="systemEditorError" class="form-error" role="alert" hidden></p>
          </section>
        </div>

        <div class="modal-footer system-editor-footer">
          <button id="cancelSystemEditor" class="secondary-button" type="button">Cancel</button>
          <button id="saveSystemEditor" class="primary-button" type="submit">Save system</button>
        </div>
      </form>`;

    document.body.append(dialog);

    const form = dialog.querySelector('#systemEditorForm');
    const close = () => dialog.close();
    dialog.querySelector('#closeSystemEditor').addEventListener('click', close);
    dialog.querySelector('#cancelSystemEditor').addEventListener('click', close);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });

    ['systemEditName', 'systemEditPronouns', 'systemEditColor', 'systemEditAvatar', 'systemEditBanner', 'systemEditDescription']
      .forEach(id => dialog.querySelector(`#${id}`).addEventListener('input', updateSystemPreview));

    form.addEventListener('submit', saveSystemProfile);
    return dialog;
  }

  function setSystemPreviewImage(urlValue) {
    const img = document.getElementById('systemEditorAvatarPreview');
    const fallback = document.getElementById('systemEditorAvatarFallback');
    if (!img || !fallback) return;

    const url = safeUrl(urlValue);
    img.onload = null;
    img.onerror = null;

    if (!url) {
      img.hidden = true;
      img.removeAttribute('src');
      fallback.hidden = false;
      return;
    }

    img.hidden = false;
    fallback.hidden = true;
    img.referrerPolicy = 'no-referrer';
    img.src = url;
    img.onerror = () => {
      img.hidden = true;
      fallback.hidden = false;
    };
  }

  function updateSystemPreview() {
    const nameInput = document.getElementById('systemEditName');
    if (!nameInput) return;

    const name = nameInput.value.trim() || systemName();
    const pronouns = document.getElementById('systemEditPronouns').value.trim();
    const description = document.getElementById('systemEditDescription').value.trim();
    const color = document.getElementById('systemEditColor').value.trim().replace(/^#/, '');
    const banner = safeUrl(document.getElementById('systemEditBanner').value.trim());

    document.getElementById('systemEditorNamePreview').textContent = name;
    document.getElementById('systemEditorPronounsPreview').textContent = pronouns;
    document.getElementById('systemEditorDescriptionPreview').textContent = description || 'No description yet.';
    document.getElementById('systemEditorAvatarFallback').textContent = initials(name);
    document.getElementById('systemEditorColorPreview').style.background = /^[0-9a-f]{6}$/i.test(color)
      ? `#${color}`
      : 'var(--accent)';

    const bannerPreview = document.getElementById('systemEditorBannerPreview');
    bannerPreview.style.backgroundImage = banner
      ? `linear-gradient(rgba(10, 11, 20, .12), rgba(10, 11, 20, .28)), url("${banner.replaceAll('"', '%22')}")`
      : '';
    bannerPreview.classList.toggle('has-image', Boolean(banner));

    setSystemPreviewImage(document.getElementById('systemEditAvatar').value.trim());
  }

  function openSystemEditor() {
    const dialog = ensureSystemEditor();
    const system = state.system || {};

    document.getElementById('systemEditName').value = system.name || '';
    document.getElementById('systemEditPronouns').value = system.pronouns || '';
    document.getElementById('systemEditTag').value = system.tag || '';
    document.getElementById('systemEditColor').value = system.color ? `#${system.color}` : '';
    document.getElementById('systemEditAvatar').value = system.avatar_url || '';
    document.getElementById('systemEditBanner').value = system.banner || '';
    document.getElementById('systemEditDescription').value = system.description || '';
    document.getElementById('systemEditorError').hidden = true;
    updateSystemPreview();
    dialog.showModal();
  }

  function collectSystemDraft() {
    const color = document.getElementById('systemEditColor').value.trim().replace(/^#/, '');
    return {
      name: document.getElementById('systemEditName').value.trim() || null,
      pronouns: document.getElementById('systemEditPronouns').value.trim() || null,
      tag: document.getElementById('systemEditTag').value.trim() || null,
      color: color || null,
      avatar_url: document.getElementById('systemEditAvatar').value.trim() || null,
      banner: document.getElementById('systemEditBanner').value.trim() || null,
      description: document.getElementById('systemEditDescription').value.trim() || null,
    };
  }

  function validateSystemDraft(body) {
    if (body.color && !/^[0-9a-f]{6}$/i.test(body.color)) return 'Color must be a 6-character hex color.';
    if (body.avatar_url && !safeUrl(body.avatar_url)) return 'Avatar must be a valid HTTPS URL.';
    if (body.banner && !safeUrl(body.banner)) return 'Banner must be a valid HTTPS URL.';
    return '';
  }

  async function saveSystemProfile(event) {
    event.preventDefault();
    const dialog = document.getElementById('systemEditorDialog');
    const error = document.getElementById('systemEditorError');
    const saveButton = document.getElementById('saveSystemEditor');
    const body = collectSystemDraft();
    const validationError = validateSystemDraft(body);

    if (validationError) {
      error.textContent = validationError;
      error.hidden = false;
      return;
    }

    error.hidden = true;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
      const updated = await api('/systems/@me', { method: 'PATCH', body });
      state.system = updated || { ...(state.system || {}), ...body };
      renderAll();
      dialog.close();
      showToast('System updated', 'Your PluralKit system profile was saved.');
    } catch (saveError) {
      error.textContent = friendlyError(saveError);
      error.hidden = false;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save system';
    }
  }

  ensureSystemEditButton();
  ensureSystemEditor();
})();
