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
