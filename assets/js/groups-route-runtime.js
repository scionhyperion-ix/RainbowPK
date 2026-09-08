'use strict';

(function keepGroupsSeparateFromMembers() {
  let rerenderQueued = false;

  function cleanMembersGroupState() {
    localStorage.removeItem('rainbow_member_group_filter');

    const filter = document.getElementById('memberGroupFilter');
    if (filter) {
      const changed = filter.value !== 'all';
      filter.value = 'all';
      const label = filter.closest('.feature-select');
      if (label) label.hidden = true;

      if (changed && !rerenderQueued && typeof renderMembers === 'function') {
        rerenderQueued = true;
        queueMicrotask(() => {
          rerenderQueued = false;
          renderMembers();
        });
      }
    }

    const oldCreate = document.getElementById('createGroupButton');
    if (oldCreate) oldCreate.hidden = true;

    const memberCreate = document.getElementById('memberNewGroupButton');
    if (memberCreate) memberCreate.hidden = true;
  }

  cleanMembersGroupState();

  const observer = new MutationObserver(cleanMembersGroupState);
  const membersRoute = document.getElementById('membersRoute');
  const memberDialog = document.getElementById('memberDialog');
  if (membersRoute) observer.observe(membersRoute, { childList: true, subtree: true });
  if (memberDialog) observer.observe(memberDialog, { childList: true, subtree: true });

  if (typeof loginWithToken === 'function') {
    const baseLoginWithToken = loginWithToken;
    loginWithToken = async function loginWithTokenWithGroupsHash(...args) {
      const requestedRoute = window.location.hash.slice(1);
      const result = await baseLoginWithToken(...args);
      if (result && requestedRoute === 'groups' && typeof setRoute === 'function') {
        setRoute('groups');
      }
      return result;
    };
  }
})();
