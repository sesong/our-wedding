const photos = [
  ['DSCF0971.jpg', '나무 아래 나란히 선 세송과 나해'],
  ['DSC08214.jpg', '손을 맞잡고 장난스럽게 웃는 두 사람'],
  ['DSCF0816.jpg', '꽃다발을 들고 카메라를 향해 손을 뻗은 두 사람'],
  ['DSC08377.jpg', '소파에 나란히 앉은 두 사람'],
  ['DSCF1315.jpg', '야외에서 환하게 웃는 두 사람'],
  ['DSC08701.jpg', '가까이서 함께 찍은 두 사람의 얼굴'],
  ['DSC08624.jpg', '창가에서 서로에게 꽃을 건네는 두 사람'],
  ['DSCF1415.jpg', '마주 보며 손을 맞댄 두 사람'],
  ['DSCF1570.jpg', '꽃을 들고 웃는 두 사람'],
  ['DSC08898.jpg', '야외에서 함께 촬영한 두 사람'],
  ['DSCF0787.jpg', '계단에서 함께 포즈를 취한 두 사람'],
  ['DSC08486.jpg', '나란히 서 있는 두 사람'],
  ['DSCF1497.jpg', '꽃을 얼굴에 대고 촬영한 두 사람'],
  ['DSC08233.jpg', '꽃다발을 든 나해'],
  ['DSCF1186.jpg', '팔짱을 끼고 선 두 사람'],
  ['DSC08541.jpg', '미소 짓는 나해'],
  ['DSCF1015.jpg', '함께 선 두 사람'],
  ['DSCF0907.jpg', '안경을 쓴 세송과 장난치는 나해'],
  ['DSCF0956.jpg', '함께 포즈를 취한 두 사람'],
  ['DSCF0894.jpg', '정장을 입은 세송']
];

const lightbox = document.querySelector('#lightbox');
const lightboxImage = lightbox.querySelector('img');
let currentPhoto = 0;

document.querySelectorAll('.gallery-item').forEach((button, index) => {
  button.addEventListener('click', () => openPhoto(index));
});

function openPhoto(index) {
  currentPhoto = (index + photos.length) % photos.length;
  const [filename, alt] = photos[currentPhoto];
  lightboxImage.src = `./images/${filename}`;
  lightboxImage.alt = alt;
  lightbox.querySelector('.lightbox-counter').textContent = `${currentPhoto + 1} / ${photos.length}`;
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
