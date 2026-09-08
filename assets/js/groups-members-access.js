'use strict';

(function installGroupsCurrentMembers() {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  let selectedRefs = new Set();
  let enhancedDialog = null;

  function memberName(member) {
    return member?.name || member?.display_name || member?.id || 'Unknown member';
  }

  function memberByRef(ref) {
    return (Array.isArray(state.members) ? state.members : []).find(member =>
      member?.uuid === ref || member?.id === ref
    ) || null;
  }

  function canonicalRef(ref) {
    const member = memberByRef(ref);
    return member?.uuid || member?.id || String(ref || '');
  }

  function currentGroup() {
    const ref = document.getElementById('groupsManagerRef')?.value || '';
    if (!ref) return null;
    return (Array.isArray(state.groups) ? state.groups : []).find(group =>
      group?.id === ref || group?.uuid === ref
    ) || null;
  }

  function makeCurrentMemberAvatar(member) {
    const avatar = typeof makeAvatar === 'function'
      ? makeAvatar(member, 'groups-current-member-avatar')
      : document.createElement('span');

    if (avatar instanceof HTMLImageElement) {
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      avatar.alt = '';
    }
    return avatar;
  }

  function ensureStrip() {
    document.getElementById('groupsMemberQuickAccess')?.remove();

    const editor = document.querySelector('#groupsManagerDialog .groups-members-editor');
    const search = editor?.querySelector('.groups-member-search');
    if (!editor || !search) return null;

    let strip = document.getElementById('groupsCurrentMembers');
    if (!strip) {
      strip = document.createElement('section');
      strip.id = 'groupsCurrentMembers';
      strip.className = 'groups-current-members';
      strip.innerHTML = `
        <div class="groups-current-members-heading">
          <div>
            <strong>Current members</strong>
            <small>Click a member to edit their profile.</small>
          </div>
          <span id="groupsCurrentMembersCount">0</span>
        </div>
        <div id="groupsCurrentMemberIcons" class="groups-current-member-icons"></div>
        <p id="groupsCurrentMembersEmpty" class="muted groups-current-members-empty">No members selected.</p>`;
      editor.insertBefore(strip, search);
    }

    return strip;
  }

  function selectedMembers() {
    const unique = new Map();
    selectedRefs.forEach(ref => {
      const member = memberByRef(ref);
      if (!member) return;
      unique.set(member.uuid || member.id, member);
    });
    return [...unique.values()].sort((a, b) => collator.compare(memberName(a), memberName(b)));
  }

  function renderCurrentMembers() {
    if (!ensureStrip()) return;

    const icons = document.getElementById('groupsCurrentMemberIcons');
    const count = document.getElementById('groupsCurrentMembersCount');
    const empty = document.getElementById('groupsCurrentMembersEmpty');
    if (!icons || !count || !empty) return;

    const members = selectedMembers();
    count.textContent = `${members.length} selected`;
    icons.replaceChildren();
    empty.hidden = members.length > 0;

    members.forEach(member => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'groups-current-member-button';
      button.title = `Edit ${memberName(member)}`;
      button.setAttribute('aria-label', `Edit ${memberName(member)}`);
      button.append(makeCurrentMemberAvatar(member));
      button.addEventListener('click', () => {
        if (typeof openMemberDialog === 'function') openMemberDialog(member);
      });
      icons.append(button);
    });
  }

  function syncFromDialog() {
    const dialog = document.getElementById('groupsManagerDialog');
    if (!dialog?.open) return;

    selectedRefs = new Set();
    const group = currentGroup();
    (Array.isArray(group?.members) ? group.members : []).forEach(ref => {
      const normalized = canonicalRef(ref);
      if (normalized) selectedRefs.add(normalized);
    });

    document.querySelectorAll('#groupsMemberPicker input:checked').forEach(input => {
      const normalized = canonicalRef(input.value);
      if (normalized) selectedRefs.add(normalized);
    });

    renderCurrentMembers();
  }

  function enhanceDialog() {
    const dialog = document.getElementById('groupsManagerDialog');
    if (!dialog || dialog === enhancedDialog) return;
    enhancedDialog = dialog;

    ensureStrip();

    dialog.addEventListener('change', event => {
      const input = event.target.closest?.('#groupsMemberPicker input[type="checkbox"]');
      if (!input) return;

      const ref = canonicalRef(input.value);
      if (!ref) return;
      if (input.checked) selectedRefs.add(ref);
      else selectedRefs.delete(ref);
      renderCurrentMembers();
    });

    const openObserver = new MutationObserver(() => {
      if (dialog.open) syncFromDialog();
    });
    openObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });

    if (dialog.open) syncFromDialog();
  }

  document.getElementById('groupsMemberQuickAccess')?.remove();
  enhanceDialog();

  const bodyObserver = new MutationObserver(() => {
    document.getElementById('groupsMemberQuickAccess')?.remove();
    enhanceDialog();
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });

  const originalRenderAll = renderAll;
  renderAll = function renderAllWithCurrentGroupMembers() {
    originalRenderAll();
    if (document.getElementById('groupsManagerDialog')?.open) renderCurrentMembers();
  };
})();
