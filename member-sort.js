'use strict';

(function installMemberSorting() {
  const SORT_KEY = 'rainbow_member_sort';
  const validSorts = new Set(['az', 'za', 'newest', 'oldest']);

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

      const p = document.createElement('p');
      p.textContent = member.pronouns || member.name || member.id;

      nameWrap.append(h3, p);
      top.append(nameWrap);

      const desc = document.createElement('p');
      desc.className = 'member-card-desc';
      desc.textContent = member.description || 'No description';

      const bar = document.createElement('div');
      bar.className = 'member-color-bar';
      bar.style.background = /^[0-9a-f]{6}$/i.test(member.color || '')
        ? `#${member.color}`
        : 'var(--accent)';

      card.append(top, desc, bar);
      card.addEventListener('click', () => openMemberDialog(member));
      els.memberGrid.append(card);
    });
  };

  installSortControl();

  if (state.members.length) {
    renderMembers();
  }
})();
