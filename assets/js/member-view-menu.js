'use strict';

(function installMemberViewMenu() {
  const VIEW_KEY = 'rainbow_member_view';
  const VALID_VIEWS = new Set(['cards', 'compact', 'list', 'tiles']);
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

  function memberName(member) {
    return member?.name || member?.display_name || member?.id || 'Unknown member';
  }

  function savedView() {
    const view = localStorage.getItem(VIEW_KEY);
    return VALID_VIEWS.has(view) ? view : 'cards';
  }

  function createdTime(member) {
    if (!member?.created) return null;
    const time = new Date(member.created).getTime();
    return Number.isNaN(time) ? null : time;
  }

  function compareNames(a, b) {
    return collator.compare(memberName(a), memberName(b));
  }

  function sortedMembers(members) {
    const mode = document.getElementById('memberSort')?.value || localStorage.getItem('rainbow_member_sort') || 'az';
    const sorted = [...members];

    if (mode === 'za') return sorted.sort((a, b) => compareNames(b, a));

    if (mode === 'newest' || mode === 'oldest') {
      return sorted.sort((a, b) => {
        const aTime = createdTime(a);
        const bTime = createdTime(b);

        if (aTime === null && bTime === null) return compareNames(a, b);
        if (aTime === null) return 1;
        if (bTime === null) return -1;

        const difference = mode === 'newest' ? bTime - aTime : aTime - bTime;
        return difference || compareNames(a, b);
      });
    }

    return sorted.sort(compareNames);
  }

  function installDropdown() {
    const toolbar = document.querySelector('#membersRoute .toolbar-row');
    const createButton = document.getElementById('createMemberButton');
    if (!toolbar || !createButton) return;

    document.querySelector('.member-view-switch')?.remove();

    let control = document.getElementById('memberViewControl');
    if (!control) {
      control = document.createElement('label');
      control.id = 'memberViewControl';
      control.className = 'feature-select member-view-control';
      control.htmlFor = 'memberViewSelect';

      const label = document.createElement('span');
      label.textContent = 'View';

      const select = document.createElement('select');
      select.id = 'memberViewSelect';
      select.setAttribute('aria-label', 'Member view');

      [
        ['cards', 'Card'],
        ['compact', 'Compact'],
        ['list', 'List'],
        ['tiles', 'Card tiles'],
      ].forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.append(option);
      });

      select.value = savedView();
      select.addEventListener('change', () => {
        localStorage.setItem(VIEW_KEY, select.value);
        renderMembers();
      });

      control.append(label, select);
      toolbar.insertBefore(control, createButton);
    }

    const select = document.getElementById('memberViewSelect');
    if (select) select.value = savedView();
  }

  function appendStandardIdentity(card, member) {
    const top = document.createElement('div');
    top.className = 'member-card-top';
    top.append(makeAvatar(member, 'member-card-avatar'));

    const copy = document.createElement('div');
    copy.className = 'member-card-name';

    const name = document.createElement('h3');
    name.textContent = memberName(member);
    copy.append(name);

    if (member.display_name) {
      const display = document.createElement('p');
      display.className = 'member-card-display-name';
      display.textContent = member.display_name;
      copy.append(display);
    }

    if (member.pronouns) {
      const pronouns = document.createElement('p');
      pronouns.className = 'member-card-pronouns';
      pronouns.textContent = member.pronouns;
      copy.append(pronouns);
    }

    if (!member.display_name && !member.pronouns && member.id) {
      const id = document.createElement('p');
      id.textContent = member.id;
      copy.append(id);
    }

    top.append(copy);
    card.append(top);
  }

  function appendMobileBanner(card, member) {
    if (!window.matchMedia('(max-width: 760px)').matches || !member.banner) return;
    const bannerUrl = typeof safeUrl === 'function' ? safeUrl(member.banner) : '';
    if (!bannerUrl) return;

    const banner = document.createElement('img');
    banner.className = 'member-card-banner';
    banner.src = bannerUrl;
    banner.alt = '';
    banner.loading = 'lazy';
    banner.decoding = 'async';
    banner.referrerPolicy = 'no-referrer';
    banner.setAttribute('aria-hidden', 'true');
    banner.addEventListener('error', () => {
      banner.remove();
      card.classList.remove('has-member-banner');
    }, { once: true });
    card.classList.add('has-member-banner');
    card.append(banner);
  }

  function appendColorBar(card, member) {
    const bar = document.createElement('div');
    bar.className = 'member-color-bar';
    bar.style.background = /^[0-9a-f]{6}$/i.test(member.color || '')
      ? `#${member.color}`
      : 'var(--accent)';
    card.append(bar);
  }

  function makeStandardCard(member) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'member-card';
    appendMobileBanner(card, member);
    appendStandardIdentity(card, member);
    appendColorBar(card, member);
    card.addEventListener('click', () => openMemberDialog(member));
    return card;
  }

  function makeTileCard(member) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'member-card member-card-tile';

    const header = document.createElement('div');
    header.className = 'member-tile-header';

    const marker = document.createElement('span');
    marker.className = 'member-tile-marker';
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = '●';

    const title = document.createElement('strong');
    title.className = 'member-tile-title';
    title.textContent = member.id ? `${memberName(member)} (${member.id})` : memberName(member);
    header.append(marker, title);

    const media = document.createElement('div');
    media.className = 'member-tile-media';
    const avatar = makeAvatar(member, 'member-tile-avatar');
    media.append(avatar);

    const details = document.createElement('div');
    details.className = 'member-tile-details';

    const primary = document.createElement('strong');
    primary.className = 'member-tile-primary';
    primary.textContent = member.display_name || member.name || member.id || 'Unknown member';
    details.append(primary);

    if (member.display_name && member.name && member.display_name !== member.name) {
      const systemName = document.createElement('span');
      systemName.className = 'member-tile-system-name';
      systemName.textContent = member.name;
      details.append(systemName);
    }

    const pronouns = document.createElement('span');
    pronouns.className = 'member-tile-pronouns';
    pronouns.textContent = member.pronouns || 'No pronouns';
    details.append(pronouns);

    const description = document.createElement('p');
    description.className = 'member-tile-description';
    description.textContent = member.description || 'No description';
    details.append(description);

    card.append(header, media, details);
    appendColorBar(card, member);
    card.addEventListener('click', () => openMemberDialog(member));
    return card;
  }

  renderMembers = function renderMembersWithDropdownViews() {
    const query = els.memberSearch.value.trim().toLowerCase();
    const view = savedView();
    const select = document.getElementById('memberViewSelect');
    if (select && select.value !== view) select.value = view;

    const members = sortedMembers(state.members.filter(member =>
      !query || [member.name, member.display_name, member.pronouns, member.id, member.description]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    ));

    els.memberGrid.dataset.memberView = view;
    els.memberGrid.replaceChildren();
    els.membersEmpty.hidden = members.length > 0;

    members.forEach(member => {
      els.memberGrid.append(view === 'tiles' ? makeTileCard(member) : makeStandardCard(member));
    });
  };

  installDropdown();

  const toolbarObserver = new MutationObserver(() => installDropdown());
  const membersRoute = document.getElementById('membersRoute');
  if (membersRoute) toolbarObserver.observe(membersRoute, { childList: true, subtree: true });

  if (state.members.length) renderMembers();
})();
