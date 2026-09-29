document.documentElement.classList.add('js');

const THEME_KEY = 'ogaucho-theme';
function readStoredTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

function storeTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* A preferência continua válida nesta visita. */ }
}

const storedTheme = readStoredTheme();
const preferredTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const initialTheme = storedTheme || preferredTheme;
document.documentElement.dataset.theme = initialTheme;

const themeButton = document.createElement('button');
themeButton.className = 'theme-toggle';
themeButton.type = 'button';
themeButton.innerHTML = '<span class="theme-symbol" aria-hidden="true"></span><span class="sr-only"></span>';

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const label = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
  themeButton.setAttribute('aria-label', label);
  themeButton.dataset.tooltip = label;
  themeButton.querySelector('.sr-only').textContent = label;
  themeButton.setAttribute('aria-pressed', String(isDark));
}

const siteHeader = document.querySelector('[data-header]');
if (siteHeader) {
  const toggleAnchor = siteHeader.querySelector('[data-menu-toggle]');
  siteHeader.insertBefore(themeButton, toggleAnchor);
  updateThemeButton();
  themeButton.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    storeTheme(next);
    updateThemeButton();
  });
}

const toggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.querySelector('.sr-only').textContent = open ? 'Abrir menu' : 'Fechar menu';
    nav.classList.toggle('is-open', !open);
    document.body.classList.toggle('menu-open', !open);
  });

  nav.addEventListener('click', (event) => {
    if (event.target.matches('a')) {
      toggle.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
    }
  });
}

document.querySelectorAll('[data-year]').forEach((node) => {
  node.textContent = new Date().getFullYear();
});

const menuRibbon = document.querySelector('.menu-ribbon');
if (menuRibbon && 'IntersectionObserver' in window) {
  const ribbonTrack = menuRibbon.querySelector('.ribbon-track');
  let ribbonVisible = false;
  const updateRibbon = () => ribbonTrack.classList.toggle('is-paused', !ribbonVisible || document.hidden);
  const ribbonObserver = new IntersectionObserver(([entry]) => {
    ribbonVisible = entry.isIntersecting;
    updateRibbon();
  });
  ribbonObserver.observe(menuRibbon);
  document.addEventListener('visibilitychange', updateRibbon);
}

const whatsapp = window.SITE_CONFIG?.whatsapp;
if (whatsapp) {
  const genericMessage = [
    'Olá! Gostaria de fazer um pedido para retirada no balcão.',
    '',
    `Observação: ${whatsapp.confirmationNotice}`,
  ].join('\n');
  document.querySelectorAll('[data-whatsapp-link]').forEach((link) => {
    link.href = `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(genericMessage)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  reveals.forEach((element) => observer.observe(element));
} else {
  reveals.forEach((element) => element.classList.add('is-visible'));
}
