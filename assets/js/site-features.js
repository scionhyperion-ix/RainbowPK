'use strict';

(function installRainbowSiteFeatures() {
  const MEMBER_VIEW_KEY = 'rainbow_member_view';
  const MEMBER_GROUP_KEY = 'rainbow_member_group_filter';
  const HISTORY_VIEW_KEY = 'rainbow_history_view';
  const HISTORY_SORT_KEY = 'rainbow_history_sort';
  const HISTORY_RANGE_KEY = 'rainbow_history_range';

  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const originalApi = api;

  state.groups = Array.isArray(state.groups) ? state.groups : [];
  state.historyHasMore = false;
  state.historyDateFilter = '';
  state.historyCalendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  function memberName(member) {
    return member?.name || member?.display_name || member?.id || 'Unknown member';
  }

  function groupName(group) {
    return group?.display_name || group?.name || group?.id || 'Unnamed group';
  }

  function sortedMembers(members) {
    return [...members].sort((a, b) => collator.compare(memberName(a), memberName(b)));
  }

  function sortedSwitchMembers(sw) {
    return sortedMembers(getSwitchMembers(sw));
  }

  function memberGroups(member) {
    if (!member) return [];
    return state.groups.filter(group => {
      const refs = Array.isArray(group.members) ? group.members : [];
      return refs.includes(member.uuid) || refs.includes(member.id);
    });
  }

  function selectedGroupRefs() {
    return $$('#memberGroupPicker input:checked').map(input => input.value);
  }

  function collectProxyTags() {
    return $$('#proxyTagsList .proxy-tag-row').map(row => {
      const prefix = $('.proxy-prefix', row)?.value ?? '';
      const suffix = $('.proxy-suffix', row)?.value ?? '';
      return {
        prefix: prefix || null,
        suffix: suffix || null,
      };
    }).filter(tag => tag.prefix || tag.suffix);
  }

  api = async function featureAwareApi(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const memberCreate = path === '/members' && method === 'POST';
    const memberUpdate = /^\/members\/[^/]+$/.test(path) && method === 'PATCH';

    if (!memberCreate && !memberUpdate) return originalApi(path, options);

    const body = { ...(options.body || {}) };
    const dialogOpen = Boolean(document.querySelector('#memberDialog[open]'));

    if (dialogOpen && document.querySelector('#memberProxySection')) {
      body.proxy_tags = collectProxyTags();
      body.keep_proxy = Boolean($('#memberKeepProxy')?.checked);
    }

    const result = await originalApi(path, { ...options, body });

    if (dialogOpen && document.querySelector('#memberGroupPicker')) {
      const ref = memberCreate
        ? (result?.id || result?.uuid)
        : decodeURIComponent(path.split('/').pop());

      if (ref) {
        try {
          await originalApi(`/members/${encodeURIComponent(ref)}/groups/overwrite`, {
            method: 'POST',
            body: selectedGroupRefs(),
          });
        } catch (error) {
          showToast('Member saved, groups not updated', friendlyError(error), 'error');
        }
      }
    }

    return result;
  };

  loadData = async function loadDataWithGroups() {
    const [system, members, fronters, switches, groups] = await Promise.all([
      api('/systems/@me'),
      api('/systems/@me/members'),
      api('/systems/@me/fronters'),
      api('/systems/@me/switches?limit=100'),
      api('/systems/@me/groups?with_members=true'),
    ]);

    state.system = system;
    state.members = Array.isArray(members) ? members : [];
    rebuildMemberMap();
    state.fronters = fronters;
    state.switches = Array.isArray(switches) ? switches : [];
    state.groups = Array.isArray(groups) ? groups : [];
    state.historyHasMore = state.switches.length === 100;

    refreshFeatureControls();
    renderAll();
  };

  buildMemberPicker = function buildAlphabeticalMemberPicker(container, { selected = [], query = '', radio = false } = {}) {
    container.replaceChildren();
    const selectedSet = new Set(selected);
    const normalized = query.trim().toLowerCase();
    const members = sortedMembers(state.members.filter(member =>
      !normalized ||
      [member.name, member.display_name, member.pronouns, member.id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalized))
    ));

    members.forEach(member => {
      const label = document.createElement('label');
      label.className = 'picker-row';
      label.append(makeAvatar(member, 'picker-avatar'));

      const copy = document.createElement('span');
      copy.className = 'picker-copy';
      const strong = document.createElement('strong');
      strong.textContent = memberName(member);
      const small = document.createElement('small');
      small.textContent = member.pronouns || member.display_name || member.id;
      copy.append(strong, small);

      const input = document.createElement('input');
      input.type = radio ? 'radio' : 'checkbox';
      input.name = radio ? 'frontMember' : `member-${container.id}`;
      input.value = member.id;
      input.checked = selectedSet.has(member.id) || selectedSet.has(member.uuid);

      label.append(copy, input);
      container.append(label);
    });
  };

  function sortMemberList(members) {
    const mode = $('#memberSort')?.value || localStorage.getItem('rainbow_member_sort') || 'az';
    const list = [...members];

    if (mode === 'za') return list.sort((a, b) => collator.compare(memberName(b), memberName(a)));
    if (mode === 'newest' || mode === 'oldest') {
      return list.sort((a, b) => {
        const at = a?.created ? new Date(a.created).getTime() : NaN;
        const bt = b?.created ? new Date(b.created).getTime() : NaN;
        if (Number.isNaN(at) && Number.isNaN(bt)) return collator.compare(memberName(a), memberName(b));
        if (Number.isNaN(at)) return 1;
        if (Number.isNaN(bt)) return -1;
        return (mode === 'newest' ? bt - at : at - bt) || collator.compare(memberName(a), memberName(b));
      });
    }
    return list.sort((a, b) => collator.compare(memberName(a), memberName(b)));
  }

  function memberMatchesGroup(member, groupRef) {
    if (!groupRef || groupRef === 'all') return true;
    const group = state.groups.find(item => item.id === groupRef || item.uuid === groupRef);
    if (!group) return true;
    const refs = Array.isArray(group.members) ? group.members : [];
    return refs.includes(member.uuid) || refs.includes(member.id);
  }

  renderMembers = function renderMembersWithViewsAndGroups() {
    const query = els.memberSearch.value.trim().toLowerCase();
    const groupRef = $('#memberGroupFilter')?.value || 'all';
    const view = localStorage.getItem(MEMBER_VIEW_KEY) || 'cards';

    const members = sortMemberList(state.members.filter(member =>
      memberMatchesGroup(member, groupRef) &&
      (!query || [member.name, member.display_name, member.pronouns, member.id]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query)))
    ));

    els.memberGrid.dataset.memberView = view;
    els.memberGrid.replaceChildren();
    els.membersEmpty.hidden = members.length > 0;

    members.forEach(member => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'member-card';

      if (window.matchMedia('(max-width: 760px)').matches && member.banner) {
        const bannerUrl = safeUrl(member.banner);
        if (bannerUrl) {
          const banner = document.createElement('img');
          banner.className = 'member-card-banner';
          banner.src = bannerUrl;
          banner.alt = '';
          banner.loading = 'lazy';
          banner.decoding = 'async';
          banner.referrerPolicy = 'no-referrer';
          banner.addEventListener('error', () => {
            banner.remove();
            card.classList.remove('has-member-banner');
          }, { once: true });
          card.classList.add('has-member-banner');
          card.append(banner);
        }
      }

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

      top.append(copy);

      const groups = memberGroups(member);
      if (groups.length) {
        const groupWrap = document.createElement('div');
        groupWrap.className = 'member-card-groups';
        groups.slice(0, view === 'list' ? 4 : 2).forEach(group => {
          const chip = document.createElement('span');
          chip.textContent = groupName(group);
          groupWrap.append(chip);
        });
        if (groups.length > (view === 'list' ? 4 : 2)) {
          const more = document.createElement('span');
          more.textContent = `+${groups.length - (view === 'list' ? 4 : 2)}`;
          groupWrap.append(more);
        }
        card.append(top, groupWrap);
      } else {
        card.append(top);
      }

      const bar = document.createElement('div');
      bar.className = 'member-color-bar';
      bar.style.background = /^[0-9a-f]{6}$/i.test(member.color || '') ? `#${member.color}` : 'var(--accent)';
      card.append(bar);
      card.addEventListener('click', () => openMemberDialog(member));
      els.memberGrid.append(card);
    });

    syncMemberViewButtons();
  };

  function makeSelect(id, labelText, options) {
    const label = document.createElement('label');
    label.className = 'feature-select';
    label.htmlFor = id;
    const span = document.createElement('span');
    span.textContent = labelText;
    const select = document.createElement('select');
    select.id = id;
    options.forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.append(option);
    });
    label.append(span, select);
    return { label, select };
  }

  function installMemberToolbar() {
    const toolbar = document.querySelector('#membersRoute .toolbar-row');
    if (!toolbar || $('#memberGroupFilter')) return;

    const groupControl = makeSelect('memberGroupFilter', 'Group', [['all', 'All groups']]);
    groupControl.select.value = localStorage.getItem(MEMBER_GROUP_KEY) || 'all';
    groupControl.select.addEventListener('change', () => {
      localStorage.setItem(MEMBER_GROUP_KEY, groupControl.select.value);
      renderMembers();
    });

    const views = document.createElement('div');
    views.className = 'view-switch member-view-switch';
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', 'Member view');
    [['cards', 'Cards'], ['compact', 'Compact'], ['list', 'List']].forEach(([value, text]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.memberViewChoice = value;
      button.textContent = text;
      button.addEventListener('click', () => {
        localStorage.setItem(MEMBER_VIEW_KEY, value);
        renderMembers();
      });
      views.append(button);
    });

    const newButton = $('#createMemberButton');
    toolbar.insertBefore(groupControl.label, newButton);
    toolbar.insertBefore(views, newButton);
    refreshGroupOptions();
    syncMemberViewButtons();
  }

  function syncMemberViewButtons() {
    const active = localStorage.getItem(MEMBER_VIEW_KEY) || 'cards';
    $$('[data-member-view-choice]').forEach(button => {
      const selected = button.dataset.memberViewChoice === active;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function refreshGroupOptions() {
    const select = $('#memberGroupFilter');
    if (!select) return;
    const current = select.value || localStorage.getItem(MEMBER_GROUP_KEY) || 'all';
    select.replaceChildren();
    [['all', 'All groups'], ...[...state.groups]
      .sort((a, b) => collator.compare(groupName(a), groupName(b)))
      .map(group => [group.id || group.uuid, groupName(group)])]
      .forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.append(option);
      });
    select.value = [...select.options].some(option => option.value === current) ? current : 'all';
  }

  function addProxyRow(tag = {}) {
    const list = $('#proxyTagsList');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'proxy-tag-row';

    const prefix = document.createElement('input');
    prefix.type = 'text';
    prefix.className = 'proxy-prefix';
    prefix.maxLength = 100;
    prefix.placeholder = 'Prefix, for example [';
    prefix.value = tag.prefix || '';
    prefix.setAttribute('aria-label', 'Proxy prefix');

    const suffix = document.createElement('input');
    suffix.type = 'text';
    suffix.className = 'proxy-suffix';
    suffix.maxLength = 100;
    suffix.placeholder = 'Suffix, for example ]';
    suffix.value = tag.suffix || '';
    suffix.setAttribute('aria-label', 'Proxy suffix');

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-button proxy-remove';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove proxy tag');
    remove.addEventListener('click', () => {
      row.remove();
      if (!$('#proxyTagsList')?.children.length) addProxyRow();
    });

    row.append(prefix, suffix, remove);
    list.append(row);
  }

  function buildGroupPicker(member = null) {
    const picker = $('#memberGroupPicker');
    if (!picker) return;
    picker.replaceChildren();
    const selected = new Set(memberGroups(member).flatMap(group => [group.id, group.uuid]).filter(Boolean));

    const groups = [...state.groups].sort((a, b) => collator.compare(groupName(a), groupName(b)));
    if (!groups.length) {
      const empty = document.createElement('p');
      empty.className = 'muted group-picker-empty';
      empty.textContent = 'No PluralKit groups yet.';
      picker.append(empty);
      return;
    }

    groups.forEach(group => {
      const label = document.createElement('label');
      label.className = 'group-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = group.id || group.uuid;
      input.checked = selected.has(group.id) || selected.has(group.uuid);
      const text = document.createElement('span');
      text.textContent = groupName(group);
      label.append(input, text);
      picker.append(label);
    });
  }

  function installMemberFeatureFields() {
    const form = $('#memberForm');
    const profileGrid = $('#memberFieldsStage .form-grid.two-col');
    if (!form || !profileGrid || $('#memberGroupPicker')) return;

    const groupSection = document.createElement('div');
    groupSection.className = 'member-groups-field';
    groupSection.innerHTML = `
      <div class="feature-field-heading">
        <strong>Groups</strong>
        <small>Choose which PluralKit groups this member belongs to.</small>
      </div>
      <div id="memberGroupPicker" class="member-group-picker"></div>`;
    profileGrid.append(groupSection);

    const proxySection = document.createElement('section');
    proxySection.id = 'memberProxySection';
    proxySection.className = 'member-proxy-section';
    proxySection.innerHTML = `
      <div class="feature-field-heading">
        <strong>Proxy tags</strong>
        <small>Add a prefix, suffix, or both. Blank rows are ignored.</small>
      </div>
      <div id="proxyTagsList" class="proxy-tags-list"></div>
      <div class="proxy-actions">
        <button id="addProxyTagButton" class="secondary-button" type="button">Add proxy tag</button>
        <label class="proxy-keep-row"><input id="memberKeepProxy" type="checkbox"><span>Keep proxy tags in proxied messages</span></label>
      </div>`;

    const notesPanel = $('#mobileMemberPanel-notes');
    const description = $('.description-field', $('#memberFieldsStage'));
    if (notesPanel) notesPanel.append(proxySection);
    else description?.insertAdjacentElement('afterend', proxySection);

    $('#addProxyTagButton').addEventListener('click', () => addProxyRow());

    const deleteZone = document.createElement('div');
    deleteZone.className = 'member-delete-zone';
    deleteZone.innerHTML = '<button id="deleteMemberButton" class="text-button danger-text" type="button">Delete member</button>';
    $('#memberReviewFooter')?.insertAdjacentElement('afterend', deleteZone);

    $('#deleteMemberButton').addEventListener('click', deleteCurrentMember);

    const originalOpenMemberDialog = openMemberDialog;
    openMemberDialog = function openMemberDialogWithFeatures(member = null) {
      originalOpenMemberDialog(member);
      requestAnimationFrame(() => populateMemberFeatures(member));
    };

    form.addEventListener('submit', () => {
      window.setTimeout(appendFeatureReviewRows, 0);
    });

    populateMemberFeatures(null);
  }

  function populateMemberFeatures(member) {
    buildGroupPicker(member);
    const list = $('#proxyTagsList');
    if (list) {
      list.replaceChildren();
      const tags = Array.isArray(member?.proxy_tags) && member.proxy_tags.length ? member.proxy_tags : [{}];
      tags.forEach(addProxyRow);
    }
    if ($('#memberKeepProxy')) $('#memberKeepProxy').checked = Boolean(member?.keep_proxy);
    if ($('#deleteMemberButton')) $('#deleteMemberButton').hidden = !member;
  }

  function appendFeatureReviewRows() {
    const stage = $('#memberReviewStage');
    const list = $('#memberReviewList');
    if (!stage || stage.hidden || !list || list.dataset.featuresAdded === 'true') return;
    list.dataset.featuresAdded = 'true';

    const add = (labelText, valueText) => {
      const row = document.createElement('div');
      row.dataset.featureReview = 'true';
      const label = document.createElement('span');
      label.textContent = labelText;
      const value = document.createElement('strong');
      value.textContent = valueText;
      row.append(label, value);
      list.append(row);
    };

    const groups = selectedGroupRefs().map(ref => state.groups.find(group => group.id === ref || group.uuid === ref)).filter(Boolean);
    const proxies = collectProxyTags();
    add('Groups', groups.length ? groups.map(groupName).join(', ') : 'None');
    add('Proxy tags', proxies.length ? proxies.map(tag => `${tag.prefix || ''}text${tag.suffix || ''}`).join(', ') : 'None');
    add('Keep proxy tags', $('#memberKeepProxy')?.checked ? 'Yes' : 'No');
  }

  const reviewObserver = new MutationObserver(() => {
    const list = $('#memberReviewList');
    if (!list) return;
    if (!$('#memberReviewStage')?.hidden) {
      list.dataset.featuresAdded = 'false';
      window.setTimeout(appendFeatureReviewRows, 0);
    }
  });

  function startReviewObserver() {
    const list = $('#memberReviewList');
    if (list) reviewObserver.observe(list, { childList: true });
  }

  async function deleteCurrentMember() {
    const ref = $('#memberRef')?.value;
    if (!ref) return;
    const member = state.members.find(item => item.id === ref || item.uuid === ref);
    const label = memberName(member);
    if (!window.confirm(`Delete ${label} from PluralKit? This cannot be undone.`)) return;

    const button = $('#deleteMemberButton');
    button.disabled = true;
    try {
      await api(`/members/${encodeURIComponent(ref)}`, { method: 'DELETE' });
      els.memberDialog.close();
      showToast('Member deleted', `${label} was removed from PluralKit.`);
      await loadData();
    } catch (error) {
      showToast('Delete failed', friendlyError(error), 'error');
    } finally {
      button.disabled = false;
    }
  }

  function installHistoryTools() {
    const panel = $('#historyRoute .section-panel');
    const list = $('#historyList');
    if (!panel || !list || $('#historyTools')) return;

    const tools = document.createElement('div');
    tools.id = 'historyTools';
    tools.className = 'history-tools';

    const views = document.createElement('div');
    views.className = 'view-switch history-view-switch';
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', 'History view');
    [['log', 'Log'], ['calendar', 'Calendar'], ['members', 'By member']].forEach(([value, text]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.historyViewChoice = value;
      button.textContent = text;
      button.addEventListener('click', () => {
        localStorage.setItem(HISTORY_VIEW_KEY, value);
        state.historyDateFilter = '';
        renderHistory();
      });
      views.append(button);
    });

    const memberFilter = makeSelect('historyMemberFilter', 'Member', [['all', 'All members']]);
    memberFilter.select.addEventListener('change', renderHistory);

    const rangeFilter = makeSelect('historyRangeFilter', 'Range', [
      ['all', 'All loaded'],
      ['today', 'Today'],
      ['7', 'Last 7 days'],
      ['30', 'Last 30 days'],
    ]);
    rangeFilter.select.value = localStorage.getItem(HISTORY_RANGE_KEY) || 'all';
    rangeFilter.select.addEventListener('change', () => {
      localStorage.setItem(HISTORY_RANGE_KEY, rangeFilter.select.value);
      state.historyDateFilter = '';
      renderHistory();
    });

    const sort = makeSelect('historySort', 'Sort', [['newest', 'Newest first'], ['oldest', 'Oldest first']]);
    sort.select.value = localStorage.getItem(HISTORY_SORT_KEY) || 'newest';
    sort.select.addEventListener('change', () => {
      localStorage.setItem(HISTORY_SORT_KEY, sort.select.value);
      renderHistory();
    });

    const search = document.createElement('label');
    search.className = 'history-search';
    search.innerHTML = '<span>Search</span><input id="historySearch" type="search" placeholder="Member name" autocomplete="off">';
    $('#historySearch', search).addEventListener('input', renderHistory);

    const clearDate = document.createElement('button');
    clearDate.id = 'historyDateFilterChip';
    clearDate.className = 'history-date-filter-chip';
    clearDate.type = 'button';
    clearDate.hidden = true;
    clearDate.addEventListener('click', () => {
      state.historyDateFilter = '';
      renderHistory();
    });

    const meta = document.createElement('div');
    meta.className = 'history-tools-meta';
    meta.innerHTML = '<span id="historyResultCount"></span><button id="loadOlderSwitches" class="text-button" type="button">Load older</button>';
    $('#loadOlderSwitches', meta).addEventListener('click', loadOlderSwitches);

    tools.append(views, search, memberFilter.label, rangeFilter.label, sort.label, clearDate, meta);
    list.insertAdjacentElement('beforebegin', tools);

    const calendar = document.createElement('div');
    calendar.id = 'historyCalendarView';
    calendar.className = 'history-calendar-view';
    calendar.hidden = true;
    list.insertAdjacentElement('beforebegin', calendar);

    const members = document.createElement('div');
    members.id = 'historyMembersView';
    members.className = 'history-members-view';
    members.hidden = true;
    list.insertAdjacentElement('beforebegin', members);

    refreshHistoryMemberOptions();
  }

  function refreshHistoryMemberOptions() {
    const select = $('#historyMemberFilter');
    if (!select) return;
    const current = select.value || 'all';
    select.replaceChildren();
    [['all', 'All members'], ...sortedMembers(state.members).map(member => [member.id, memberName(member)])]
      .forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.append(option);
      });
    select.value = [...select.options].some(option => option.value === current) ? current : 'all';
  }

  function switchDateKey(sw) {
    const date = new Date(sw.timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function historyFilteredSwitches({ ignoreDate = false } = {}) {
    const memberRef = $('#historyMemberFilter')?.value || 'all';
    const range = $('#historyRangeFilter')?.value || localStorage.getItem(HISTORY_RANGE_KEY) || 'all';
    const search = $('#historySearch')?.value.trim().toLowerCase() || '';
    const now = Date.now();

    let switches = state.switches.filter(sw => {
      const members = sortedSwitchMembers(sw);
      if (memberRef !== 'all' && !members.some(member => member.id === memberRef || member.uuid === memberRef)) return false;
      if (search && !members.some(member => [member.name, member.display_name, member.pronouns, member.id]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(search)))) return false;

      if (range !== 'all') {
        const time = new Date(sw.timestamp).getTime();
        if (range === 'today') {
          const date = new Date(sw.timestamp);
          const today = new Date();
          if (date.getFullYear() !== today.getFullYear() || date.getMonth() !== today.getMonth() || date.getDate() !== today.getDate()) return false;
        } else {
          const days = Number(range);
          if (Number.isFinite(days) && now - time > days * 86400000) return false;
        }
      }

      if (!ignoreDate && state.historyDateFilter && switchDateKey(sw) !== state.historyDateFilter) return false;
      return true;
    });

    const sort = $('#historySort')?.value || localStorage.getItem(HISTORY_SORT_KEY) || 'newest';
    switches.sort((a, b) => sort === 'oldest'
      ? new Date(a.timestamp) - new Date(b.timestamp)
      : new Date(b.timestamp) - new Date(a.timestamp));
    return switches;
  }

  renderHistory = function renderHistoryViews() {
    const view = localStorage.getItem(HISTORY_VIEW_KEY) || 'log';
    const switches = historyFilteredSwitches();
    const list = els.historyList;
    const calendar = $('#historyCalendarView');
    const membersView = $('#historyMembersView');

    list.hidden = view !== 'log';
    if (calendar) calendar.hidden = view !== 'calendar';
    if (membersView) membersView.hidden = view !== 'members';

    $$('[data-history-view-choice]').forEach(button => {
      const active = button.dataset.historyViewChoice === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const count = $('#historyResultCount');
    if (count) count.textContent = `${switches.length} switch${switches.length === 1 ? '' : 'es'} shown`;
    const older = $('#loadOlderSwitches');
    if (older) older.hidden = !state.historyHasMore;

    const dateChip = $('#historyDateFilterChip');
    if (dateChip) {
      dateChip.hidden = !state.historyDateFilter;
      dateChip.textContent = state.historyDateFilter ? `${state.historyDateFilter} ×` : '';
    }

    if (view === 'calendar') {
      renderHistoryCalendar();
      return;
    }
    if (view === 'members') {
      renderHistoryByMember();
      return;
    }

    list.replaceChildren();
    if (!switches.length) {
      const p = document.createElement('p');
      p.className = 'muted history-empty';
      p.textContent = 'No switches match these filters.';
      list.append(p);
      return;
    }

    switches.forEach(sw => {
      const members = sortedSwitchMembers(sw);
      const row = document.createElement('div');
      row.className = 'history-row';
      const date = document.createElement('div');
      date.className = 'history-date';
      date.textContent = formatDateTime(sw.timestamp);
      const memberWrap = document.createElement('div');
      memberWrap.className = 'history-members';

      if (!members.length) {
        const pill = document.createElement('span');
        pill.className = 'mini-member-pill';
        pill.textContent = 'Switch out';
        memberWrap.append(pill);
      } else {
        members.forEach(member => {
          const pill = document.createElement('span');
          pill.className = 'mini-member-pill';
          const dot = document.createElement('span');
          dot.className = 'mini-dot';
          if (/^[0-9a-f]{6}$/i.test(member.color || '')) dot.style.background = `#${member.color}`;
          const text = document.createElement('span');
          text.textContent = memberName(member);
          pill.append(dot, text);
          memberWrap.append(pill);
        });
      }

      const edit = document.createElement('button');
      edit.className = 'secondary-button';
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => openHistoryDialog(sw));
      row.append(date, memberWrap, edit);
      list.append(row);
    });
  };

  function renderHistoryCalendar() {
    const root = $('#historyCalendarView');
    if (!root) return;
    root.replaceChildren();
    const month = state.historyCalendarMonth;
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);

    const header = document.createElement('div');
    header.className = 'calendar-heading';
    const prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'secondary-button'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Previous month');
    const title = document.createElement('strong'); title.textContent = monthName;
    const next = document.createElement('button');
    next.type = 'button'; next.className = 'secondary-button'; next.textContent = '›'; next.setAttribute('aria-label', 'Next month');
    prev.addEventListener('click', () => { state.historyCalendarMonth = new Date(year, monthIndex - 1, 1); renderHistoryCalendar(); });
    next.addEventListener('click', () => { state.historyCalendarMonth = new Date(year, monthIndex + 1, 1); renderHistoryCalendar(); });
    header.append(prev, title, next);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      const head = document.createElement('span'); head.className = 'calendar-weekday'; head.textContent = day; grid.append(head);
    });

    const all = historyFilteredSwitches({ ignoreDate: true });
    const dayMap = new Map();
    all.forEach(sw => {
      const date = new Date(sw.timestamp);
      if (date.getFullYear() !== year || date.getMonth() !== monthIndex) return;
      const key = switchDateKey(sw);
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key).push(sw);
    });

    const firstDay = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('span'); blank.className = 'calendar-day blank'; grid.append(blank);
    }

    for (let day = 1; day <= totalDays; day++) {
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entries = dayMap.get(key) || [];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      if (entries.length) button.classList.add('has-switches');
      const number = document.createElement('strong'); number.textContent = String(day);
      const count = document.createElement('span'); count.textContent = entries.length ? `${entries.length}` : '';
      button.append(number, count);
      button.disabled = !entries.length;
      if (entries.length) {
        const names = [...new Set(entries.flatMap(sortedSwitchMembers).map(memberName))].slice(0, 3);
        button.title = names.length ? names.join(', ') : 'Switch out';
        button.addEventListener('click', () => {
          state.historyDateFilter = key;
          localStorage.setItem(HISTORY_VIEW_KEY, 'log');
          renderHistory();
        });
      }
      grid.append(button);
    }

    root.append(header, grid);
  }

  function renderHistoryByMember() {
    const root = $('#historyMembersView');
    if (!root) return;
    root.replaceChildren();
    const switches = historyFilteredSwitches({ ignoreDate: true });
    const counts = new Map();
    const last = new Map();

    switches.forEach(sw => {
      sortedSwitchMembers(sw).forEach(member => {
        const key = member.uuid || member.id;
        counts.set(key, (counts.get(key) || 0) + 1);
        const time = new Date(sw.timestamp).getTime();
        if (!last.has(key) || time > last.get(key)) last.set(key, time);
      });
    });

    const rows = sortedMembers(state.members.filter(member => counts.has(member.uuid || member.id)));
    if (!rows.length) {
      const empty = document.createElement('p'); empty.className = 'muted history-empty'; empty.textContent = 'No members match these filters.'; root.append(empty); return;
    }

    rows.forEach(member => {
      const key = member.uuid || member.id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-member-card';
      button.append(makeAvatar(member, 'history-member-avatar'));
      const copy = document.createElement('span');
      copy.className = 'history-member-copy';
      const strong = document.createElement('strong'); strong.textContent = memberName(member);
      const small = document.createElement('small'); small.textContent = `${counts.get(key)} switch${counts.get(key) === 1 ? '' : 'es'}`;
      copy.append(strong, small);
      const latest = document.createElement('span'); latest.className = 'history-member-last'; latest.textContent = last.has(key) ? formatDateTime(new Date(last.get(key)).toISOString(), true) : '';
      button.append(copy, latest);
      button.addEventListener('click', () => {
        const filter = $('#historyMemberFilter');
        if (filter) filter.value = member.id;
        localStorage.setItem(HISTORY_VIEW_KEY, 'log');
        state.historyDateFilter = '';
        renderHistory();
      });
      root.append(button);
    });
  }

  async function loadOlderSwitches() {
    const button = $('#loadOlderSwitches');
    if (!button || !state.switches.length) return;
    button.disabled = true;
    button.textContent = 'Loading...';
    try {
      const oldest = [...state.switches].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
      const batch = await api(`/systems/@me/switches?limit=100&before=${encodeURIComponent(oldest.timestamp)}`);
      const incoming = Array.isArray(batch) ? batch : [];
      const map = new Map(state.switches.map(sw => [sw.id, sw]));
      incoming.forEach(sw => map.set(sw.id, sw));
      state.switches = [...map.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      state.historyHasMore = incoming.length === 100;
      renderHistory();
      renderRecentSwitches();
      showToast('Older history loaded', `${incoming.length} older switch${incoming.length === 1 ? '' : 'es'} added.`);
    } catch (error) {
      showToast('Could not load older history', friendlyError(error), 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Load older';
    }
  }

  const originalRenderRecentSwitches = renderRecentSwitches;
  renderRecentSwitches = function renderRecentSwitchesAlphabetically() {
    els.recentSwitches.replaceChildren();
    const switches = state.switches.slice(0, 6);
    if (!switches.length) {
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No switch history yet.'; els.recentSwitches.append(p); return;
    }
    switches.forEach(sw => {
      const members = sortedSwitchMembers(sw);
      const row = document.createElement('div'); row.className = 'timeline-row';
      row.append(members[0] ? makeAvatar(members[0], 'timeline-avatar') : makeAvatar({ name: 'Out' }, 'timeline-avatar'));
      const copy = document.createElement('div'); copy.className = 'timeline-copy';
      const strong = document.createElement('strong'); strong.textContent = members.length ? members.map(memberName).join(', ') : 'Switch out';
      const small = document.createElement('small'); small.textContent = formatDateTime(sw.timestamp, true);
      copy.append(strong, small);
      const time = document.createElement('span'); time.className = 'timeline-time'; time.textContent = relativeTime(sw.timestamp);
      row.append(copy, time); els.recentSwitches.append(row);
    });
  };

  function refreshFeatureControls() {
    installMemberToolbar();
    installHistoryTools();
    installMemberFeatureFields();
    refreshGroupOptions();
    refreshHistoryMemberOptions();
    buildGroupPicker(state.members.find(member => member.id === $('#memberRef')?.value || member.uuid === $('#memberRef')?.value) || null);
  }

  installMemberToolbar();
  installHistoryTools();
  installMemberFeatureFields();
  startReviewObserver();
  refreshFeatureControls();

  if (state.members.length) {
    renderMembers();
    renderHistory();
  }
})();
