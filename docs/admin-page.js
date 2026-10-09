const loginForm = document.querySelector('#login-form');
const status = document.querySelector('#admin-status');
const content = document.querySelector('#admin-content');
const list = document.querySelector('#admin-list');
const rsvpList = document.querySelector('#rsvp-list');
const rsvpSummary = document.querySelector('#rsvp-summary');
const emailInput = document.querySelector('#admin-email');
const passwordInput = document.querySelector('#admin-password');
const service = window.GuestbookService;

if (service.mode() === 'local') {
  document.querySelector('#email-field').hidden = true;
} else if (service.mode() === 'supabase') {
  emailInput.required = true;
} else {
  loginForm.hidden = true;
  status.textContent = '방명록 연결을 준비하고 있습니다.';
}

async function loadEntries() {
  try {
    const [entries, rsvps] = await Promise.all([service.listAll(), service.listRsvps()]);
    loginForm.hidden = true;
    content.hidden = false;
    status.textContent = '';
    document.querySelector('#pending-count').textContent = `대기 중 ${entries.filter(entry => entry.status === 'pending').length}개`;
    const attendingCount = rsvps.filter(response => response.attending).reduce((total, response) => total + response.party_size, 0);
    const unableCount = rsvps.filter(response => !response.attending).length;
    rsvpSummary.textContent = `응답 ${rsvps.length}건 · 참석 ${attendingCount}명 · 참석 어려움 ${unableCount}건`;
    rsvpList.replaceChildren();
    if (!rsvps.length) {
      const emptyRsvps = document.createElement('p');
      emptyRsvps.className = 'empty';
      emptyRsvps.textContent = '아직 도착한 참석 응답이 없습니다.';
      rsvpList.append(emptyRsvps);
    }
    rsvps.forEach(renderRsvp);
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = '아직 등록된 메시지가 없습니다.';
      list.append(empty);
    }
    entries.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'));
    entries.forEach(renderEntry);
  } catch (error) {
    status.textContent = error.message;
    service.logout();
    loginForm.hidden = false;
    content.hidden = true;
  }
}

function renderRsvp(response) {
  const article = document.createElement('article');
  article.className = 'rsvp-entry';
  const head = document.createElement('div');
  head.className = 'entry-head';
  const name = document.createElement('strong');
  name.textContent = response.name;
  const attendance = document.createElement('span');
  attendance.className = `badge ${response.attending ? 'approved' : 'rejected'}`;
  attendance.textContent = response.attending ? `참석 · ${response.party_size}명` : '참석 어려움';
  const date = document.createElement('time');
  date.dateTime = response.created_at;
  date.textContent = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(response.created_at));
  head.append(name, attendance, date);
  article.append(head);
  if (response.note) {
    const note = document.createElement('p');
    note.textContent = response.note;
    article.append(note);
  }
  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete';
  deleteButton.textContent = '응답 삭제';
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`${response.name}님의 참석 응답을 삭제할까요?`)) return;
    deleteButton.disabled = true;
    try {
      await service.deleteRsvp(response.id);
      await loadEntries();
    } catch (error) {
      status.textContent = error.message;
      deleteButton.disabled = false;
    }
  });
  actions.append(deleteButton);
  article.append(actions);
  rsvpList.append(article);
}

function renderEntry(entry) {
  const article = document.createElement('article');
  article.className = 'entry';
  const head = document.createElement('div');
  head.className = 'entry-head';
  const name = document.createElement('strong');
  name.textContent = entry.name;
  const badge = document.createElement('span');
  badge.className = `badge ${entry.status}`;
  badge.textContent = { pending: '승인 대기', approved: '공개 중', rejected: '비공개' }[entry.status] || entry.status;
  const date = document.createElement('time');
  date.dateTime = entry.createdAt;
  date.textContent = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.createdAt));
  head.append(name, badge, date);
  const message = document.createElement('p');
  message.textContent = entry.message;
  const actions = document.createElement('div');
  actions.className = 'entry-actions';
  for (const [value, label] of [['approved', '승인하기'], ['rejected', '비공개로 전환']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = entry.status === value;
    if (value === 'rejected') button.className = 'reject';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await service.setStatus(entry.id, value);
        await loadEntries();
      } catch (error) {
        status.textContent = error.message;
        button.disabled = false;
      }
    });
    actions.append(button);
  }
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = '삭제';
  deleteButton.className = 'delete';
  deleteButton.addEventListener('click', async () => {
    if (!window.confirm(`${entry.name}님의 방명록을 삭제할까요?`)) return;
    deleteButton.disabled = true;
    try {
      await service.deleteEntry(entry.id);
      await loadEntries();
    } catch (error) {
      status.textContent = error.message;
      deleteButton.disabled = false;
    }
  });
  actions.append(deleteButton);
  article.append(head, message, actions);
  list.append(article);
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  try {
    await service.login(emailInput.value, passwordInput.value);
    passwordInput.value = '';
    await loadEntries();
  } catch (error) {
    status.textContent = error.message;
  }
});
document.querySelector('#refresh-button').addEventListener('click', loadEntries);
document.querySelector('#logout-button').addEventListener('click', () => {
  service.logout();
  passwordInput.value = '';
  loginForm.hidden = false;
  content.hidden = true;
  status.textContent = '';
});
if (service.hasStoredLogin()) loadEntries();
