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
