const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const openingIntro = document.querySelector('.opening-intro');
const returningFromGallery = new URLSearchParams(window.location.search).get('from') === 'gallery';

if (returningFromGallery) {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('from');
  window.history.replaceState(null, '', cleanUrl);
}

if (openingIntro) {
  if (!reduceMotion && !returningFromGallery) {
    const finishIntro = () => openingIntro.remove();
    openingIntro.addEventListener('animationend', event => {
      if (event.target === openingIntro && event.animationName === 'openingIntroOut') finishIntro();
    });
    window.setTimeout(finishIntro, 3800);
  } else {
    openingIntro.remove();
  }
}

if (!reduceMotion && 'IntersectionObserver' in window) {
  const sections = [...document.querySelectorAll('main > section:not(.hero)')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.classList.toggle('section-pop-visible', entry.isIntersecting);
    });
  }, { threshold: 0.01, rootMargin: '0px 0px -24px 0px' });

  sections.forEach(section => {
    section.classList.add('section-pop');
    observer.observe(section);
  });
}

const quickActions = document.querySelector('.quick-actions');
if (quickActions) {
  const hero = document.querySelector('.hero');
  const revealAt = Math.min((hero?.offsetHeight || 600) * 0.34, 240);
  const updateQuickActions = () => {
    quickActions.classList.toggle('quick-actions-visible', window.scrollY > revealAt);
  };
  window.addEventListener('scroll', updateQuickActions, { passive: true });
  window.setTimeout(updateQuickActions, 250);
}
