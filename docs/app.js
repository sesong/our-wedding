const lightbox = document.querySelector('#lightbox');
const lightboxImage = lightbox.querySelector('img');
const galleryItems = [...document.querySelectorAll('.gallery-item')];
let currentPhoto = 0;

galleryItems.forEach((button, index) => {
  button.addEventListener('click', () => openPhoto(index));
});

function openPhoto(index) {
  currentPhoto = (index + galleryItems.length) % galleryItems.length;
  const photo = galleryItems[currentPhoto].querySelector('img');
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.alt;
  lightbox.querySelector('.lightbox-counter').textContent = `${currentPhoto + 1} / ${galleryItems.length}`;
  if (!lightbox.open) lightbox.showModal();
}
lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.querySelector('.lightbox-prev').addEventListener('click', () => openPhoto(currentPhoto - 1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => openPhoto(currentPhoto + 1));
lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
lightbox.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') openPhoto(currentPhoto - 1);
  if (event.key === 'ArrowRight') openPhoto(currentPhoto + 1);
});
let touchStartX = 0;
lightbox.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
lightbox.addEventListener('touchend', event => {
  const distance = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(distance) > 60) openPhoto(currentPhoto + (distance < 0 ? 1 : -1));
}, { passive: true });

const calendar = document.querySelector('#calendar-grid');
['일', '월', '화', '수', '목', '금', '토'].forEach((day, index) => {
  const label = document.createElement('span');
  label.className = `day-label${index === 0 ? ' sunday' : ''}`;
  label.textContent = day;
  calendar.append(label);
});
const firstWeekday = new Date(Date.UTC(2027, 1, 1)).getUTCDay();
for (let i = 0; i < firstWeekday; i++) calendar.append(document.createElement('span'));
for (let day = 1; day <= 28; day++) {
  const cell = document.createElement('span');
  cell.textContent = String(day);
  if ((firstWeekday + day - 1) % 7 === 0) cell.classList.add('sunday');
  if (day === 20) {
    cell.classList.add('wedding-day');
    cell.setAttribute('aria-label', '2월 20일 결혼식');
  }
  calendar.append(cell);
}

const weddingTime = new Date('2027-02-20T15:00:00+09:00').getTime();
const countdown = document.querySelector('#countdown');
function updateCountdown() {
  const remaining = weddingTime - Date.now();
  if (remaining > 0) {
    const days = Math.ceil(remaining / 86400000);
    countdown.innerHTML = `우리의 결혼식까지 <strong>${days}일</strong> 남았습니다.`;
  } else {
    countdown.textContent = '함께해 주신 모든 분께 감사드립니다.';
  }
}
updateCountdown();

let toastTimer;
function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    showToast('복사에 실패했습니다. 직접 선택해 복사해 주세요.');
  }
}
document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', () => copyText(button.dataset.copy, '계좌번호를 복사했습니다.'));
});
document.querySelector('#share-button').addEventListener('click', async () => {
  if (navigator.share) {
    try {
      await navigator.share({ title: '김세송 ♥ 박나해 결혼합니다', text: '2027년 2월 20일 오후 3시, 대검찰청 별관 4층 예그리나홀', url: location.href.split('#')[0] });
    } catch (error) {
      if (error.name !== 'AbortError') showToast('공유에 실패했습니다.');
    }
  } else {
    await copyText(location.href.split('#')[0], '청첩장 링크를 복사했습니다.');
  }
});

const guestbookService = window.GuestbookService;
const rsvpForm = document.querySelector('#rsvp-form');
const rsvpStatus = document.querySelector('#rsvp-status');
const rsvpPartyField = document.querySelector('#rsvp-party-field');
const rsvpPartySize = document.querySelector('#rsvp-party-size');
const rsvpConfirmation = document.querySelector('#rsvp-confirmation');
const rsvpConfirmationMessage = document.querySelector('#rsvp-confirmation-message');
const attendanceChoices = [...rsvpForm.querySelectorAll('input[name="attending"]')];

function updateRsvpPartyField() {
  const attending = rsvpForm.querySelector('input[name="attending"]:checked')?.value === 'yes';
  rsvpPartyField.hidden = !attending;
  rsvpPartySize.disabled = !attending;
}

attendanceChoices.forEach(choice => choice.addEventListener('change', updateRsvpPartyField));
updateRsvpPartyField();

rsvpForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;
  const submitButton = rsvpForm.querySelector('[type="submit"]');
  const formData = new FormData(rsvpForm);
  const attending = formData.get('attending') === 'yes';
  const partySize = formData.get('partySize');
  submitButton.disabled = true;
  rsvpStatus.textContent = '응답을 보내고 있습니다.';
  try {
    await guestbookService.createRsvp({
      name: formData.get('name'),
      attending,
      partySize,
      note: formData.get('note'),
      website: formData.get('website')
    });
    rsvpForm.reset();
    updateRsvpPartyField();
    rsvpStatus.textContent = '참석 여부를 전해 주셔서 감사합니다.';
    rsvpConfirmationMessage.textContent = attending
      ? `참석, 총 ${partySize}명으로 답변이 잘 전달되었습니다. 알려주셔서 감사합니다.`
      : '참석이 어렵다고 답변을 잘 전달했습니다. 알려주셔서 감사합니다.';
    rsvpConfirmation.showModal();
  } catch (error) {
    console.error('RSVP submission failed', error);
    rsvpStatus.textContent = '응답을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector('#rsvp-confirmation-close').addEventListener('click', () => rsvpConfirmation.close());
rsvpConfirmation.addEventListener('click', event => {
  if (event.target === rsvpConfirmation) rsvpConfirmation.close();
});

const guestbookForm = document.querySelector('#guestbook-form');
const guestbookStatus = document.querySelector('#guestbook-status');
const guestbookList = document.querySelector('#guestbook-list');
const guestbookConfirmation = document.querySelector('#guestbook-confirmation');

function renderApprovedMessages(entries) {
  guestbookList.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'guestbook-empty';
    empty.textContent = '첫 축하 메시지를 남겨 주세요.';
    guestbookList.append(empty);
    return;
  }
  entries.forEach(entry => {
    const article = document.createElement('article');
    article.className = 'guestbook-entry';
    const name = document.createElement('strong');
    name.textContent = entry.name;
    const message = document.createElement('p');
    message.textContent = entry.message;
    const date = document.createElement('time');
    date.dateTime = entry.createdAt;
    date.textContent = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium' }).format(new Date(entry.createdAt));
    article.append(name, date, message);
    guestbookList.append(article);
  });
}

async function refreshGuestbook() {
  try {
    const entries = await guestbookService.listApproved();
    renderApprovedMessages(entries);
  } catch (error) {
    console.error('Guestbook loading failed', error);
    guestbookList.replaceChildren();
    const message = document.createElement('p');
    message.className = 'guestbook-empty';
    message.textContent = '방명록을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.';
    guestbookList.append(message);
  }
}

guestbookForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!guestbookForm.reportValidity()) return;
  const submitButton = guestbookForm.querySelector('[type="submit"]');
  const formData = new FormData(guestbookForm);
  submitButton.disabled = true;
  guestbookStatus.textContent = '메시지를 보내고 있습니다.';
  try {
    await guestbookService.createMessage({
      name: formData.get('name'),
      message: formData.get('message'),
      website: formData.get('website')
    });
    guestbookForm.reset();
    guestbookStatus.textContent = '메시지를 남겨 주셔서 감사합니다. 승인 후 공개됩니다.';
    guestbookConfirmation.showModal();
  } catch (error) {
    console.error('Guestbook submission failed', error);
    guestbookStatus.textContent = '메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.';
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector('#guestbook-confirmation-close').addEventListener('click', () => guestbookConfirmation.close());
guestbookConfirmation.addEventListener('click', event => {
  if (event.target === guestbookConfirmation) guestbookConfirmation.close();
});

refreshGuestbook();
