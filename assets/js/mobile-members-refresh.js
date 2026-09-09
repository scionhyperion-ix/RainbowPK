'use strict';

(function installMobileMembersRefresh() {
  const membersRoute = document.getElementById('membersRoute');
  const toolbar = membersRoute?.querySelector('.toolbar-row');
  const createButton = document.getElementById('createMemberButton');
  if (!membersRoute || !toolbar || !createButton) return;

  let button = document.getElementById('membersRefreshButton');
  if (!button) {
    button = document.createElement('button');
    button.id = 'membersRefreshButton';
    button.type = 'button';
    button.className = 'secondary-button members-refresh-button';
    button.setAttribute('aria-label', 'Refresh members');
    button.title = 'Refresh members';
    button.innerHTML = '<span aria-hidden="true">↻</span><span class="members-refresh-label">Refresh</span>';
    toolbar.insertBefore(button, createButton);
  }

  button.addEventListener('click', async () => {
    if (button.disabled || typeof loadData !== 'function') return;

    button.disabled = true;
    button.classList.add('is-refreshing');
    button.setAttribute('aria-busy', 'true');

    try {
      await loadData();
      if (typeof showToast === 'function') showToast('Members refreshed', 'The latest PluralKit member data is loaded.');
    } catch (error) {
      const message = typeof friendlyError === 'function' ? friendlyError(error) : (error?.message || 'Could not refresh members.');
      if (typeof showToast === 'function') showToast('Refresh failed', message, 'error');
    } finally {
      button.disabled = false;
      button.classList.remove('is-refreshing');
      button.removeAttribute('aria-busy');
    }
  });
})();
