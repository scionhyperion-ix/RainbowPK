'use strict';

(function installTopFronter() {
  function topFronterData() {
    const counts = new Map();

    state.switches.forEach(sw => {
      (sw.members || []).forEach(ref => {
        const member = resolveMember(ref);
        if (!member) return;

        const key = member.uuid || member.id;
        const entry = counts.get(key) || { member, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      });
    });

    return [...counts.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return memberLabel(a.member).localeCompare(memberLabel(b.member), undefined, {
        sensitivity: 'base',
        numeric: true,
      });
    })[0] || null;
  }

  function ensureTopFronterSection() {
    const panel = document.querySelector('.system-summary-panel');
    if (!panel) return null;

    let section = document.querySelector('#topFronterSection');
    if (section) return section;

    section = document.createElement('div');
    section.id = 'topFronterSection';
    section.className = 'top-fronter-section';

    const stats = panel.querySelector('.stats-row');
    if (stats) {
      stats.insertAdjacentElement('afterend', section);
    } else {
      panel.append(section);
    }

    return section;
  }

  function renderTopFronter() {
    const section = ensureTopFronterSection();
    if (!section) return;

    section.replaceChildren();

    const label = document.createElement('p');
    label.className = 'eyebrow top-fronter-eyebrow';
    label.textContent = 'Top fronter';
    section.append(label);

    const top = topFronterData();

    if (!top) {
      const empty = document.createElement('p');
      empty.className = 'top-fronter-empty';
      empty.textContent = 'No recent front data yet.';
      section.append(empty);
      return;
    }

    const row = document.createElement('div');
    row.className = 'top-fronter-row';
    row.append(makeAvatar(top.member, 'top-fronter-avatar'));

    const copy = document.createElement('div');
    copy.className = 'top-fronter-copy';

    const name = document.createElement('strong');
    name.textContent = memberLabel(top.member);

    const meta = document.createElement('span');
    const switchWord = top.count === 1 ? 'switch' : 'switches';
    meta.textContent = `${top.count} recent ${switchWord}`;

    copy.append(name, meta);
    row.append(copy);
    section.append(row);
  }

  const originalRenderAll = renderAll;
  renderAll = function renderAllWithTopFronter() {
    originalRenderAll();
    renderTopFronter();
  };

  if (state.system || state.switches.length) {
    renderTopFronter();
  }
})();
