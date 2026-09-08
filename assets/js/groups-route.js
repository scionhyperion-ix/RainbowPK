'use strict';

(function installRainbowGroupsRoute() {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  let workingGroupMembers = new Set();
  let currentGroup = null;

  function groupName(group) {
    return group?.name || group?.display_name || group?.id || 'Unnamed group';
  }

  function memberName(member) {
    return member?.name || member?.display_name || member?.id || 'Unknown member';
  }

  function canonicalMemberRef(member) {
    return member?.uuid || member?.id || '';
  }

  function cleanHex(value) {
    return String(value || '').trim().replace(/^#/, '');
  }

  function makeGroupIcon(group, className = '') {
    const url = safeUrl(group?.icon);
    if (url) {
      const image = document.createElement('img');
      image.className = className;
      image.src = url;
      image.alt = '';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = `${className} fallback-avatar`;
        fallback.textContent = initials(groupName(group));
        image.replaceWith(fallback);
      }, { once: true });
      return image;
    }

    const fallback = document.createElement('div');
    fallback.className = `${className} fallback-avatar`;
    fallback.textContent = initials(groupName(group));
    return fallback;
  }

  function resolveGroupMembers(group) {
    const refs = Array.isArray(group?.members) ? group.members : [];
    return refs.map(resolveMember).filter(Boolean).sort((a, b) => collator.compare(memberName(a), memberName(b)));
  }

  function installRouteMarkup() {
    if (!document.getElementById('groupsRoute')) {
      const route = document.createElement('section');
      route.id = 'groupsRoute';
      route.className = 'route-view';
      route.hidden = true;
      route.innerHTML = `
        <div class="groups-toolbar">
          <label class="search-field groups-search" for="groupSearch">
            <span>⌕</span>
            <input id="groupSearch" type="search" placeholder="Search groups" autocomplete="off">
          </label>
          <button id="newGroupRouteButton" class="primary-button" type="button">New group</button>
        </div>
        <div id="groupGrid" class="group-card-grid"></div>
        <div id="groupsEmpty" class="empty-state" hidden>
          <h3>No groups found</h3>
          <p>Create a group or try another search.</p>
        </div>`;

      const history = document.getElementById('historyRoute');
      history?.insertAdjacentElement('beforebegin', route);
    }

    if (!document.querySelector('.nav-list [data-route="groups"]')) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.dataset.route = 'groups';
      button.type = 'button';
      button.innerHTML = '<span>▦</span>Groups';
      const historyButton = document.querySelector('.nav-list [data-route="history"]');
      historyButton?.insertAdjacentElement('beforebegin', button);
      button.addEventListener('click', () => setRoute('groups'));
    }

    if (!document.querySelector('.mobile-nav [data-route="groups"]')) {
      const button = document.createElement('button');
      button.className = 'mobile-nav-item';
      button.dataset.route = 'groups';
      button.type = 'button';
      button.innerHTML = '<span>▦</span>Groups';
      const historyButton = document.querySelector('.mobile-nav [data-route="history"]');
      historyButton?.insertAdjacentElement('beforebegin', button);
      button.addEventListener('click', () => setRoute('groups'));
    }

    document.getElementById('groupSearch')?.addEventListener('input', renderGroups);
    document.getElementById('newGroupRouteButton')?.addEventListener('click', () => openGroupManager());
  }

  function installGroupManagerDialog() {
    if (document.getElementById('groupsManagerDialog')) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'groupsManagerDialog';
    dialog.className = 'modal-dialog groups-manager-dialog';
    dialog.innerHTML = `
      <form id="groupsManagerForm" class="modal-card groups-manager-card">
        <div class="modal-heading groups-manager-heading">
          <div>
            <p class="eyebrow">PluralKit group</p>
            <h3 id="groupsManagerTitle">Create group</h3>
            <p id="groupsManagerSubtitle" class="muted groups-manager-subtitle">Organize members without crowding the Members page.</p>
          </div>
          <button class="icon-button groups-manager-close" type="button" aria-label="Close">×</button>
        </div>

        <input id="groupsManagerRef" type="hidden">

        <div class="groups-manager-layout">
          <section class="groups-profile-fields">
            <div class="groups-section-heading">
              <strong>Group profile</strong>
              <small>Name, appearance, and optional notes.</small>
            </div>

            <div class="form-grid two-col groups-profile-grid">
              <label>Name<input id="groupsManagerName" maxlength="100" required></label>
              <label>Display name<input id="groupsManagerDisplayName" maxlength="100"></label>
              <label>Color<input id="groupsManagerColor" maxlength="7" placeholder="#8b7cf6" pattern="#?[0-9A-Fa-f]{6}"></label>
              <label>Icon URL<input id="groupsManagerIcon" type="url" maxlength="256" placeholder="https://..."></label>
              <label class="groups-banner-field">Banner URL<input id="groupsManagerBanner" type="url" maxlength="256" placeholder="https://..."></label>
            </div>

            <label class="groups-description-field">Description<textarea id="groupsManagerDescription" maxlength="1000" rows="4"></textarea></label>
          </section>

          <section class="groups-members-editor">
            <div class="groups-section-heading">
              <strong>Members</strong>
              <small id="groupsSelectedCount">0 selected</small>
            </div>
            <label class="dialog-search groups-member-search">Find members<input id="groupsMemberSearch" type="search" placeholder="Search members" autocomplete="off"></label>
            <div id="groupsMemberPicker" class="front-member-picker groups-member-picker"></div>
          </section>
        </div>

        <p id="groupsManagerError" class="form-error" role="alert" hidden></p>

        <div class="modal-footer modal-footer-split groups-manager-footer">
          <button id="deleteGroupButton" class="text-button danger-text" type="button">Delete group</button>
          <div>
            <button class="secondary-button groups-manager-close" type="button">Cancel</button>
            <button id="saveManagedGroupButton" class="primary-button" type="submit">Save group</button>
          </div>
        </div>
      </form>`;

    document.body.append(dialog);

    dialog.querySelectorAll('.groups-manager-close').forEach(button => {
      button.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });

    document.getElementById('groupsManagerForm').addEventListener('submit', saveManagedGroup);
    document.getElementById('deleteGroupButton').addEventListener('click', deleteManagedGroup);
    document.getElementById('groupsMemberSearch').addEventListener('input', event => renderGroupMemberPicker(event.target.value));
  }

  function simplifyMembersUI() {
    const groupFilter = document.getElementById('memberGroupFilter');
    const groupFilterLabel = groupFilter?.closest('.feature-select');
    if (groupFilterLabel) groupFilterLabel.hidden = true;

    const oldCreate = document.getElementById('createGroupButton');
    if (oldCreate) oldCreate.hidden = true;

    const memberCreate = document.getElementById('memberNewGroupButton');
    if (memberCreate) memberCreate.hidden = true;

    document.querySelectorAll('#membersRoute .member-card-groups').forEach(element => {
      element.hidden = true;
    });

    const memberGroupField = document.querySelector('#memberDialog .member-groups-field');
    if (memberGroupField) memberGroupField.hidden = true;
  }

  function installRouteBehavior() {
    const originalSetRoute = setRoute;
    setRoute = function setRouteWithGroups(route) {
      if (route !== 'groups') {
        originalSetRoute(route);
        return;
      }

      state.route = 'groups';
      document.getElementById('pageEyebrow').textContent = 'System organization';
      document.getElementById('pageTitle').textContent = 'Groups';
      document.querySelectorAll('.route-view').forEach(view => {
        view.hidden = view.id !== 'groupsRoute';
      });
      document.querySelectorAll('[data-route]').forEach(button => {
        button.classList.toggle('active', button.dataset.route === 'groups');
      });
      if (els.openFrontManager) els.openFrontManager.hidden = true;
      window.location.hash = 'groups';
      renderGroups();
    };

    const originalRenderAll = renderAll;
    renderAll = function renderAllWithGroups() {
      originalRenderAll();
      renderGroups();
      simplifyMembersUI();
    };

    window.addEventListener('hashchange', () => {
      if (els.appView.hidden) return;
      const route = window.location.hash.slice(1) || 'home';
      if (route === 'groups' && state.route !== 'groups') setRoute('groups');
    });
  }

  function renderGroups() {
    const grid = document.getElementById('groupGrid');
    const empty = document.getElementById('groupsEmpty');
    if (!grid || !empty) return;

    const query = document.getElementById('groupSearch')?.value.trim().toLowerCase() || '';
    const groups = [...(Array.isArray(state.groups) ? state.groups : [])]
      .filter(group => !query || [group.name, group.display_name, group.id, group.description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query)))
      .sort((a, b) => collator.compare(groupName(a), groupName(b)));

    grid.replaceChildren();
    empty.hidden = groups.length > 0;

    groups.forEach(group => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'group-card';

      const bannerUrl = safeUrl(group.banner);
      if (bannerUrl) {
        const banner = document.createElement('div');
        banner.className = 'group-card-banner';
        banner.style.backgroundImage = `linear-gradient(180deg, transparent, rgba(11, 12, 22, .78)), url("${bannerUrl.replaceAll('"', '%22')}")`;
        card.append(banner);
        card.classList.add('has-group-banner');
      }

      const content = document.createElement('div');
      content.className = 'group-card-content';
      content.append(makeGroupIcon(group, 'group-card-icon'));

      const copy = document.createElement('div');
      copy.className = 'group-card-copy';
      const title = document.createElement('h3');
      title.textContent = groupName(group);
      copy.append(title);

      if (group.display_name && group.display_name !== group.name) {
        const display = document.createElement('p');
        display.textContent = group.display_name;
        copy.append(display);
      }

      const members = resolveGroupMembers(group);
      const meta = document.createElement('small');
      meta.textContent = `${members.length} member${members.length === 1 ? '' : 's'}`;
      copy.append(meta);
      content.append(copy);

      const previews = document.createElement('div');
      previews.className = 'group-member-preview';
      members.slice(0, 4).forEach(member => previews.append(makeAvatar(member, 'group-member-mini')));
      if (members.length > 4) {
        const more = document.createElement('span');
        more.className = 'group-member-more';
        more.textContent = `+${members.length - 4}`;
        previews.append(more);
      }
      content.append(previews);
      card.append(content);

      const color = cleanHex(group.color);
      const bar = document.createElement('span');
      bar.className = 'group-color-bar';
      bar.style.background = /^[0-9a-f]{6}$/i.test(color) ? `#${color}` : 'var(--accent)';
      card.append(bar);

      card.addEventListener('click', () => openGroupManager(group));
      grid.append(card);
    });
  }

  function renderGroupMemberPicker(query = '') {
    const picker = document.getElementById('groupsMemberPicker');
    if (!picker) return;
    picker.replaceChildren();

    const normalized = query.trim().toLowerCase();
    const members = [...state.members]
      .filter(member => !normalized || [member.name, member.display_name, member.pronouns, member.id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalized)))
      .sort((a, b) => collator.compare(memberName(a), memberName(b)));

    members.forEach(member => {
      const ref = canonicalMemberRef(member);
      const row = document.createElement('label');
      row.className = 'picker-row';
      row.append(makeAvatar(member, 'picker-avatar'));

      const copy = document.createElement('span');
      copy.className = 'picker-copy';
      const strong = document.createElement('strong');
      strong.textContent = memberName(member);
      const small = document.createElement('small');
      small.textContent = member.pronouns || member.display_name || member.id;
      copy.append(strong, small);

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = ref;
      input.checked = workingGroupMembers.has(ref);
      input.addEventListener('change', () => {
        if (input.checked) workingGroupMembers.add(ref);
        else workingGroupMembers.delete(ref);
        updateSelectedCount();
      });

      row.append(copy, input);
      picker.append(row);
    });

    updateSelectedCount();
  }

  function updateSelectedCount() {
    const label = document.getElementById('groupsSelectedCount');
    if (!label) return;
    const count = workingGroupMembers.size;
    label.textContent = `${count} selected`;
  }

  function openGroupManager(group = null) {
    installGroupManagerDialog();
    currentGroup = group;

    const dialog = document.getElementById('groupsManagerDialog');
    const form = document.getElementById('groupsManagerForm');
    form.reset();
    document.getElementById('groupsManagerError').hidden = true;

    document.getElementById('groupsManagerRef').value = group?.id || group?.uuid || '';
    document.getElementById('groupsManagerName').value = group?.name || '';
    document.getElementById('groupsManagerDisplayName').value = group?.display_name || '';
    document.getElementById('groupsManagerColor').value = group?.color ? `#${cleanHex(group.color)}` : '';
    document.getElementById('groupsManagerIcon').value = group?.icon || '';
    document.getElementById('groupsManagerBanner').value = group?.banner || '';
    document.getElementById('groupsManagerDescription').value = group?.description || '';
    document.getElementById('groupsMemberSearch').value = '';

    workingGroupMembers = new Set(resolveGroupMembers(group).map(canonicalMemberRef).filter(Boolean));
    renderGroupMemberPicker();

    document.getElementById('groupsManagerTitle').textContent = group ? 'Edit group' : 'Create group';
    document.getElementById('groupsManagerSubtitle').textContent = group
      ? 'Update this group and choose which members belong to it.'
      : 'Create a group and choose its members in one place.';
    document.getElementById('saveManagedGroupButton').textContent = group ? 'Save group' : 'Create group';
    document.getElementById('deleteGroupButton').hidden = !group;

    dialog.showModal();
    requestAnimationFrame(() => document.getElementById('groupsManagerName')?.focus());
  }

  async function saveManagedGroup(event) {
    event.preventDefault();
    const errorEl = document.getElementById('groupsManagerError');
    const saveButton = document.getElementById('saveManagedGroupButton');
    const ref = document.getElementById('groupsManagerRef').value;
    const name = document.getElementById('groupsManagerName').value.trim();
    const displayName = document.getElementById('groupsManagerDisplayName').value.trim();
    const color = cleanHex(document.getElementById('groupsManagerColor').value);
    const icon = document.getElementById('groupsManagerIcon').value.trim();
    const banner = document.getElementById('groupsManagerBanner').value.trim();
    const description = document.getElementById('groupsManagerDescription').value.trim();

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

    const body = {
      name,
      display_name: displayName || null,
      color: color || null,
      icon: icon || null,
      banner: banner || null,
      description: description || null,
    };

    saveButton.disabled = true;
    saveButton.textContent = ref ? 'Saving...' : 'Creating...';
    errorEl.hidden = true;

    try {
      const result = ref
        ? await api(`/groups/${encodeURIComponent(ref)}`, { method: 'PATCH', body })
        : await api('/groups', { method: 'POST', body });
      const groupRef = ref || result?.id || result?.uuid;

      if (groupRef) {
        await api(`/groups/${encodeURIComponent(groupRef)}/members/overwrite`, {
          method: 'POST',
          body: [...workingGroupMembers],
        });
      }

      document.getElementById('groupsManagerDialog').close();
      showToast(ref ? 'Group saved' : 'Group created', `${name} was updated in PluralKit.`);
      await loadData();
      renderGroups();
    } catch (error) {
      errorEl.textContent = friendlyError(error);
      errorEl.hidden = false;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = ref ? 'Save group' : 'Create group';
    }
  }

  async function deleteManagedGroup() {
    const ref = document.getElementById('groupsManagerRef')?.value;
    if (!ref || !currentGroup) return;
    const name = groupName(currentGroup);
    if (!window.confirm(`Delete ${name} from PluralKit? This cannot be undone.`)) return;

    const button = document.getElementById('deleteGroupButton');
    button.disabled = true;
    try {
      await api(`/groups/${encodeURIComponent(ref)}`, { method: 'DELETE' });
      document.getElementById('groupsManagerDialog').close();
      showToast('Group deleted', `${name} was removed from PluralKit.`);
      await loadData();
      renderGroups();
    } catch (error) {
      document.getElementById('groupsManagerError').textContent = friendlyError(error);
      document.getElementById('groupsManagerError').hidden = false;
    } finally {
      button.disabled = false;
    }
  }

  installRouteMarkup();
  installGroupManagerDialog();
  simplifyMembersUI();
  installRouteBehavior();
  renderGroups();

  const simplifier = new MutationObserver(simplifyMembersUI);
  const membersRoute = document.getElementById('membersRoute');
  if (membersRoute) simplifier.observe(membersRoute, { childList: true, subtree: true });
  const memberDialog = document.getElementById('memberDialog');
  if (memberDialog) simplifier.observe(memberDialog, { childList: true, subtree: true });

  if (window.location.hash.slice(1) === 'groups' && !els.appView.hidden) {
    setRoute('groups');
  }
})();
