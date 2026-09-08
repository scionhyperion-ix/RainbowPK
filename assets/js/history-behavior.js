'use strict';

(function refineRainbowHistory() {
  const HISTORY_VIEW_KEY = 'rainbow_history_view';
  const HISTORY_SORT_KEY = 'rainbow_history_sort';
  const HISTORY_RANGE_KEY = 'rainbow_history_range';
  const DEFAULT_MIGRATION_KEY = 'rainbow_history_calendar_default_v2';
  const PAGE_SIZE = 20;
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

  state.historyLogPage = 1;

  function memberName(member) {
    return member?.name || member?.display_name || member?.id || 'Unknown member';
  }

  function sortedSwitchMembers(sw) {
    return [...getSwitchMembers(sw)].sort((a, b) => collator.compare(memberName(a), memberName(b)));
  }

  function switchDateKey(sw) {
    const date = new Date(sw.timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function migrateDefaultView() {
    if (localStorage.getItem(DEFAULT_MIGRATION_KEY) === 'true') return;
    localStorage.setItem(HISTORY_VIEW_KEY, 'calendar');
    localStorage.setItem(DEFAULT_MIGRATION_KEY, 'true');
  }

  function resetPage() {
    state.historyLogPage = 1;
  }

  function replaceControl(id, onChange) {
    const oldControl = document.getElementById(id);
    if (!oldControl) return null;
    const control = oldControl.cloneNode(true);
    oldControl.replaceWith(control);
    control.addEventListener(control.matches('input') ? 'input' : 'change', onChange);
    return control;
  }

  function installControlBehavior() {
    const tools = document.getElementById('historyTools');
    if (!tools || tools.dataset.refinedHistory === 'true') return;
    tools.dataset.refinedHistory = 'true';

    const search = replaceControl('historySearch', () => {
      resetPage();
      renderHistory();
    });
    if (search) search.placeholder = 'Search members';

    replaceControl('historyMemberFilter', event => {
      resetPage();
      renderHistory();
    });

    replaceControl('historyRangeFilter', event => {
      localStorage.setItem(HISTORY_RANGE_KEY, event.target.value);
      state.historyDateFilter = '';
      resetPage();
      renderHistory();
    });

    replaceControl('historySort', event => {
      localStorage.setItem(HISTORY_SORT_KEY, event.target.value);
      resetPage();
      renderHistory();
    });

    const pagination = document.createElement('div');
    pagination.id = 'historyPagination';
    pagination.className = 'history-pagination';

    const previous = document.createElement('button');
    previous.id = 'historyPreviousPage';
    previous.type = 'button';
    previous.className = 'secondary-button';
    previous.textContent = 'Previous';
    previous.addEventListener('click', () => {
      state.historyLogPage = Math.max(1, state.historyLogPage - 1);
      renderHistory();
      document.getElementById('historyTools')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    const status = document.createElement('span');
    status.id = 'historyPageStatus';
    status.className = 'history-page-status';

    const next = document.createElement('button');
    next.id = 'historyNextPage';
    next.type = 'button';
    next.className = 'secondary-button';
    next.textContent = 'Next';
    next.addEventListener('click', () => {
      state.historyLogPage += 1;
      renderHistory();
      document.getElementById('historyTools')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    pagination.append(previous, status, next);
    const meta = tools.querySelector('.history-tools-meta');
    meta?.insertAdjacentElement('afterend', pagination);

    tools.querySelectorAll('[data-history-view-choice]').forEach(button => {
      button.addEventListener('click', resetPage);
    });

    const dateChip = document.getElementById('historyDateFilterChip');
    dateChip?.addEventListener('click', resetPage);
  }

  function historyControls() {
    const search = document.getElementById('historySearch');
    const member = document.getElementById('historyMemberFilter');
    const range = document.getElementById('historyRangeFilter');
    const sort = document.getElementById('historySort');
    return {
      search,
      member,
      range,
      sort,
      memberLabel: member?.closest('.feature-select'),
      rangeLabel: range?.closest('.feature-select'),
      sortLabel: sort?.closest('.feature-select'),
      searchLabel: search?.closest('.history-search'),
    };
  }

  function syncControlsForView(view) {
    const controls = historyControls();
    const memberMode = view === 'members';

    if (controls.searchLabel) {
      controls.searchLabel.hidden = false;
      controls.searchLabel.querySelector(':scope > span').textContent = memberMode ? 'Find member' : 'Search';
    }
    if (controls.search) controls.search.placeholder = memberMode ? 'Search member name' : 'Search members';
    if (controls.memberLabel) controls.memberLabel.hidden = memberMode;
    if (controls.rangeLabel) controls.rangeLabel.hidden = memberMode;
    if (controls.sortLabel) controls.sortLabel.hidden = memberMode;

    const dateChip = document.getElementById('historyDateFilterChip');
    if (dateChip && memberMode) dateChip.hidden = true;

    const pagination = document.getElementById('historyPagination');
    if (pagination) pagination.hidden = view !== 'log';
  }

  function filteredLogSwitches({ ignoreDate = false } = {}) {
    const controls = historyControls();
    const memberRef = controls.member?.value || 'all';
    const range = controls.range?.value || localStorage.getItem(HISTORY_RANGE_KEY) || 'all';
    const query = controls.search?.value.trim().toLowerCase() || '';
    const now = Date.now();

    const switches = state.switches.filter(sw => {
      const members = sortedSwitchMembers(sw);

      if (memberRef !== 'all' && !members.some(member => member.id === memberRef || member.uuid === memberRef)) return false;

      if (query && !members.some(member =>
        [member.name, member.display_name, member.pronouns, member.id]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query))
      )) return false;

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

    const sort = controls.sort?.value || localStorage.getItem(HISTORY_SORT_KEY) || 'newest';
    switches.sort((a, b) => sort === 'oldest'
      ? new Date(a.timestamp) - new Date(b.timestamp)
      : new Date(b.timestamp) - new Date(a.timestamp));
    return switches;
  }

  function makeHistoryRow(sw) {
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
    return row;
  }

  function renderLog() {
    const list = els.historyList;
    const switches = filteredLogSwitches();
    const pageCount = Math.max(1, Math.ceil(switches.length / PAGE_SIZE));
    state.historyLogPage = Math.min(Math.max(1, state.historyLogPage), pageCount);

    const start = (state.historyLogPage - 1) * PAGE_SIZE;
    const visible = switches.slice(start, start + PAGE_SIZE);
    list.replaceChildren();

    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'muted history-empty';
      empty.textContent = 'No switches match these filters.';
      list.append(empty);
    } else {
      visible.forEach(sw => list.append(makeHistoryRow(sw)));
    }

    const count = document.getElementById('historyResultCount');
    if (count) {
      if (!switches.length) count.textContent = '0 switches';
      else count.textContent = `${start + 1}-${Math.min(start + PAGE_SIZE, switches.length)} of ${switches.length} switches`;
    }

    const previous = document.getElementById('historyPreviousPage');
    const next = document.getElementById('historyNextPage');
    const status = document.getElementById('historyPageStatus');
    if (previous) previous.disabled = state.historyLogPage <= 1;
    if (next) next.disabled = state.historyLogPage >= pageCount;
    if (status) status.textContent = `Page ${state.historyLogPage} of ${pageCount}`;
  }

  function renderCalendar() {
    const root = document.getElementById('historyCalendarView');
    if (!root) return;
    root.replaceChildren();

    const month = state.historyCalendarMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const header = document.createElement('div');
    header.className = 'calendar-heading';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'secondary-button';
    previous.textContent = '‹';
    previous.setAttribute('aria-label', 'Previous month');
    const title = document.createElement('strong');
    title.textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month);
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'secondary-button';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Next month');

    previous.addEventListener('click', () => {
      state.historyCalendarMonth = new Date(year, monthIndex - 1, 1);
      renderCalendar();
    });
    next.addEventListener('click', () => {
      state.historyCalendarMonth = new Date(year, monthIndex + 1, 1);
      renderCalendar();
    });
    header.append(previous, title, next);

    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
      const label = document.createElement('span');
      label.className = 'calendar-weekday';
      label.textContent = day;
      grid.append(label);
    });

    const dayMap = new Map();
    filteredLogSwitches({ ignoreDate: true }).forEach(sw => {
      const date = new Date(sw.timestamp);
      if (date.getFullYear() !== year || date.getMonth() !== monthIndex) return;
      const key = switchDateKey(sw);
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key).push(sw);
    });

    const firstDay = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    for (let i = 0; i < firstDay; i += 1) {
      const blank = document.createElement('span');
      blank.className = 'calendar-day blank';
      grid.append(blank);
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entries = dayMap.get(key) || [];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      button.disabled = !entries.length;
      if (entries.length) button.classList.add('has-switches');

      const number = document.createElement('strong');
      number.textContent = String(day);
      const count = document.createElement('span');
      count.textContent = entries.length ? String(entries.length) : '';
      button.append(number, count);

      if (entries.length) {
        button.addEventListener('click', () => {
          state.historyDateFilter = key;
          state.historyLogPage = 1;
          localStorage.setItem(HISTORY_VIEW_KEY, 'log');
          renderHistory();
        });
      }
      grid.append(button);
    }

    root.append(header, grid);

    const count = document.getElementById('historyResultCount');
    if (count) {
      const monthCount = [...dayMap.values()].reduce((total, entries) => total + entries.length, 0);
      count.textContent = `${monthCount} switch${monthCount === 1 ? '' : 'es'} this month`;
    }
  }

  function renderByMember() {
    const root = document.getElementById('historyMembersView');
    if (!root) return;
    root.replaceChildren();

    const query = document.getElementById('historySearch')?.value.trim().toLowerCase() || '';
    const counts = new Map();
    const last = new Map();

    state.switches.forEach(sw => {
      sortedSwitchMembers(sw).forEach(member => {
        const key = member.uuid || member.id;
        counts.set(key, (counts.get(key) || 0) + 1);
        const time = new Date(sw.timestamp).getTime();
        if (!last.has(key) || time > last.get(key)) last.set(key, time);
      });
    });

    const members = [...state.members]
      .filter(member => {
        const key = member.uuid || member.id;
        if (!counts.has(key)) return false;
        if (!query) return true;
        return [member.name, member.display_name, member.pronouns, member.id]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => collator.compare(memberName(a), memberName(b)));

    if (!members.length) {
      const empty = document.createElement('p');
      empty.className = 'muted history-empty';
      empty.textContent = query ? 'No members match that search.' : 'No member switch history is loaded yet.';
      root.append(empty);
    } else {
      members.forEach(member => {
        const key = member.uuid || member.id;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history-member-card';
        button.append(makeAvatar(member, 'history-member-avatar'));

        const copy = document.createElement('span');
        copy.className = 'history-member-copy';
        const strong = document.createElement('strong');
        strong.textContent = memberName(member);
        const small = document.createElement('small');
        small.textContent = `${counts.get(key)} switch${counts.get(key) === 1 ? '' : 'es'}`;
        copy.append(strong, small);

        const latest = document.createElement('span');
        latest.className = 'history-member-last';
        latest.textContent = last.has(key) ? formatDateTime(new Date(last.get(key)).toISOString(), true) : '';
        button.append(copy, latest);

        button.addEventListener('click', () => {
          const search = document.getElementById('historySearch');
          const memberFilter = document.getElementById('historyMemberFilter');
          if (search) search.value = memberName(member);
          if (memberFilter) memberFilter.value = 'all';
          state.historyDateFilter = '';
          state.historyLogPage = 1;
          localStorage.setItem(HISTORY_VIEW_KEY, 'log');
          renderHistory();
        });
        root.append(button);
      });
    }

    const count = document.getElementById('historyResultCount');
    if (count) count.textContent = `${members.length} member${members.length === 1 ? '' : 's'}`;
  }

  renderHistory = function renderRefinedHistory() {
    const view = localStorage.getItem(HISTORY_VIEW_KEY) || 'calendar';
    const list = els.historyList;
    const calendar = document.getElementById('historyCalendarView');
    const members = document.getElementById('historyMembersView');

    syncControlsForView(view);

    if (list) list.hidden = view !== 'log';
    if (calendar) calendar.hidden = view !== 'calendar';
    if (members) members.hidden = view !== 'members';

    document.querySelectorAll('[data-history-view-choice]').forEach(button => {
      const active = button.dataset.historyViewChoice === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const dateChip = document.getElementById('historyDateFilterChip');
    if (dateChip && view !== 'members') {
      dateChip.hidden = !state.historyDateFilter;
      dateChip.textContent = state.historyDateFilter ? `${state.historyDateFilter} ×` : '';
    }

    const older = document.getElementById('loadOlderSwitches');
    if (older) older.hidden = !state.historyHasMore;

    if (view === 'calendar') renderCalendar();
    else if (view === 'members') renderByMember();
    else renderLog();
  };

  migrateDefaultView();
  installControlBehavior();
  renderHistory();
})();
