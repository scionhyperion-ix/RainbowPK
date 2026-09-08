'use strict';

(function installRainbowEnhancements() {
  const oldMemberForm = els.memberForm;
  oldMemberForm.removeEventListener('submit', saveMember);

  const timingNote = document.createElement('p');
  timingNote.id = 'frontTimingNote';
  timingNote.className = 'front-timing-note';
  timingNote.hidden = true;
  els.currentFrontMembers.insertAdjacentElement('afterend', timingNote);
  els.frontTimingNote = timingNote;

  els.memberDialog.classList.add('member-editor-dialog');
  els.memberDialog.innerHTML = `
    <form id="memberForm" class="modal-card member-editor-card">
      <div class="modal-heading member-editor-heading">
        <div>
          <p class="eyebrow" id="memberDialogEyebrow">Member</p>
          <h3 id="memberDialogTitle">Edit member</h3>
          <p class="muted member-editor-subtitle">Edit the PluralKit profile, preview the images, then review everything before saving.</p>
        </div>
        <button class="icon-button close-dialog" type="button" aria-label="Close">×</button>
      </div>

      <input id="memberRef" type="hidden">

      <div class="member-editor-layout">
        <aside class="member-live-preview" aria-label="Member profile preview">
          <div class="member-preview-banner">
            <img id="memberPreviewBanner" alt="" hidden>
            <div id="memberPreviewBannerFallback" class="member-preview-banner-fallback"></div>
          </div>

          <div class="member-preview-body">
            <div class="member-preview-avatar-wrap">
              <img id="memberPreviewAvatar" class="member-preview-avatar" alt="" hidden>
              <div id="memberPreviewAvatarFallback" class="member-preview-avatar fallback-avatar">M</div>
            </div>
            <div id="memberPreviewColor" class="member-preview-color"></div>
            <h4 id="memberPreviewName">Member name</h4>
            <p id="memberPreviewSubname" class="member-preview-subname">PluralKit member</p>
            <p id="memberPreviewPronouns" class="member-preview-pronouns"></p>
            <p id="memberPreviewDescription" class="member-preview-description">No description yet.</p>
          </div>

          <div class="member-preview-hint">
            <strong>Image links only</strong>
            <span>Use publicly accessible HTTPS links for the profile picture and banner.</span>
          </div>
        </aside>

        <section class="member-editor-fields">
          <div id="memberFieldsStage">
            <div class="editor-section-heading">
              <span>Profile details</span>
              <small>Changes are not sent to PluralKit until you confirm.</small>
            </div>

            <div class="form-grid two-col">
              <label>Name<input id="memberName" maxlength="100" required></label>
              <label>Display name<input id="memberDisplayName" maxlength="100"></label>
              <label>Pronouns<input id="memberPronouns" maxlength="100"></label>
              <label>Color<input id="memberColor" maxlength="7" placeholder="#8b7cf6" pattern="#?[0-9A-Fa-f]{6}"></label>
              <label>Birthday<input id="memberBirthday" placeholder="YYYY-MM-DD"></label>
            </div>

            <div class="editor-section-heading media-heading">
              <span>Profile images</span>
              <small>Paste image links. Rainbow previews them before saving.</small>
            </div>

            <div class="image-link-fields">
              <label>
                <span>Profile picture URL</span>
                <input id="memberAvatar" type="url" maxlength="256" placeholder="https://example.com/avatar.png">
                <small>Updates the member's PluralKit avatar.</small>
              </label>
              <label>
                <span>Banner URL</span>
                <input id="memberBanner" type="url" maxlength="256" placeholder="https://example.com/banner.png">
                <small>Updates the member's PluralKit banner.</small>
              </label>
            </div>

            <label class="description-field">Description<textarea id="memberDescription" maxlength="1000" rows="6"></textarea></label>
          </div>

          <div id="memberReviewStage" class="member-review-stage" hidden>
            <div class="review-callout">
              <strong>Review before saving</strong>
              <p>This is the final preview. Nothing has been sent to PluralKit yet.</p>
            </div>
            <div id="memberReviewList" class="member-review-list"></div>
          </div>

          <p id="memberFormError" class="form-error" role="alert" hidden></p>

          <div id="memberEditFooter" class="modal-footer member-editor-footer">
            <button class="secondary-button close-dialog" type="button">Cancel</button>
            <button id="saveMemberButton" class="primary-button" type="submit">Review changes</button>
          </div>

          <div id="memberReviewFooter" class="modal-footer member-editor-footer" hidden>
            <button id="backToMemberEditButton" class="secondary-button" type="button">Back to edit</button>
            <button id="confirmMemberSaveButton" class="primary-button" type="button">Confirm and save</button>
          </div>
        </section>
      </div>
    </form>`;

  els.memberForm = $('#memberForm');
  state.pendingMemberSave = null;

  formatDuration = function formatDurationSeconds(iso) {
    if (!iso) return '--:--:--';
    const total = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  function memberRefMatches(ref, member) {
    if (!ref || !member) return false;
    if (typeof ref === 'object') return ref.id === member.id || ref.uuid === member.uuid;
    return ref === member.id || ref === member.uuid;
  }

  function switchHasMember(sw, member) {
    return (sw?.members || []).some(ref => memberRefMatches(ref, member));
  }

  function getContinuousFrontStart(member) {
    const currentTimestamp = state.fronters?.timestamp;
    if (!currentTimestamp || !member) return currentTimestamp || null;

    const currentTime = new Date(currentTimestamp).getTime();
    const history = [...state.switches]
      .filter(sw => sw?.timestamp && new Date(sw.timestamp).getTime() <= currentTime)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let start = currentTimestamp;
    for (const sw of history) {
      if (!switchHasMember(sw, member)) break;
      start = sw.timestamp;
    }
    return start;
  }

  function formatStartedAt(iso) {
    if (!iso) return 'Start time unavailable';
    return `Since ${new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))}`;
  }

  function updateFrontTimers() {
    if (els.appView.hidden) return;
    const currentMembers = state.fronters?.members || [];
    if (state.fronters?.timestamp && currentMembers.length) {
      els.frontDuration.textContent = formatDuration(state.fronters.timestamp);
    }
    $$('[data-front-start]').forEach(timer => {
      timer.textContent = formatDuration(timer.dataset.frontStart);
    });
  }

  renderCurrentFront = function renderCurrentFrontWithTimers() {
    els.currentFrontMembers.replaceChildren();
    const members = state.fronters?.members || [];

    if (!members.length) {
      els.currentFrontHeading.textContent = 'Nobody is fronting';
      els.frontDuration.textContent = '--:--:--';
      els.frontDuration.title = '';
      els.frontTimingNote.hidden = true;
      const p = document.createElement('p');
      p.className = 'no-front';
      p.textContent = 'Start a switch from Quick Front or Manage Front.';
      els.currentFrontMembers.append(p);
      return;
    }

    els.currentFrontHeading.textContent = members.length === 1 ? memberLabel(members[0]) : `${members.length} co-fronters`;
    els.frontDuration.textContent = formatDuration(state.fronters.timestamp);
    els.frontDuration.title = 'Time since the latest front change';

    const starts = members.map(member => getContinuousFrontStart(member));
    const distinctStarts = new Set(starts.filter(Boolean).map(value => new Date(value).getTime()));
    els.frontTimingNote.hidden = distinctStarts.size <= 1;
    els.frontTimingNote.textContent = distinctStarts.size > 1
      ? 'These fronters started at different times. Each member timer shows their continuous front time. The top timer shows time since the latest front change.'
      : '';

    members.forEach((member, index) => {
      const start = starts[index] || state.fronters.timestamp;
      const card = document.createElement('div');
      card.className = 'front-person timed-front-person';
      card.append(makeAvatar(member, 'member-chip-avatar'));

      const copy = document.createElement('div');
      copy.className = 'front-person-copy';
      const strong = document.createElement('strong');
      strong.textContent = memberLabel(member);
      const meta = document.createElement('small');
      meta.textContent = member.pronouns || member.name || member.id;

      const timing = document.createElement('div');
      timing.className = 'front-member-timing';
      const timer = document.createElement('span');
      timer.className = 'front-member-timer';
      timer.dataset.frontStart = start;
      timer.textContent = formatDuration(start);
      const since = document.createElement('span');
      since.className = 'front-member-since';
      since.textContent = formatStartedAt(start);
      timing.append(timer, since);

      copy.append(strong, meta, timing);
      card.append(copy);
      els.currentFrontMembers.append(card);
    });

    updateFrontTimers();
  };

  function setPreviewImage(img, fallback, value, fallbackText = '') {
    const url = safeUrl(value);
    img.onload = null;
    img.onerror = null;

    if (!url) {
      img.hidden = true;
      img.removeAttribute('src');
      fallback.hidden = false;
      if (fallbackText) fallback.textContent = fallbackText;
      return;
    }

    fallback.hidden = true;
    img.hidden = false;
    img.src = url;
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      img.hidden = true;
      fallback.hidden = false;
      if (fallbackText) fallback.textContent = fallbackText;
    };
  }

  function updateMemberPreview() {
    const name = $('#memberName').value.trim() || 'Member name';
    const displayName = $('#memberDisplayName').value.trim();
    const pronouns = $('#memberPronouns').value.trim();
    const avatar = $('#memberAvatar').value.trim();
    const banner = $('#memberBanner').value.trim();
    const description = $('#memberDescription').value.trim();

    $('#memberPreviewName').textContent = displayName || name;
    $('#memberPreviewSubname').textContent = displayName ? name : (pronouns || 'PluralKit member');
    $('#memberPreviewPronouns').textContent = displayName && pronouns ? pronouns : '';
    $('#memberPreviewDescription').textContent = description || 'No description yet.';

    const fallbackText = initials(displayName || name);
    setPreviewImage($('#memberPreviewAvatar'), $('#memberPreviewAvatarFallback'), avatar, fallbackText);
    setPreviewImage($('#memberPreviewBanner'), $('#memberPreviewBannerFallback'), banner);

    const color = $('#memberColor').value.trim().replace(/^#/, '');
    $('#memberPreviewColor').style.background = /^[0-9a-f]{6}$/i.test(color) ? `#${color}` : 'var(--accent)';
  }

  function collectMemberForm() {
    const color = $('#memberColor').value.trim().replace(/^#/, '');
    return {
      ref: $('#memberRef').value,
      body: {
        name: $('#memberName').value.trim(),
        display_name: $('#memberDisplayName').value.trim() || null,
        pronouns: $('#memberPronouns').value.trim() || null,
        color: color || null,
        birthday: $('#memberBirthday').value.trim() || null,
        avatar_url: $('#memberAvatar').value.trim() || null,
        banner: $('#memberBanner').value.trim() || null,
        description: $('#memberDescription').value.trim() || null,
      },
    };
  }

  function validateMemberDraft(body) {
    if (!body.name) return 'Name is required.';
    if (body.color && !/^[0-9a-f]{6}$/i.test(body.color)) return 'Color must be a 6-character hex color.';
    if (body.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(body.birthday)) return 'Birthday must use YYYY-MM-DD.';
    if (body.avatar_url && !safeUrl(body.avatar_url)) return 'Profile picture must be a valid HTTPS URL.';
    if (body.banner && !safeUrl(body.banner)) return 'Banner must be a valid HTTPS URL.';
    return '';
  }

  function renderMemberReview(body) {
    const list = $('#memberReviewList');
    list.replaceChildren();
    const rows = [
      ['Name', body.name],
      ['Display name', body.display_name || 'None'],
      ['Pronouns', body.pronouns || 'None'],
      ['Birthday', body.birthday || 'None'],
      ['Color', body.color ? `#${body.color}` : 'None'],
      ['Profile picture', body.avatar_url || 'None'],
      ['Banner', body.banner || 'None'],
      ['Description', body.description || 'None'],
    ];

    rows.forEach(([labelText, valueText]) => {
      const row = document.createElement('div');
      const label = document.createElement('span');
      label.textContent = labelText;
      const value = document.createElement('strong');
      value.textContent = valueText;
      row.append(label, value);
      list.append(row);
    });
  }

  function showMemberEditStage() {
    state.pendingMemberSave = null;
    $('#memberFieldsStage').hidden = false;
    $('#memberReviewStage').hidden = true;
    $('#memberEditFooter').hidden = false;
    $('#memberReviewFooter').hidden = true;
    $('#memberDialogTitle').textContent = $('#memberRef').value ? 'Edit member' : 'Create member';
  }

  function showMemberReviewStage() {
    const draft = collectMemberForm();
    const error = validateMemberDraft(draft.body);
    const errorEl = $('#memberFormError');

    if (error) {
      errorEl.textContent = error;
      errorEl.hidden = false;
      return false;
    }

    errorEl.hidden = true;
    state.pendingMemberSave = draft;
    renderMemberReview(draft.body);
    updateMemberPreview();
    $('#memberFieldsStage').hidden = true;
    $('#memberReviewStage').hidden = false;
    $('#memberEditFooter').hidden = true;
    $('#memberReviewFooter').hidden = false;
    $('#memberDialogTitle').textContent = 'Review member';
    $('#confirmMemberSaveButton').textContent = draft.ref ? 'Confirm and save' : 'Confirm and create';
    return true;
  }

  openMemberDialog = function openMemberDialogWithPreview(member = null) {
    $('#memberDialogEyebrow').textContent = member ? `Member ${member.id}` : 'New member';
    $('#memberRef').value = member?.id || '';
    $('#memberName').value = member?.name || '';
    $('#memberDisplayName').value = member?.display_name || '';
    $('#memberPronouns').value = member?.pronouns || '';
    $('#memberColor').value = member?.color ? `#${member.color}` : '';
    $('#memberBirthday').value = member?.birthday || '';
    $('#memberAvatar').value = member?.avatar_url || '';
    $('#memberBanner').value = member?.banner || '';
    $('#memberDescription').value = member?.description || '';
    $('#memberFormError').hidden = true;
    showMemberEditStage();
    updateMemberPreview();
    els.memberDialog.showModal();
    setTimeout(() => $('#memberName').focus(), 0);
  };

  saveMember = function reviewMemberBeforeSave(event) {
    event.preventDefault();
    showMemberReviewStage();
  };

  async function confirmMemberSave() {
    const draft = state.pendingMemberSave || collectMemberForm();
    const { ref, body } = draft;
    const errorEl = $('#memberFormError');
    errorEl.hidden = true;

    const validationError = validateMemberDraft(body);
    if (validationError) {
      errorEl.textContent = validationError;
      errorEl.hidden = false;
      showMemberEditStage();
      return;
    }

    const button = $('#confirmMemberSaveButton');
    button.disabled = true;
    button.textContent = 'Saving...';

    try {
      if (ref) {
        await api(`/members/${encodeURIComponent(ref)}`, { method: 'PATCH', body });
        showToast('Member saved', `${body.display_name || body.name} was updated in PluralKit.`);
      } else {
        await api('/members', { method: 'POST', body });
        showToast('Member created', `${body.display_name || body.name} was added to PluralKit.`);
      }
      state.pendingMemberSave = null;
      els.memberDialog.close();
      await loadData();
    } catch (error) {
      errorEl.textContent = friendlyError(error);
      errorEl.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = ref ? 'Confirm and save' : 'Confirm and create';
    }
  }

  els.memberForm.addEventListener('submit', saveMember);
  $('#confirmMemberSaveButton').addEventListener('click', confirmMemberSave);
  $('#backToMemberEditButton').addEventListener('click', showMemberEditStage);
  ['memberName', 'memberDisplayName', 'memberPronouns', 'memberColor', 'memberAvatar', 'memberBanner', 'memberDescription']
    .forEach(id => $('#' + id).addEventListener('input', updateMemberPreview));
  $$('.close-dialog', els.memberDialog).forEach(button => {
    button.addEventListener('click', () => els.memberDialog.close());
  });

  setInterval(updateFrontTimers, 1000);
  if (state.fronters) renderCurrentFront();
})();
