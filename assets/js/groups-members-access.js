'use strict';

(function installGroupsMemberQuickAccess() {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

  function memberName(member) {
    return member?.name || member?.display_name || member?.id || 'Unknown member';
  }

  function memberMatches(member, query) {
    if (!query) return true;
    return [member?.name, member?.display_name, member?.pronouns, member?.id]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(query));
  }

  function ensurePanel() {
    const route = document.getElementById('groupsRoute');
    const toolbar = route?.querySelector('.groups-toolbar');
    if (!route || !toolbar) return null;

    let panel = document.getElementById('groupsMemberQuickAccess');
    if (panel) return panel;

    panel = document.createElement('section');
    panel.id = 'groupsMemberQuickAccess';
    panel.className = 'groups-member-access';
    panel.innerHTML = `
      <div class="groups-member-access-heading">
        <div>
          <strong>Members quick access</strong>
          <small>Open a member profile directly from Groups.</small>
        </div>
        <span id="groupsMemberAccessCount" class="groups-member-access-count"></span>
      </div>
      <label class="groups-member-access-search" for="groupsMemberAccessSearch">
        <span>⌕</span>
        <input id="groupsMemberAccessSearch" type="search" placeholder="Find a member" autocomplete="off">
      </label>
      <div id="groupsMemberAccessGrid" class="groups-member-access-grid" role="list"></div>
      <p id="groupsMemberAccessEmpty" class="muted groups-member-access-empty" hidden>No members found.</p>`;

    toolbar.insertAdjacentElement('afterend', panel);
    document.getElementById('groupsMemberAccessSearch')?.addEventListener('input', renderMemberAccess);
    return panel;
  }

  function makeQuickAvatar(member) {
    const avatar = typeof makeAvatar === 'function'
      ? makeAvatar(member, 'groups-member-access-avatar')
      : document.createElement('span');

    if (avatar instanceof HTMLImageElement) {
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      avatar.alt = '';
    }
    return avatar;
  }

  function renderMemberAccess() {
    if (!ensurePanel()) return;

    const grid = document.getElementById('groupsMemberAccessGrid');
    const empty = document.getElementById('groupsMemberAccessEmpty');
    const count = document.getElementById('groupsMemberAccessCount');
    const query = document.getElementById('groupsMemberAccessSearch')?.value.trim().toLowerCase() || '';
    if (!grid || !empty || !count) return;

    const members = [...(Array.isArray(state.members) ? state.members : [])]
      .filter(member => memberMatches(member, query))
      .sort((a, b) => collator.compare(memberName(a), memberName(b)));

    count.textContent = query
      ? `${members.length} match${members.length === 1 ? '' : 'es'}`
      : `${members.length} member${members.length === 1 ? '' : 's'}`;

    grid.replaceChildren();
    empty.hidden = members.length > 0;

    members.forEach(member => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'groups-member-access-item';
      button.setAttribute('role', 'listitem');
      button.title = `Edit ${memberName(member)}`;
      button.append(makeQuickAvatar(member));

      const copy = document.createElement('span');
      copy.className = 'groups-member-access-copy';

      const strong = document.createElement('strong');
      strong.textContent = memberName(member);
      copy.append(strong);

      const small = document.createElement('small');
      small.textContent = member.pronouns || member.display_name || member.id || 'Member';
      copy.append(small);

      button.append(copy);
      button.addEventListener('click', () => {
        if (typeof openMemberDialog === 'function') openMemberDialog(member);
      });
      grid.append(button);
    });
  }

  ensurePanel();
  renderMemberAccess();

  const originalRenderAll = renderAll;
  renderAll = function renderAllWithGroupMemberAccess() {
    originalRenderAll();
    renderMemberAccess();
  };

  const routeObserver = new MutationObserver(() => {
    if (!document.getElementById('groupsMemberQuickAccess')) {
      ensurePanel();
      renderMemberAccess();
    }
  });
  routeObserver.observe(document.body, { childList: true, subtree: true });
})();
