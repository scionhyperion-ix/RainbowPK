'use strict';

const API_BASE = 'https://api.pluralkit.me/v2';
const SESSION_TOKEN_KEY = 'rainbow_pk_token_session';
const PERSISTENT_TOKEN_KEY = 'rainbow_pk_token';

const state = {
  token: '',
  tokenStorage: 'session',
  system: null,
  members: [],
  memberMap: new Map(),
  fronters: null,
  switches: [],
  route: 'home',
  busyCount: 0,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const els = {
  loginView: $('#loginView'), appView: $('#appView'), loginForm: $('#loginForm'), tokenInput: $('#tokenInput'),
  rememberToken: $('#rememberToken'), loginButton: $('#loginButton'), loginError: $('#loginError'), toggleToken: $('#toggleToken'),
  loadingBar: $('#loadingBar'), toastRegion: $('#toastRegion'), refreshButton: $('#refreshButton'), openFrontManager: $('#openFrontManager'),
  currentFrontHeading: $('#currentFrontHeading'), currentFrontMembers: $('#currentFrontMembers'), frontDuration: $('#frontDuration'),
  frequentMembers: $('#frequentMembers'), recentSwitches: $('#recentSwitches'), memberGrid: $('#memberGrid'), memberSearch: $('#memberSearch'),
  membersEmpty: $('#membersEmpty'), historyList: $('#historyList'), memberDialog: $('#memberDialog'), memberForm: $('#memberForm'),
  frontDialog: $('#frontDialog'), frontForm: $('#frontForm'), historyDialog: $('#historyDialog'), historyForm: $('#historyForm'),
};

function getSavedToken() {
  const persistent = localStorage.getItem(PERSISTENT_TOKEN_KEY);
  if (persistent) return { token: persistent, storage: 'persistent' };
  const session = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (session) return { token: session, storage: 'session' };
  return null;
}

function storeToken(token, persistent) {
  clearStoredTokens();
  if (persistent) {
    localStorage.setItem(PERSISTENT_TOKEN_KEY, token);
    state.tokenStorage = 'persistent';
  } else {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    state.tokenStorage = 'session';
  }
}

function clearStoredTokens() {
  localStorage.removeItem(PERSISTENT_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

function setBusy(isBusy) {
  state.busyCount += isBusy ? 1 : -1;
  if (state.busyCount < 0) state.busyCount = 0;
  els.loadingBar.hidden = state.busyCount === 0;
}

async function api(path, options = {}) {
  const { method = 'GET', body, token = state.token } = options;
  const headers = { Authorization: token };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  setBusy(true);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method, headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
    });
    if (response.status === 204) return null;
    const text = await response.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch { data = text; } }
    if (!response.ok) {
      const message = typeof data === 'object' && data?.message ? data.message : `PluralKit returned ${response.status}`;
      const error = new Error(message); error.status = response.status; error.data = data; throw error;
    }
    return data;
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Could not reach the PluralKit API. Check your connection and try again.');
    throw error;
  } finally { setBusy(false); }
}

function showToast(title, message = '', type = 'success') {
  const toast = document.createElement('div'); toast.className = `toast ${type}`;
  const strong = document.createElement('strong'); strong.textContent = title; toast.append(strong);
  if (message) { const small = document.createElement('small'); small.textContent = message; toast.append(small); }
  els.toastRegion.append(toast); setTimeout(() => toast.remove(), 4200);
}

function friendlyError(error) {
  if (error?.status === 401) return 'That token was not accepted by PluralKit. Run pk;token again and paste the current token.';
  if (error?.status === 403) return 'PluralKit denied this request. Check that this token belongs to the system you are trying to edit.';
  if (error?.status === 429) return 'PluralKit is rate limiting requests. Try the action again in a moment.';
  return error?.message || 'Something went wrong.';
}

function safeUrl(value) {
  if (!value) return '';
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

function initials(name) { return (name || 'R').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'R'; }

function makeAvatar(member, className = '') {
  const url = safeUrl(member?.avatar_url || member?.webhook_avatar_url);
  if (url) {
    const img = document.createElement('img'); img.className = className; img.src = url; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => { const fallback = document.createElement('div'); fallback.className = `${className} fallback-avatar`; fallback.textContent = initials(member?.display_name || member?.name); img.replaceWith(fallback); }, { once: true });
    return img;
  }
  const fallback = document.createElement('div'); fallback.className = `${className} fallback-avatar`; fallback.textContent = initials(member?.display_name || member?.name); return fallback;
}

function memberLabel(member) { return member?.display_name || member?.name || 'Unknown member'; }

function rebuildMemberMap() {
  state.memberMap = new Map();
  state.members.forEach(member => { state.memberMap.set(member.id, member); state.memberMap.set(member.uuid, member); });
}

function resolveMember(ref) { if (!ref) return null; if (typeof ref === 'object') return ref; return state.memberMap.get(ref) || null; }
function getSwitchMembers(sw) { return (sw?.members || []).map(resolveMember).filter(Boolean); }

function localDateTimeInput(iso) {
  const d = iso ? new Date(iso) : new Date(); const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}
function inputToIso(value) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
function formatDateTime(iso, short = false) {
  if (!iso) return 'Unknown time'; const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, short ? { month:'short',day:'numeric',hour:'numeric',minute:'2-digit' } : { dateStyle:'medium',timeStyle:'short' }).format(d);
}
function relativeTime(iso) {
  if (!iso) return ''; const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000); const rtf = new Intl.RelativeTimeFormat(undefined,{numeric:'auto'});
  const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60]];
  for (const [unit,size] of units) if (Math.abs(seconds) >= size || unit === 'minute') return rtf.format(Math.round(seconds / size), unit);
  return 'now';
}
function formatDuration(iso) {
  if (!iso) return '--'; const total = Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000)); const days=Math.floor(total/86400); const hours=Math.floor((total%86400)/3600); const mins=Math.floor((total%3600)/60);
  if (days) return `${days}d ${hours}h`; if (hours) return `${hours}h ${mins}m`; return `${mins}m`;
}

async function loadData() {
  const [system, members, fronters, switches] = await Promise.all([
    api('/systems/@me'), api('/systems/@me/members'), api('/systems/@me/fronters'), api('/systems/@me/switches?limit=100'),
  ]);
  state.system = system; state.members = Array.isArray(members) ? members : []; rebuildMemberMap(); state.fronters = fronters; state.switches = Array.isArray(switches) ? switches : []; renderAll();
}

function renderAll() { renderSystem(); renderCurrentFront(); renderFrequentMembers(); renderRecentSwitches(); renderMembers(); renderHistory(); renderSettings(); }

function replaceAvatar(target, entity, className) {
  const url = safeUrl(entity?.avatar_url); const replacement = url ? document.createElement('img') : document.createElement('div');
  replacement.id = target.id; replacement.className = url ? className : `${className} fallback-avatar`;
  if (url) { replacement.src = url; replacement.alt = ''; replacement.referrerPolicy = 'no-referrer'; replacement.addEventListener('error',()=>{replacement.removeAttribute('src');replacement.className=`${className} fallback-avatar`;replacement.textContent=initials(entity?.name);},{once:true}); }
  else replacement.textContent = initials(entity?.name);
  target.replaceWith(replacement);
}

function renderSystem() {
  const s = state.system || {}; const name = s.name || `System ${s.id || ''}`.trim();
  $('#systemName').textContent = name; $('#sidebarSystemName').textContent = name; $('#sidebarSystemId').textContent = s.id || ''; $('#systemShortId').textContent = s.id || '...'; $('#memberCount').textContent = String(state.members.length); $('#switchCount').textContent = String(state.switches.length); $('#systemPronouns').textContent = s.pronouns || '';
  const bannerUrl = safeUrl(s.banner); $('#systemBanner').style.backgroundImage = bannerUrl ? `url("${bannerUrl.replaceAll('"','%22')}")` : '';
  replaceAvatar($('#systemAvatar'),s,'system-avatar large'); replaceAvatar($('#sidebarAvatar'),s,'system-avatar');
}

function renderCurrentFront() {
  els.currentFrontMembers.replaceChildren(); const members = state.fronters?.members || [];
  if (!members.length) {
    els.currentFrontHeading.textContent = 'Nobody is fronting'; els.frontDuration.textContent = '--';
    const p = document.createElement('p'); p.className = 'no-front'; p.textContent = 'Start a switch from Quick Front or Manage Front.'; els.currentFrontMembers.append(p); return;
  }
  els.currentFrontHeading.textContent = members.length === 1 ? memberLabel(members[0]) : `${members.length} co-fronters`;
  els.frontDuration.textContent = formatDuration(state.fronters.timestamp);
  members.forEach(member => {
    const card = document.createElement('div'); card.className = 'front-person'; card.append(makeAvatar(member,'member-chip-avatar'));
    const copy = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = memberLabel(member); const small = document.createElement('small'); small.textContent = member.pronouns || member.name || member.id; copy.append(strong,small); card.append(copy); els.currentFrontMembers.append(card);
  });
}

function frequentMemberData() {
  const counts = new Map();
  state.switches.forEach(sw => (sw.members || []).forEach(ref => { const member = resolveMember(ref); if (!member) return; const key = member.uuid || member.id; counts.set(key,(counts.get(key)||0)+1); }));
  return state.members.map(member => ({ member, count: counts.get(member.uuid || member.id) || 0 })).sort((a,b)=>b.count-a.count || memberLabel(a.member).localeCompare(memberLabel(b.member))).slice(0,8);
}

function renderFrequentMembers() {
  els.frequentMembers.replaceChildren(); const frequent = frequentMemberData();
  if (!frequent.length) { const p=document.createElement('p');p.className='muted';p.textContent='No members to show yet.';els.frequentMembers.append(p);return; }
  frequent.forEach(({member,count}) => {
    const button=document.createElement('button');button.className='member-chip';button.type='button';button.append(makeAvatar(member,'member-chip-avatar'));
    const copy=document.createElement('div');const strong=document.createElement('strong');strong.textContent=memberLabel(member);const small=document.createElement('small');small.textContent=count?`${count} recent switch${count===1?'':'es'}`:(member.pronouns||'Member');copy.append(strong,small);button.append(copy);button.addEventListener('click',()=>quickFront(member));els.frequentMembers.append(button);
  });
}

function renderRecentSwitches() {
  els.recentSwitches.replaceChildren(); const switches=state.switches.slice(0,6);
  if (!switches.length) { const p=document.createElement('p');p.className='muted';p.textContent='No switch history yet.';els.recentSwitches.append(p);return; }
  switches.forEach(sw => {
    const members=getSwitchMembers(sw); const row=document.createElement('div');row.className='timeline-row';row.append(members[0]?makeAvatar(members[0],'timeline-avatar'):makeAvatar({name:'Out'},'timeline-avatar'));
    const copy=document.createElement('div');copy.className='timeline-copy';const strong=document.createElement('strong');strong.textContent=members.length?members.map(memberLabel).join(', '):'Switch out';const small=document.createElement('small');small.textContent=formatDateTime(sw.timestamp,true);copy.append(strong,small);const time=document.createElement('span');time.className='timeline-time';time.textContent=relativeTime(sw.timestamp);row.append(copy,time);els.recentSwitches.append(row);
  });
}

function renderMembers() {
  const query=els.memberSearch.value.trim().toLowerCase();
  const members=state.members.filter(member=>!query || [member.name,member.display_name,member.pronouns,member.id].filter(Boolean).some(value=>String(value).toLowerCase().includes(query)));
  els.memberGrid.replaceChildren(); els.membersEmpty.hidden = members.length > 0;
  members.forEach(member => {
    const card=document.createElement('button');card.type='button';card.className='member-card';
    const top=document.createElement('div');top.className='member-card-top';top.append(makeAvatar(member,'member-card-avatar'));
    const nameWrap=document.createElement('div');nameWrap.className='member-card-name';const h3=document.createElement('h3');h3.textContent=memberLabel(member);const p=document.createElement('p');p.textContent=member.pronouns||member.name||member.id;nameWrap.append(h3,p);top.append(nameWrap);
    const desc=document.createElement('p');desc.className='member-card-desc';desc.textContent=member.description||'No description';
    const bar=document.createElement('div');bar.className='member-color-bar';bar.style.background=/^[0-9a-f]{6}$/i.test(member.color||'')?`#${member.color}`:'var(--accent)';
    card.append(top,desc,bar);card.addEventListener('click',()=>openMemberDialog(member));els.memberGrid.append(card);
  });
}

function renderHistory() {
  els.historyList.replaceChildren();
  if (!state.switches.length) { const p=document.createElement('p');p.className='muted';p.textContent='No switch history yet.';els.historyList.append(p);return; }
  state.switches.forEach(sw => {
    const members=getSwitchMembers(sw); const row=document.createElement('div');row.className='history-row';
    const date=document.createElement('div');date.className='history-date';date.textContent=formatDateTime(sw.timestamp);
    const memberWrap=document.createElement('div');memberWrap.className='history-members';
    if (!members.length) { const pill=document.createElement('span');pill.className='mini-member-pill';pill.textContent='Switch out';memberWrap.append(pill); }
    else members.forEach(member=>{const pill=document.createElement('span');pill.className='mini-member-pill';const dot=document.createElement('span');dot.className='mini-dot';if(/^[0-9a-f]{6}$/i.test(member.color||''))dot.style.background=`#${member.color}`;const text=document.createElement('span');text.textContent=memberLabel(member);pill.append(dot,text);memberWrap.append(pill);});
    const edit=document.createElement('button');edit.className='secondary-button';edit.type='button';edit.textContent='Edit';edit.addEventListener('click',()=>openHistoryDialog(sw));row.append(date,memberWrap,edit);els.historyList.append(row);
  });
}

function renderSettings() {
  const s=state.system||{}; $('#settingsSystemName').textContent=s.name||'Unnamed system'; $('#settingsSystemId').textContent=s.id||'...'; $('#settingsTokenStorage').textContent=state.tokenStorage==='persistent'?'This browser':'Current browser session';
}

function setRoute(route) {
  state.route=route; const routeMeta={home:['Overview','Home'],members:['System directory','Members'],history:['Switch tracking','Front history'],settings:['Connection and privacy','Settings']}; const [eyebrow,title]=routeMeta[route]||routeMeta.home;
  $('#pageEyebrow').textContent=eyebrow;$('#pageTitle').textContent=title;$$('.route-view').forEach(view=>view.hidden=view.id!==`${route}Route`);$$('[data-route]').forEach(btn=>btn.classList.toggle('active',btn.dataset.route===route));els.openFrontManager.hidden=route==='settings';window.location.hash=route==='home'?'':route;
}

async function quickFront(member) {
  if (!window.confirm(`Start a new switch with ${memberLabel(member)} fronting?`)) return;
  try { await api('/systems/@me/switches',{method:'POST',body:{members:[member.id]}}); showToast('Front updated',`${memberLabel(member)} is now fronting.`); await loadData(); }
  catch(error){showToast('Could not update front',friendlyError(error),'error');}
}

function openMemberDialog(member=null) {
  $('#memberDialogEyebrow').textContent=member?`Member ${member.id}`:'New member'; $('#memberDialogTitle').textContent=member?'Edit member':'Create member'; $('#memberRef').value=member?.id||''; $('#memberName').value=member?.name||''; $('#memberDisplayName').value=member?.display_name||''; $('#memberPronouns').value=member?.pronouns||''; $('#memberColor').value=member?.color?`#${member.color}`:''; $('#memberBirthday').value=member?.birthday||''; $('#memberAvatar').value=member?.avatar_url||''; $('#memberDescription').value=member?.description||''; $('#memberFormError').hidden=true; els.memberDialog.showModal(); setTimeout(()=>$('#memberName').focus(),0);
}

async function saveMember(event) {
  event.preventDefault(); const ref=$('#memberRef').value; const errorEl=$('#memberFormError');errorEl.hidden=true; const colorInput=$('#memberColor').value.trim().replace(/^#/,'');
  const body={name:$('#memberName').value.trim(),display_name:$('#memberDisplayName').value.trim()||null,pronouns:$('#memberPronouns').value.trim()||null,color:colorInput||null,birthday:$('#memberBirthday').value.trim()||null,avatar_url:$('#memberAvatar').value.trim()||null,description:$('#memberDescription').value.trim()||null};
  if(!body.name){errorEl.textContent='Name is required.';errorEl.hidden=false;return;}
  const button=$('#saveMemberButton');button.disabled=true;
  try { if(ref){await api(`/members/${encodeURIComponent(ref)}`,{method:'PATCH',body});showToast('Member saved',`${body.display_name||body.name} was updated in PluralKit.`);}else{await api('/members',{method:'POST',body});showToast('Member created',`${body.display_name||body.name} was added to PluralKit.`);}els.memberDialog.close();await loadData(); }
  catch(error){errorEl.textContent=friendlyError(error);errorEl.hidden=false;}finally{button.disabled=false;}
}

function buildMemberPicker(container,{selected=[],query='',radio=false}={}){
  container.replaceChildren();const selectedSet=new Set(selected);const normalized=query.trim().toLowerCase();
  const members=state.members.filter(member=>!normalized||[member.name,member.display_name,member.pronouns,member.id].filter(Boolean).some(value=>String(value).toLowerCase().includes(normalized)));
  members.forEach(member=>{
    const label=document.createElement('label');label.className='picker-row';label.append(makeAvatar(member,'picker-avatar'));
    const copy=document.createElement('span');copy.className='picker-copy';const strong=document.createElement('strong');strong.textContent=memberLabel(member);const small=document.createElement('small');small.textContent=member.pronouns||member.name||member.id;copy.append(strong,small);
    const input=document.createElement('input');input.type=radio?'radio':'checkbox';input.name=radio?'frontMember':`member-${container.id}`;input.value=member.id;input.checked=selectedSet.has(member.id)||selectedSet.has(member.uuid);label.append(copy,input);container.append(label);
  });
}

function openFrontDialog(mode='replace',preselected=[]){
  $('#frontFormError').hidden=true;$('#frontMemberSearch').value='';const modeInput=$(`input[name="frontMode"][value="${mode}"]`);if(modeInput)modeInput.checked=true;$('#saveFrontButton').textContent=mode==='add'?'Add to front':'Log switch';$('#customSwitchTimeEnabled').checked=false;$('#customSwitchTimeRow').hidden=true;$('#customSwitchTime').value=localDateTimeInput();buildMemberPicker($('#frontMemberPicker'),{selected:preselected});els.frontDialog.showModal();
}

async function saveFront(event){
  event.preventDefault();const errorEl=$('#frontFormError');errorEl.hidden=true;const mode=$('input[name="frontMode"]:checked')?.value||'replace';const selected=$$('#frontMemberPicker input:checked').map(input=>input.value);const currentIds=(state.fronters?.members||[]).map(member=>member.id);const members=mode==='add'?[...new Set([...currentIds,...selected])]:selected;
  if(!selected.length){errorEl.textContent='Select at least one member. Use Switch out on Home if you want an empty front.';errorEl.hidden=false;return;}
  const body={members};if($('#customSwitchTimeEnabled').checked){const timestamp=inputToIso($('#customSwitchTime').value);if(!timestamp){errorEl.textContent='Enter a valid start time.';errorEl.hidden=false;return;}body.timestamp=timestamp;}
  const button=$('#saveFrontButton');button.disabled=true;
  try{await api('/systems/@me/switches',{method:'POST',body});els.frontDialog.close();showToast('Front updated',mode==='add'?'Co-fronter added.':'New switch logged.');await loadData();}
  catch(error){errorEl.textContent=friendlyError(error);errorEl.hidden=false;}finally{button.disabled=false;}
}

async function switchOut(){
  if(!window.confirm('Log a switch-out with nobody fronting?'))return;
  try{await api('/systems/@me/switches',{method:'POST',body:{members:[]}});showToast('Switched out','PluralKit now has an empty current front.');await loadData();}
  catch(error){showToast('Could not switch out',friendlyError(error),'error');}
}

function openHistoryDialog(sw){$('#historyFormError').hidden=true;$('#historySwitchId').value=sw.id;$('#historyTimestamp').value=localDateTimeInput(sw.timestamp);buildMemberPicker($('#historyMemberPicker'),{selected:sw.members||[]});els.historyDialog.showModal();}

async function saveHistory(event){
  event.preventDefault();const id=$('#historySwitchId').value;const errorEl=$('#historyFormError');errorEl.hidden=true;const timestamp=inputToIso($('#historyTimestamp').value);const members=$$('#historyMemberPicker input:checked').map(input=>input.value);if(!timestamp){errorEl.textContent='Enter a valid time.';errorEl.hidden=false;return;}
  const button=$('#saveHistoryButton');button.disabled=true;
  try{await api(`/systems/@me/switches/${encodeURIComponent(id)}`,{method:'PATCH',body:{timestamp}});await api(`/systems/@me/switches/${encodeURIComponent(id)}/members`,{method:'PATCH',body:members});els.historyDialog.close();showToast('Switch updated','The front history entry was saved to PluralKit.');await loadData();}
  catch(error){errorEl.textContent=friendlyError(error);errorEl.hidden=false;}finally{button.disabled=false;}
}

async function deleteHistorySwitch(){
  const id=$('#historySwitchId').value;if(!id||!window.confirm('Delete this switch entry from PluralKit? This cannot be undone from Rainbow.'))return;const button=$('#deleteSwitchButton');button.disabled=true;
  try{await api(`/systems/@me/switches/${encodeURIComponent(id)}`,{method:'DELETE'});els.historyDialog.close();showToast('Switch deleted');await loadData();}
  catch(error){$('#historyFormError').textContent=friendlyError(error);$('#historyFormError').hidden=false;}finally{button.disabled=false;}
}

async function loginWithToken(token,persistent,{restoring=false}={}){
  const clean=token.trim();if(!clean)return false;els.loginError.hidden=true;els.loginButton.disabled=true;els.loginButton.textContent='Connecting...';
  try{const system=await api('/systems/@me',{token:clean});state.token=clean;state.system=system;els.loginView.hidden=true;els.appView.hidden=false;await loadData();storeToken(clean,persistent);const hashRoute=window.location.hash.slice(1);setRoute(['home','members','history','settings'].includes(hashRoute)?hashRoute:'home');if(!restoring)showToast('Connected to PluralKit',`Signed in as ${system.name||system.id}.`);return true;}
  catch(error){clearStoredTokens();state.token='';els.loginView.hidden=false;els.appView.hidden=true;if(!restoring){els.loginError.textContent=friendlyError(error);els.loginError.hidden=false;}return false;}
  finally{els.loginButton.disabled=false;els.loginButton.textContent='Connect to PluralKit';}
}

function signOut(){
  clearStoredTokens();state.token='';state.system=null;state.members=[];state.memberMap.clear();state.fronters=null;state.switches=[];els.tokenInput.value='';els.rememberToken.checked=false;els.appView.hidden=true;els.loginView.hidden=false;history.replaceState(null,'',window.location.pathname+window.location.search);showToast('Signed out','The saved PluralKit token was removed from this browser.');
}

function wireEvents(){
  els.loginForm.addEventListener('submit',event=>{event.preventDefault();loginWithToken(els.tokenInput.value,els.rememberToken.checked);});
  els.toggleToken.addEventListener('click',()=>{const showing=els.tokenInput.type==='text';els.tokenInput.type=showing?'password':'text';els.toggleToken.textContent=showing?'Show':'Hide';els.toggleToken.setAttribute('aria-label',showing?'Show token':'Hide token');});
  $$('[data-route]').forEach(button=>button.addEventListener('click',()=>setRoute(button.dataset.route)));$$('[data-route-link]').forEach(button=>button.addEventListener('click',()=>setRoute(button.dataset.routeLink)));
  els.refreshButton.addEventListener('click',async()=>{try{await loadData();showToast('Refreshed','Latest PluralKit data loaded.');}catch(error){showToast('Refresh failed',friendlyError(error),'error');}});
  els.openFrontManager.addEventListener('click',()=>openFrontDialog('replace'));$('#chooseAnyMemberButton').addEventListener('click',()=>openFrontDialog('replace'));$('#newSwitchButton').addEventListener('click',()=>openFrontDialog('replace'));$('#addCoFronterButton').addEventListener('click',()=>openFrontDialog('add'));$('#switchOutButton').addEventListener('click',switchOut);
  $('#createMemberButton').addEventListener('click',()=>openMemberDialog());els.memberSearch.addEventListener('input',renderMembers);els.memberForm.addEventListener('submit',saveMember);els.frontForm.addEventListener('submit',saveFront);els.historyForm.addEventListener('submit',saveHistory);$('#deleteSwitchButton').addEventListener('click',deleteHistorySwitch);$('#signOutButton').addEventListener('click',signOut);
  $('#customSwitchTimeEnabled').addEventListener('change',event=>{$('#customSwitchTimeRow').hidden=!event.target.checked;});
  $('#frontMemberSearch').addEventListener('input',event=>{const selected=$$('#frontMemberPicker input:checked').map(input=>input.value);buildMemberPicker($('#frontMemberPicker'),{selected,query:event.target.value});});
  $$('input[name="frontMode"]').forEach(input=>input.addEventListener('change',()=>{$('#saveFrontButton').textContent=input.value==='add'?'Add to front':'Log switch';}));
  $$('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  [els.memberDialog,els.frontDialog,els.historyDialog].forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();}));
  window.addEventListener('hashchange',()=>{if(els.appView.hidden)return;const route=window.location.hash.slice(1)||'home';if(['home','members','history','settings'].includes(route)&&route!==state.route)setRoute(route);});
  setInterval(()=>{if(!els.appView.hidden&&state.fronters?.timestamp)els.frontDuration.textContent=formatDuration(state.fronters.timestamp);},60000);
}

async function init(){wireEvents();const saved=getSavedToken();if(!saved)return;state.tokenStorage=saved.storage;els.rememberToken.checked=saved.storage==='persistent';await loginWithToken(saved.token,saved.storage==='persistent',{restoring:true});}

init();
