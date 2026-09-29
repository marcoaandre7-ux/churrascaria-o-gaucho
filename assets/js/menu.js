const content = document.querySelector('[data-menu-content]');
const categoryNav = document.querySelector('[data-category-nav]');
const search = document.querySelector('[data-menu-search]');
const count = document.querySelector('[data-result-count]');
const empty = document.querySelector('[data-menu-empty]');
const clearButton = document.querySelector('[data-clear-search]');
let activeCategory = new URLSearchParams(location.search).get('categoria') || 'todos';
const CART_KEY = 'ogaucho-cart';
let cart = {};
try {
  cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
  if (!cart || Array.isArray(cart) || typeof cart !== 'object') cart = {};
} catch {
  try { localStorage.removeItem(CART_KEY); } catch { /* O carrinho segue disponível durante a visita. */ }
}

const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function buildNavigation() {
  const categories = [{ id: 'todos', name: 'Tudo' }, ...window.MENU_DATA];
  categoryNav.innerHTML = categories.map((category) => `<button type="button" data-category="${category.id}" aria-pressed="${activeCategory === category.id}">${category.name}</button>`).join('');
}

function render() {
  const term = normalize(search.value.trim());
  const categories = window.MENU_DATA
    .filter((category) => activeCategory === 'todos' || category.id === activeCategory)
    .map((category) => ({ ...category, items: category.items.filter((item) => normalize(item.join(' ')).includes(term)) }))
    .filter((category) => category.items.length);

  const total = categories.reduce((sum, category) => sum + category.items.length, 0);
  content.innerHTML = categories.map((category) => `
    <section class="menu-section" id="${category.id}">
      <header class="menu-section-heading"><h2>${category.name}</h2><p>${category.note}</p></header>
      <div class="menu-items">${category.items.map((item) => {
        const sourceIndex = window.MENU_DATA.find((entry) => entry.id === category.id).items.findIndex((source) => source[0] === item[0] && source[1] === item[1]);
        const itemId = `${category.id}-${sourceIndex}`;
        const quantity = cart[itemId]?.quantity || 0;
        return `<article class="menu-item" data-item-id="${itemId}">
          <h3>${item[0]}</h3>
          <div class="menu-item-action">
            <strong>${item[1]}</strong>
            <div class="quantity-control" aria-label="Quantidade de ${item[0]}">
              <button type="button" class="quantity-button minus" aria-label="Retirar ${item[0]} do carrinho" data-tooltip="Retirar do carrinho" data-cart-action="remove" ${quantity === 0 ? 'disabled' : ''}><span aria-hidden="true"></span></button>
              <output aria-live="polite" aria-label="Quantidade no carrinho">${quantity}</output>
              <button type="button" class="quantity-button plus" aria-label="Adicionar ${item[0]} ao carrinho" data-tooltip="Adicionar ao carrinho" data-cart-action="add"><span aria-hidden="true"></span></button>
            </div>
          </div>
          ${item[2] ? `<p>${item[2]}</p>` : ''}
        </article>`;
      }).join('')}</div>
    </section>`).join('');
  count.textContent = term ? `${total} ${total === 1 ? 'item encontrado' : 'itens encontrados'}` : '';
  empty.hidden = total !== 0;
  content.hidden = total === 0;
}

const drawer = document.querySelector('[data-cart-drawer]');
const backdrop = document.querySelector('[data-cart-backdrop]');
const cartItems = document.querySelector('[data-cart-items]');
const cartEmpty = document.querySelector('[data-cart-empty]');
const cartCountNodes = document.querySelectorAll('[data-cart-count]');
const cartSummary = document.querySelector('[data-cart-summary]');
const openButton = document.querySelector('[data-cart-open]');
const whatsappButton = document.querySelector('[data-cart-whatsapp]');

function getSourceItem(itemId) {
  const category = window.MENU_DATA.find((entry) => itemId.startsWith(`${entry.id}-`));
  if (!category) return null;
  const index = Number(itemId.slice(category.id.length + 1));
  const item = Number.isInteger(index) ? category.items[index] : null;
  return item ? { category, item } : null;
}

function sanitizeCart() {
  const safeCart = {};
  Object.entries(cart).forEach(([itemId, entry]) => {
    const source = getSourceItem(itemId);
    const quantity = Number(entry?.quantity);
    if (!source || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return;
    safeCart[itemId] = { name: source.item[0], price: source.item[1], quantity };
  });
  cart = safeCart;
}

function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* O carrinho segue disponível durante a visita. */ }
}

function cartTotalItems() {
  return Object.values(cart).reduce((sum, entry) => sum + entry.quantity, 0);
}

function renderCart() {
  const entries = Object.entries(cart).filter(([, entry]) => entry.quantity > 0);
  const total = cartTotalItems();
  cartCountNodes.forEach((node) => { node.textContent = total; });
  cartSummary.textContent = total === 0 ? 'Nenhum item escolhido.' : `${total} ${total === 1 ? 'item escolhido' : 'itens escolhidos'}.`;
  cartEmpty.hidden = entries.length > 0;
  whatsappButton.disabled = entries.length === 0;
  cartItems.innerHTML = entries.map(([itemId, entry]) => `
    <article class="cart-line" data-cart-line="${itemId}">
      <div><h3>${entry.name}</h3><p>${entry.price}</p></div>
      <div class="quantity-control">
        <button type="button" class="quantity-button minus" aria-label="Retirar ${entry.name}" data-cart-drawer-action="remove" data-item-id="${itemId}"><span aria-hidden="true"></span></button>
        <output aria-label="Quantidade">${entry.quantity}</output>
        <button type="button" class="quantity-button plus" aria-label="Adicionar ${entry.name}" data-cart-drawer-action="add" data-item-id="${itemId}"><span aria-hidden="true"></span></button>
      </div>
    </article>`).join('');
}

function buildWhatsAppMessage() {
  const entries = Object.values(cart).filter((entry) => entry.quantity > 0);
  const lines = entries.map((entry) => `• ${entry.quantity}x ${entry.name} — ${entry.price}`);
  return [
    'Olá! Gostaria de solicitar este pedido para retirada no balcão:',
    '',
    ...lines,
    '',
    `Observação: ${window.SITE_CONFIG.whatsapp.confirmationNotice}`,
  ].join('\n');
}

function changeQuantity(itemId, delta) {
  const source = getSourceItem(itemId);
  if (!source) return;
  const { item } = source;
  const current = cart[itemId]?.quantity || 0;
  const next = Math.max(0, Math.min(99, current + delta));
  if (next === 0) delete cart[itemId];
  else cart[itemId] = { name: item[0], price: item[1], quantity: next };
  saveCart();
  render();
  renderCart();
}

function setDrawer(open) {
  drawer.setAttribute('aria-hidden', String(!open));
  openButton.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !open;
  document.body.classList.toggle('cart-open', open);
  document.querySelectorAll('body > :not(.cart-drawer):not(.cart-backdrop)').forEach((element) => {
    element.inert = open;
  });
  if (open) setTimeout(() => drawer.querySelector('[data-cart-close]').focus(), 50);
  else openButton.focus();
}

content.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const itemId = button.closest('[data-item-id]').dataset.itemId;
  changeQuantity(itemId, button.dataset.cartAction === 'add' ? 1 : -1);
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-drawer-action]');
  if (!button) return;
  changeQuantity(button.dataset.itemId, button.dataset.cartDrawerAction === 'add' ? 1 : -1);
});

openButton.addEventListener('click', () => setDrawer(true));
document.querySelector('[data-cart-close]').addEventListener('click', () => setDrawer(false));
backdrop.addEventListener('click', () => setDrawer(false));
whatsappButton.addEventListener('click', () => {
  if (whatsappButton.disabled || !window.SITE_CONFIG?.whatsapp) return;
  const { number } = window.SITE_CONFIG.whatsapp;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildWhatsAppMessage())}`, '_blank', 'noopener,noreferrer');
});
document.addEventListener('keydown', (event) => {
  if (drawer.getAttribute('aria-hidden') !== 'false') return;
  if (event.key === 'Escape') setDrawer(false);
  if (event.key === 'Tab') {
    const focusable = [...drawer.querySelectorAll('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

categoryNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  activeCategory = button.dataset.category;
  categoryNav.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  render();
  document.querySelector('.menu-content, .menu-empty').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});

search.addEventListener('input', render);
clearButton.addEventListener('click', () => { search.value = ''; activeCategory = 'todos'; buildNavigation(); render(); search.focus(); });
sanitizeCart();
saveCart();
buildNavigation();
render();
renderCart();
