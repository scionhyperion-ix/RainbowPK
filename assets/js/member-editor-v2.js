'use strict';

(function installRainbowMemberEditorV2() {
  let assignCreatedGroupToOpenMember = false;
  let proxyTabObserver = null;

  function cleanHex(value) {
    return String(value || '').trim().replace(/^#/, '');
  }

  function installGroupDialog() {
    if (document.getElementById('groupDialog')) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'groupDialog';
    dialog.className = 'modal-dialog group-editor-dialog';
    dialog.innerHTML = `
      <form id="groupForm" class="modal-card group-editor-card">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">PluralKit group</p>
            <h3>Create group</h3>
            <p class="muted group-editor-subtitle">Create a PluralKit group, then optionally add the member you are editing to it.</p>
          </div>
          <button class="icon-button group-dialog-close" type="button" aria-label="Close">×</button>
        </div>

        <div class="group-editor-fields">
          <label>Group name<input id="groupName" maxlength="100" required placeholder="Group name"></label>
          <label>Display name<input id="groupDisplayName" maxlength="100" placeholder="Optional"></label>
          <label>Color<input id="groupColor" maxlength="7" placeholder="#8b7cf6" pattern="#?[0-9A-Fa-f]{6}"></label>
          <label class="group-description-field">Description<textarea id="groupDescription" maxlength="1000" rows="4" placeholder="Optional"></textarea></label>
        </div>

        <p id="groupFormError" class="form-error" role="alert" hidden></p>
        <div class="modal-footer group-editor-footer">
          <button class="secondary-button group-dialog-close" type="button">Cancel</button>
          <button id="saveGroupButton" class="primary-button" type="submit">Create group</button>
        </div>
      </form>`;

    document.body.append(dialog);

    dialog.querySelectorAll('.group-dialog-close').forEach(button => {
      button.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    document.getElementById('groupForm').addEventListener('submit', createGroup);
  }

  function openGroupDialog({ assignToMember = false } = {}) {
    installGroupDialog();
    assignCreatedGroupToOpenMember = assignToMember;

    const dialog = document.getElementById('groupDialog');
    document.getElementById('groupForm').reset();
    document.getElementById('groupFormError').hidden = true;
    const subtitle = dialog.querySelector('.group-editor-subtitle');
    subtitle.textContent = assignToMember
      ? 'Create a PluralKit group. After creation, it will be selected for this member.'
      : 'Create a new PluralKit group for this system.';
    dialog.showModal();
    requestAnimationFrame(() => document.getElementById('groupName')?.focus());
  }

  async function createGroup(event) {
    event.preventDefault();
    const errorEl = document.getElementById('groupFormError');
    const button = document.getElementById('saveGroupButton');
    const name = document.getElementById('groupName').value.trim();
    const displayName = document.getElementById('groupDisplayName').value.trim();
    const color = cleanHex(document.getElementById('groupColor').value);
    const description = document.getElementById('groupDescription').value.trim();

    if (!name) {
      errorEl.textContent = 'Group name is required.';
      errorEl.hidden = false;
      return;
    }
    if (color && !/^[0-9a-f]{6}$/i.test(color)) {
      errorEl.textContent = 'Color must be a 6-character hex color.';
      errorEl.hidden = false;
      return;
    }

    const body = { name };
    if (displayName) body.display_name = displayName;
    if (color) body.color = color;
    if (description) body.description = description;

    button.disabled = true;
    button.textContent = 'Creating...';
    errorEl.hidden = true;

    try {
      const created = await api('/groups', { method: 'POST', body });
      document.getElementById('groupDialog').close();
      showToast('Group created', `${displayName || name} was added to PluralKit.`);

      await loadData();

      if (assignCreatedGroupToOpenMember && document.getElementById('memberDialog')?.open) {
        const ref = created?.id || created?.uuid;
        if (ref) {
          requestAnimationFrame(() => {
            const checkbox = [...document.querySelectorAll('#memberGroupPicker input')]
              .find(input => input.value === ref);
            if (checkbox) {
              checkbox.checked = true;
              checkbox.scrollIntoView({ block: 'nearest' });
            }
          });
        }
      }
    } catch (error) {
      errorEl.textContent = friendlyError(error);
      errorEl.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = 'Create group';
      assignCreatedGroupToOpenMember = false;
    }
  }

  function installGroupButtons() {
    const toolbar = document.querySelector('#membersRoute .toolbar-row');
    const memberButton = document.getElementById('createMemberButton');
    if (toolbar && memberButton && !document.getElementById('createGroupButton')) {
      const button = document.createElement('button');
      button.id = 'createGroupButton';
      button.className = 'secondary-button';
      button.type = 'button';
      button.textContent = 'New group';
      button.addEventListener('click', () => openGroupDialog());
      toolbar.insertBefore(button, memberButton);
    }

    const heading = document.querySelector('.member-groups-field .feature-field-heading');
    if (heading && !document.getElementById('memberNewGroupButton')) {
      heading.classList.add('member-groups-heading');
      const button = document.createElement('button');
      button.id = 'memberNewGroupButton';
      button.className = 'text-button';
      button.type = 'button';
      button.textContent = '+ New group';
      button.addEventListener('click', () => openGroupDialog({ assignToMember: true }));
      heading.append(button);
    }
  }

  function selectMobileEditorTab(stage, id) {
    stage.querySelectorAll('.mobile-member-tab-panel').forEach(panel => {
      panel.hidden = panel.dataset.memberPanel !== id;
    });
    stage.querySelectorAll('.mobile-member-tab').forEach(button => {
      const active = button.dataset.memberTab === id;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  function installProxyTab() {
    const stage = document.getElementById('memberFieldsStage');
    const tabs = stage?.querySelector('.mobile-member-tabs');
    const proxy = document.getElementById('memberProxySection');
    if (!stage || !tabs || !proxy) return false;

    let panel = document.getElementById('mobileMemberPanel-proxy');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mobileMemberPanel-proxy';
      panel.className = 'mobile-member-tab-panel';
      panel.dataset.memberPanel = 'proxy';
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-label', 'Proxy');
      panel.hidden = true;

      const notesPanel = document.getElementById('mobileMemberPanel-notes');
      stage.insertBefore(panel, notesPanel || null);
    }

    panel.append(proxy);
    proxy.classList.add('member-proxy-visible');

    let button = tabs.querySelector('[data-member-tab="proxy"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'mobile-member-tab';
      button.dataset.memberTab = 'proxy';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', panel.id);
      button.setAttribute('aria-selected', 'false');
      button.tabIndex = -1;
      button.textContent = 'Proxy';
      const notesButton = tabs.querySelector('[data-member-tab="notes"]');
      tabs.insertBefore(button, notesButton || null);
    }

    if (tabs.dataset.proxyDelegation !== 'true') {
      tabs.dataset.proxyDelegation = 'true';
      tabs.addEventListener('click', event => {
        const tab = event.target.closest('[data-member-tab]');
        if (!tab || !tabs.contains(tab)) return;
        const id = tab.dataset.memberTab;
        requestAnimationFrame(() => selectMobileEditorTab(stage, id));
      });
    }

    return true;
  }

  function watchForMobileTabs() {
    const stage = document.getElementById('memberFieldsStage');
    if (!stage || proxyTabObserver) return;

    if (installProxyTab()) return;

    proxyTabObserver = new MutationObserver(() => {
      installGroupButtons();
      if (installProxyTab()) {
        proxyTabObserver.disconnect();
        proxyTabObserver = null;
      }
    });
    proxyTabObserver.observe(stage, { childList: true, subtree: true });
  }

  function markProxySection() {
    const proxy = document.getElementById('memberProxySection');
    if (!proxy) return;
    proxy.classList.add('member-proxy-visible');
    const heading = proxy.querySelector('.feature-field-heading strong');
    if (heading) heading.textContent = 'Proxy tags';
  }

  function install() {
    installGroupDialog();
    installGroupButtons();
    markProxySection();
    watchForMobileTabs();
  }

  install();

  const memberDialog = document.getElementById('memberDialog');
  memberDialog?.addEventListener('toggle', () => {
    installGroupButtons();
    markProxySection();
    installProxyTab();
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(max-width: 760px)').matches) installProxyTab();
  });
})();
