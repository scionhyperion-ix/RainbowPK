'use strict';

(function enforceLoginPersistencePolicy() {
  const sessionKey = 'rainbow_pk_token_session';
  const persistentKey = 'rainbow_pk_token';

  const legacySessionToken = sessionStorage.getItem(sessionKey);
  if (legacySessionToken) {
    sessionStorage.removeItem(sessionKey);

    if (!localStorage.getItem(persistentKey)) {
      window.location.reload();
      return;
    }
  }

  storeToken = function storeTokenByPreference(token, persistent) {
    localStorage.removeItem(persistentKey);
    sessionStorage.removeItem(sessionKey);

    if (persistent) {
      localStorage.setItem(persistentKey, token);
      state.tokenStorage = 'persistent';
    } else {
      state.tokenStorage = 'memory';
    }
  };

  const originalRenderSettings = renderSettings;
  renderSettings = function renderSettingsWithStoragePolicy() {
    originalRenderSettings();
    const storage = document.querySelector('#settingsTokenStorage');
    if (storage) {
      storage.textContent = state.tokenStorage === 'persistent'
        ? 'This browser'
        : 'Until page refresh';
    }
  };

  const remember = document.querySelector('#rememberToken');
  const rememberHelp = remember?.closest('label')?.querySelector('small');
  if (rememberHelp) {
    rememberHelp.textContent = 'Stores the token only in this browser until you sign out. Leave this off to sign out when the page refreshes or closes.';
  }
})();

(function installMemberSorting() {
  const SORT_KEY = 'rainbow_member_sort';
  const validSorts = new Set(['az', 'za', 'newest', 'oldest']);

  memberLabel = function memberNameFirst(member) {
    return member?.name || member?.display_name || 'Unknown member';
  };

  if (!document.querySelector('link[href="member-sort.css"]')) {
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = 'member-sort.css';
    document.head.append(styleLink);
  }

  function getSavedSort() {
    const saved = localStorage.getItem(SORT_KEY);
    return validSorts.has(saved) ? saved : 'az';
  }

  function memberCreatedTime(member) {
    if (!member?.created) return null;
    const time = new Date(member.created).getTime();
    return Number.isNaN(time) ? null : time;
  }

  function compareNames(a, b) {
    return memberLabel(a).localeCompare(memberLabel(b), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  }

  function sortMembers(members, mode) {
    const sorted = [...members];

    if (mode === 'za') {
      return sorted.sort((a, b) => compareNames(b, a));
    }

    if (mode === 'newest' || mode === 'oldest') {
      return sorted.sort((a, b) => {
        const aTime = memberCreatedTime(a);
        const bTime = memberCreatedTime(b);

        if (aTime === null && bTime === null) return compareNames(a, b);
        if (aTime === null) return 1;
        if (bTime === null) return -1;

        const difference = mode === 'newest'
          ? bTime - aTime
          : aTime - bTime;

        return difference || compareNames(a, b);
      });
    }

    return sorted.sort(compareNames);
  }

  function installSortControl() {
    const toolbar = document.querySelector('#membersRoute .toolbar-row');
    const newMemberButton = document.querySelector('#createMemberButton');
    if (!toolbar || !newMemberButton || document.querySelector('#memberSort')) return;

    const label = document.createElement('label');
    label.className = 'member-sort-control';
    label.htmlFor = 'memberSort';

    const labelText = document.createElement('span');
    labelText.textContent = 'Sort';

    const select = document.createElement('select');
    select.id = 'memberSort';
    select.setAttribute('aria-label', 'Sort members');

    const options = [
      ['az', 'A to Z'],
      ['za', 'Z to A'],
      ['newest', 'Recently added'],
      ['oldest', 'Oldest first'],
    ];

    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    });

    select.value = getSavedSort();
    select.addEventListener('change', () => {
      localStorage.setItem(SORT_KEY, select.value);
      renderMembers();
    });

    label.append(labelText, select);
    toolbar.insertBefore(label, newMemberButton);
  }

  renderMembers = function renderSortedMembers() {
    const query = els.memberSearch.value.trim().toLowerCase();
    const sortMode = document.querySelector('#memberSort')?.value || getSavedSort();

    const filtered = state.members.filter(member =>
      !query ||
      [member.name, member.display_name, member.pronouns, member.id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    );

    const members = sortMembers(filtered, sortMode);

    els.memberGrid.replaceChildren();
    els.membersEmpty.hidden = members.length > 0;

    members.forEach(member => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'member-card';

      const top = document.createElement('div');
      top.className = 'member-card-top';
      top.append(makeAvatar(member, 'member-card-avatar'));

      const nameWrap = document.createElement('div');
      nameWrap.className = 'member-card-name';

      const h3 = document.createElement('h3');
      h3.textContent = memberLabel(member);
      nameWrap.append(h3);

      if (member.display_name) {
        const displayName = document.createElement('p');
        displayName.className = 'member-card-display-name';
        displayName.textContent = member.display_name;
        nameWrap.append(displayName);
      }

      if (member.pronouns) {
        const pronouns = document.createElement('p');
        pronouns.className = 'member-card-pronouns';
        pronouns.textContent = member.pronouns;
        nameWrap.append(pronouns);
      }

      if (!member.display_name && !member.pronouns) {
        const id = document.createElement('p');
        id.textContent = member.id;
        nameWrap.append(id);
      }

      top.append(nameWrap);

      const bar = document.createElement('div');
      bar.className = 'member-color-bar';
      bar.style.background = /^[0-9a-f]{6}$/i.test(member.color || '')
        ? `#${member.color}`
        : 'var(--accent)';

      card.append(top, bar);
      card.addEventListener('click', () => openMemberDialog(member));
      els.memberGrid.append(card);
    });
  };

  installSortControl();

  if (state.members.length) {
    renderMembers();
  }
})();
