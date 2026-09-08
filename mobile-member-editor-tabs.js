'use strict';

(function installMobileMemberEditorTabs() {
  const mobile = window.matchMedia('(max-width: 760px)');
  if (!mobile.matches) return;

  const stage = document.querySelector('#memberFieldsStage');
  if (!stage || stage.dataset.mobileTabbed === 'true') return;

  const profileHeading = stage.querySelector('.editor-section-heading:not(.media-heading)');
  const profileGrid = stage.querySelector('.form-grid.two-col');
  const mediaHeading = stage.querySelector('.media-heading');
  const imageFields = stage.querySelector('.image-link-fields');
  const description = stage.querySelector('.description-field');

  if (!profileHeading || !profileGrid || !mediaHeading || !imageFields || !description) return;

  stage.dataset.mobileTabbed = 'true';

  const tabs = document.createElement('div');
  tabs.className = 'mobile-member-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Member editor sections');

  const panelMap = new Map();
  const buttonMap = new Map();

  function makePanel(id, label, nodes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mobile-member-tab';
    button.dataset.memberTab = id;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `mobileMemberPanel-${id}`);
    button.textContent = label;
    tabs.append(button);

    const panel = document.createElement('div');
    panel.id = `mobileMemberPanel-${id}`;
    panel.className = 'mobile-member-tab-panel';
    panel.dataset.memberPanel = id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-label', label);
    nodes.forEach(node => panel.append(node));

    buttonMap.set(id, button);
    panelMap.set(id, panel);
    return panel;
  }

  const profilePanel = makePanel('profile', 'Profile', [profileHeading, profileGrid]);
  const imagesPanel = makePanel('images', 'Images', [mediaHeading, imageFields]);
  const notesPanel = makePanel('notes', 'Notes', [description]);

  stage.replaceChildren(tabs, profilePanel, imagesPanel, notesPanel);

  function setTab(id) {
    const next = panelMap.has(id) ? id : 'profile';

    for (const [panelId, panel] of panelMap) {
      const active = panelId === next;
      panel.hidden = !active;
      buttonMap.get(panelId).classList.toggle('active', active);
      buttonMap.get(panelId).setAttribute('aria-selected', String(active));
      buttonMap.get(panelId).tabIndex = active ? 0 : -1;
    }
  }

  buttonMap.forEach((button, id) => {
    button.addEventListener('click', () => setTab(id));
  });

  const originalOpenMemberDialog = window.openMemberDialog;
  if (typeof originalOpenMemberDialog === 'function') {
    window.openMemberDialog = function openMobileTabbedMemberDialog(member = null) {
      setTab('profile');
      originalOpenMemberDialog(member);
    };
  }

  const form = document.querySelector('#memberForm');
  form?.addEventListener('submit', () => {
    requestAnimationFrame(() => {
      const error = document.querySelector('#memberFormError');
      if (!error || error.hidden) return;

      const message = error.textContent.toLowerCase();
      if (message.includes('profile picture') || message.includes('banner')) {
        setTab('images');
      } else if (message.includes('description')) {
        setTab('notes');
      } else {
        setTab('profile');
      }
    });
  });

  setTab('profile');
})();
