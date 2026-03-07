var currentPage=1,ITEMS_PER_PAGE=8;
function goPage(p){currentPage=p;renderProducts();var s=document.getElementById("products");if(s)s.scrollIntoView({behavior:"smooth",block:"start"});}
function renderPagination(n){var el=document.getElementById("prodPagination");if(!el)return;if(n<=1){el.innerHTML="";return;}var h="<div class=pagination>";if(currentPage>1)h+="<button class=pg-btn onclick=goPage("+(currentPage-1)+")>&#8592;</button>";for(var i=1;i<=n;i++)h+="<button class=pg-btn"+(i===currentPage?" active":"")+" onclick=goPage("+i+")>"+i+"</button>";if(currentPage<n)h+="<button class=pg-btn onclick=goPage("+(currentPage+1)+")>&#8594;</button>";h+="</div>";el.innerHTML=h;}

/* LANG INIT - must be first */
var LANGS_INIT = {
  fr:{btn_cmd:'Commander Maintenant',btn_pan:'+ Ajouter au panier',btn_avis:'Voir les avis',t_stock:'En stock',t_liv:'Livraison rapide',t_no:'Pas encore note'},
  ar:{btn_cmd:'اطلب الآن',btn_pan:'أضف للسلة',btn_avis:'التقييمات',t_stock:'متوفر',t_liv:'توصيل سريع',t_no:'لا تقييم'},
  en:{btn_cmd:'Order Now',btn_pan:'+ Add to Cart',btn_avis:'See Reviews',t_stock:'In Stock',t_liv:'Fast Delivery',t_no:'Not yet rated'}
};
var _cl = localStorage.getItem('hw_lang') || 'fr';
function t(key) { var src=window.LANGS||LANGS_INIT; var L=src[_cl]||src.fr; return (L&&L[key])||(src.fr&&src.fr[key])||key; }

/* ============================================
   HIMO.WATCHES — app.js (v5 backend)
   Connecté au backend Node.js + MySQL
   ============================================ */

const API = 'https://himo-backend-production.up.railway.app/api';

function getWANumber() {
  return localStorage.getItem('hw_wa_number') || '212681345355';
}

// ===== STATE =====
let products    = [];
let promos      = [];
let cart        = JSON.parse(localStorage.getItem('hw_cart') || '[]');
let reviews     = {};
let pendingNote = {};
let activeCat   = 'all';
let currentPid  = null;
let quickPid    = null;

const saveCart = () => localStorage.setItem('hw_cart', JSON.stringify(cart));

/* ============================================
   API HELPER
   ============================================ */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    return null;
  }
}

/* ============================================
   HEADER SCROLL
   ============================================ */
window.addEventListener('scroll', () => {
  document.getElementById('hdr').classList.toggle('scrolled', scrollY > 60);
});

/* ============================================
   HORLOGE
   ============================================ */
function initClock() {
  const ticks = document.getElementById('clkTicks');
  if (ticks) {
    for (let i = 0; i < 12; i++) {
      const t = document.createElement('div');
      t.className = 'clk-tick' + (i % 3 === 0 ? ' big' : '');
      t.style.transform = `rotate(${i * 30}deg)`;
      ticks.appendChild(t);
    }
  }
  function tick() {
    const now = new Date();
    const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours() % 12;
    const eS = document.getElementById('clkS');
    const eM = document.getElementById('clkM');
    const eH = document.getElementById('clkH');
    if (eS) eS.style.transform = `rotate(${s * 6}deg)`;
    if (eM) eM.style.transform = `rotate(${m * 6 + s * 0.1}deg)`;
    if (eH) eH.style.transform = `rotate(${h * 30 + m * 0.5}deg)`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================
   COUNTDOWN
   ============================================ */
function initCountdown() {
  const end = new Date();
  end.setHours(23, 59, 59, 0);
  function update() {
    const diff = end - new Date();
    if (diff <= 0) { end.setDate(end.getDate() + 1); return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pH = document.getElementById('cdH');
    const pM = document.getElementById('cdM');
    const pS = document.getElementById('cdS');
    if (pH) pH.textContent = String(h).padStart(2, '0');
    if (pM) pM.textContent = String(m).padStart(2, '0');
    if (pS) pS.textContent = String(s).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
}

/* ============================================
   PROMO POPUP
   ============================================ */
function initPromoPopup() {
  if (!localStorage.getItem('hw_promoSeen')) {
    setTimeout(() => {
      const bg = document.getElementById('promoBg');
      if (bg) bg.style.display = 'flex';
    }, 2500);
  }
}
function closePromoPopup() {
  const bg = document.getElementById('promoBg');
  if (bg) { bg.style.opacity = '0'; bg.style.transition = 'opacity 0.3s'; setTimeout(() => bg.style.display = 'none', 300); }
  localStorage.setItem('hw_promoSeen', '1');
}

/* ============================================
   TOAST
   ============================================ */
function toast(title, msg, type) {
  const wrap = document.getElementById('toastWrap');
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.innerHTML = `<div class="toast-ttl">${title}</div><div class="toast-msg">${msg || ''}</div><div class="toast-bar"></div>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3200);
}

/* ============================================
   ETOILES
   ============================================ */
function starsHTML(note, interactive, pid) {
  const n = Math.round(parseFloat(note) || 0);
  if (interactive) return [1, 2, 3, 4, 5].map(i => `<span class="star-i${i <= n ? ' on' : ''}" onclick="setNote(${pid},${i})">★</span>`).join('');
  return [1, 2, 3, 4, 5].map(i => `<span class="star${i <= n ? ' on' : ''}">★</span>`).join('');
}
function setNote(pid, val) {
  pendingNote[pid] = val;
  const wrap = document.getElementById('si-' + pid);
  if (wrap) wrap.querySelectorAll('.star-i').forEach((s, i) => s.classList.toggle('on', i < val));
}
function avgNote(pid) {
  const r = reviews[pid] || [];
  if (!r.length) return 0;
  return (r.reduce((s, x) => s + x.note, 0) / r.length).toFixed(1);
}

/* ============================================
   LOAD DATA FROM BACKEND
   ============================================ */
async function loadProducts() {
  const data = await apiFetch('/products');
  if (data && data.products) {
    products = data.products.map(p => ({
      id:    p.id,
      brand: p.brand,
      model: p.model,
      price: parseFloat(p.price),
      cat:   p.category,
      emoji: p.emoji || '⌚',
      badge: p.badge || '',
      img:   p.image_url || '',
      stock: p.stock || 0,
    }));
  }
}

async function loadPromos() {
  try {
    const data = await apiFetch('/promos');
    promos = data.promos.map(p => ({
      id:       p.product_id,
      discount: p.discount,
      label:    p.label,
      code:     p.code
    }));
  } catch(e) {
    promos = [];
  }
}

async function loadReviewsForProduct(pid) {
  const data = await apiFetch('/reviews/' + pid);
  if (data && data.reviews) {
    reviews[pid] = data.reviews.map(r => ({
      name:    r.client_name,
      note:    r.note,
      comment: r.comment,
      date:    new Date(r.created_at).toLocaleDateString('fr-MA'),
    }));
  }
  return reviews[pid] || [];
}

/* ============================================
   PROMOTIONS
   ============================================ */
function renderPromos() {
  const grid = document.getElementById('promosGrid');
  if (!grid) return;
  const html = promos.map(promo => {
    const p = products.find(x => x.id === promo.id);
    if (!p) return '';
    const priceNew = Math.round(p.price * (1 - promo.discount / 100));
    return `
    <div class="promo-card">
      <div class="promo-badge">${promo.label}</div>
      <div class="promo-card-img">${p.img ? `<img src="${p.img}" alt="">` : `<span>${p.emoji}</span>`}</div>
      <div class="promo-card-body">
        <div class="promo-card-brand">${p.brand}</div>
        <div class="promo-card-name">${p.model}</div>
        <div class="promo-prices">
          <span class="price-old">MAD ${p.price.toLocaleString('fr-MA')}</span>
          <span class="price-new">MAD ${priceNew.toLocaleString('fr-MA')}</span>
        </div>
        <div style="font-size:10px;color:var(--gray);margin-bottom:12px">Code: <strong style="color:var(--promo)">${promo.code}</strong></div>
        <div class="promo-card-btns">
          <button class="btn-promo-cart" onclick="addToCart(${p.id})">${t('btn_pan')}</button>
          <button class="btn-promo-order" onclick="openQuickOrder(${p.id}, ${priceNew})">${t('btn_cmd')}</button>
        </div>
      </div>
    </div>`;
  }).join('');
  grid.innerHTML = html || '<div style="color:var(--gray);text-align:center;padding:40px">Aucune promotion disponible</div>';
}

/* ============================================
   PRODUITS
   ============================================ */
function renderProducts() {
  const list = activeCat === 'all' ? products : products.filter(p => p.cat === activeCat);
  const grid = document.getElementById('prodGrid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--gray);font-family:'Cormorant Garamond',serif;font-size:22px">Aucun produit disponible</div>`;
    return;
  }

  var tp=Math.ceil(list.length/ITEMS_PER_PAGE);if(currentPage>tp)currentPage=tp||1;var sl=list.slice((currentPage-1)*ITEMS_PER_PAGE,currentPage*ITEMS_PER_PAGE);renderPagination(tp);
  grid.innerHTML = sl.map(p => {
    const avg = avgNote(p.id);
    const cnt = (reviews[p.id] || []).length;
    const inCart = cart.find(x => x.id === p.id);
    const qty = inCart ? inCart.qty : 0;
    const isPromo = promos.find(x => x.id === p.id);

    return `
    <div class="pcard" id="pcard-${p.id}">
      <div class="pcard-img">
        ${p.img ? `<img src="${p.img}" alt="${p.brand} ${p.model}">` : `<div class="pcard-emoji">${p.emoji}</div>`}
        ${p.badge ? `<div class="pcard-badge${isPromo ? ' promo' : ''}">${isPromo ? isPromo.label + ' ' + p.badge : p.badge}</div>` : ''}
        ${isPromo && !p.badge ? `<div class="pcard-badge promo">${isPromo.label}</div>` : ''}
        <div class="pcard-cat">${p.cat === 'H' ? 'Homme' : 'Femme'}</div>
      </div>
      <div class="pcard-body">
        <div class="pcard-brand">${p.brand}</div>
        <div class="pcard-name">${p.model}</div>
        <div class="pcard-ref">HW-${String(p.id).padStart(3, '0')}</div>
        <div class="pcard-stars">
          <div class="stars-row">${starsHTML(avg)}</div>
          ${avg > 0 ? `<span class="stars-avg">${avg}/5</span><span class="stars-cnt">(${cnt})</span>` : `<span class="stars-cnt" style="color:var(--gray)">${(window.t ? t('t_no') : 'Pas encore note')}</span>`}
        </div>
        <div class="pcard-order-section">
          <div class="pcard-price-row">
            <div class="pcard-price"><small>MAD </small>${p.price.toLocaleString('fr-MA')}</div>
            <div class="pcard-trust-mini">
              <span class="trust-badge stock">🟢 ${(window.t ? t("t_stock") : "En stock")}</span>
              <span class="trust-badge delivery">🚚 ${(window.t ? t("t_liv") : "Livraison rapide")}</span>
            </div>
          </div>
          <button class="btn-commander" onclick="openQuickOrder(${p.id})">${(window.t ? t("btn_cmd") : "Commander")}</button>
          <div class="pcard-cart-row">
            ${qty > 0 ? `
              <div class="cart-inline">
                <button class="ci-minus" onclick="chgQtyInline(${p.id},-1)">−</button>
                <div class="ci-qty" id="ci-qty-${p.id}">${qty}</div>
                <button class="ci-plus" onclick="chgQtyInline(${p.id},1)">+</button>
              </div>
              <span class="in-cart-label">Dans votre panier</span>
            ` : `
              <button class="btn-cart-add" id="btn-add-${p.id}" onclick="addToCartInline(${p.id})">${(window.t ? t("btn_pan") : "+ Panier")}</button>
            `}
          </div>
          <button class="btn-rv-link" onclick="openReviews(${p.id})">${(window.t ? t('btn_avis') : 'Voir les avis')} (${cnt})</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterCat(cat, btn) {
  activeCat = cat;
  currentPage = 1;
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderProducts();
}

/* ============================================
   PANIER INLINE
   ============================================ */
function addToCartInline(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty++;
  else cart.push({ id, qty: 1 });
  saveCart();
  updateCartUI();
  const btnEl = document.getElementById('btn-add-' + id);
  if (btnEl) {
    btnEl.outerHTML = `
      <div class="cart-inline">
        <button class="ci-minus" onclick="chgQtyInline(${id},-1)">−</button>
        <div class="ci-qty" id="ci-qty-${id}">1</div>
        <button class="ci-plus" onclick="chgQtyInline(${id},1)">+</button>
      </div>`;
  }
  toast('✓ Ajouté!', `${p.brand} — ${p.model}`, 'ok');
}

function chgQtyInline(id, d) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) {
    cart = cart.filter(x => x.id !== id);
    const qtyEl = document.getElementById('ci-qty-' + id);
    if (qtyEl && qtyEl.parentElement) {
      qtyEl.parentElement.outerHTML = `<button class="btn-cart-add" id="btn-add-${id}" onclick="addToCartInline(${id})">${(window.t ? t("btn_pan") : "+ Panier")}</button>`;
    }
  } else {
    const qtyEl = document.getElementById('ci-qty-' + id);
    if (qtyEl) qtyEl.textContent = item.qty;
  }
  saveCart();
  updateCartUI();
}

function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty++;
  else cart.push({ id, qty: 1 });
  saveCart();
  updateCartUI();
  renderProducts();
  toast('✓ Ajouté!', `${p.brand} — ${p.model}`, 'ok');
}

/* ============================================
   PANIER SIDEBAR
   ============================================ */
function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) { badge.textContent = total; badge.classList.toggle('show', total > 0); }
  renderCartBody();
}

function renderCartBody() {
  const bd = document.getElementById('cartBd');
  const ft = document.getElementById('cartFt');
  if (!bd) return;
  if (!cart.length) {
    bd.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">⌚</div><div class="cart-empty-txt">Votre panier est vide</div></div>`;
    if (ft) ft.style.display = 'none';
    return;
  }
  let total = 0;
  bd.innerHTML = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    if (!p) return '';
    const sub = p.price * item.qty; total += sub;
    return `<div class="ci">
      <div class="ci-thumb">${p.img ? `<img src="${p.img}" alt="">` : p.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${p.brand} ${p.model}</div>
        <div class="ci-ref">HW-${String(p.id).padStart(3, '0')}</div>
        <div class="ci-ctrl">
          <button class="qty-btn" onclick="chgQty(${item.id},-1)">−</button>
          <span class="qty-n">${item.qty}</span>
          <button class="qty-btn" onclick="chgQty(${item.id},1)">+</button>
          <button class="ci-del" onclick="rmItem(${item.id})">✕ Supprimer</button>
        </div>
      </div>
      <div class="ci-price">MAD ${sub.toLocaleString('fr-MA')}</div>
    </div>`;
  }).join('');
  const tv = document.getElementById('cartTotal');
  if (tv) tv.textContent = `MAD ${total.toLocaleString('fr-MA')}`;
  if (ft) ft.style.display = 'block';
}

function chgQty(id, d) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty += d;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  saveCart(); updateCartUI(); renderProducts();
}
function rmItem(id) { cart = cart.filter(x => x.id !== id); saveCart(); updateCartUI(); renderProducts(); }
function openCart() { document.getElementById('veil').classList.add('on'); document.getElementById('cartPanel').classList.add('on'); }
function closeCart() { document.getElementById('veil').classList.remove('on'); document.getElementById('cartPanel').classList.remove('on'); }

/* ============================================
   WHATSAPP
   ============================================ */
function orderWA() {
  if (!cart.length) return;
  let msg = '🌟 *Nouvelle Commande — HIMO.WATCHES*\n\n';
  let total = 0;
  cart.forEach(item => {
    const p = products.find(x => x.id === item.id);
    if (p) { msg += `▸ ${p.brand} ${p.model} ×${item.qty} = ${(p.price * item.qty).toLocaleString('fr-MA')} MAD\n`; total += p.price * item.qty; }
  });
  msg += `\n*Total: ${total.toLocaleString('fr-MA')} MAD*\n\nMerci de confirmer ma commande!`;
  window.open(`https://wa.me/${getWANumber()}?text=${encodeURIComponent(msg)}`, '_blank');
}

function orderWAProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const msg = `🌟 *Commande — HIMO.WATCHES*\n\n▸ ${p.brand} — ${p.model}\n💰 Prix: ${p.price.toLocaleString('fr-MA')} MAD\n\nBonjour, je souhaite commander cette montre. Merci!`;
  window.open(`https://wa.me/${getWANumber()}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ============================================
   QUICK ORDER
   ============================================ */
let quickPromoPrice = null;

function openQuickOrder(id, promoPrice) {
  quickPid = id;
  quickPromoPrice = promoPrice || null;
  const p = products.find(x => x.id === id);
  if (!p) return;
  const displayPrice = promoPrice || p.price;
  document.getElementById('qoTitle').textContent = 'Commander';
  document.getElementById('qoProdInfo').textContent = p.brand + ' — ' + p.model;
  document.getElementById('qoProdRow').innerHTML = `
    <div class="qo-thumb">${p.img ? `<img src="${p.img}" alt="">` : p.emoji}</div>
    <div class="qo-info">
      <div class="qo-brand">${p.brand}</div>
      <div class="qo-name">${p.model}</div>
      <div class="qo-price">MAD ${displayPrice.toLocaleString('fr-MA')}</div>
    </div>`;
  ['qoNom', 'qoTel', 'qoAddr'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('qoVille').value = '';
  document.getElementById('qoPay').value = '';
  document.getElementById('qoStep1').style.display = 'block';
  document.getElementById('qoStep2').style.display = 'none';
  document.getElementById('quickOrderBg').classList.add('on');
}

async function placeQuickOrder() {
  const nom   = document.getElementById('qoNom').value.trim();
  const tel   = document.getElementById('qoTel').value.trim();
  const ville = document.getElementById('qoVille').value;
  const pay   = document.getElementById('qoPay').value;
  const addr  = document.getElementById('qoAddr').value.trim();
  if (!nom || !tel || !ville || !pay || !addr) { toast('Champs manquants', 'Remplissez tous les champs', 'err'); return; }

  const p = products.find(x => x.id === quickPid);
  if (!p) return;
  const finalPrice = quickPromoPrice || p.price;

  const res = await apiFetch('/orders', {
    method: 'POST',
    body: {
      client: { nom, prenom: '', tel, email: '', addr, ville, pay },
      items:  [{ product_id: p.id, brand: p.brand, model: p.model, price: finalPrice, quantity: 1 }],
      total:  finalPrice,
    }
  });

  if (res && res.order) {
    document.getElementById('qoConfTel').textContent = tel;
    document.getElementById('qoOrderNum').textContent = res.order.id;
    document.getElementById('qoStep1').style.display = 'none';
    document.getElementById('qoStep2').style.display = 'block';
    toast('🎉 Commande confirmée!', `N° ${res.order.id}`, 'ok');
  } else {
    toast('Erreur', 'Commande non envoyée — réessayez', 'err');
  }
}

function orderWASingle() {
  orderWAProduct(quickPid);
}

/* ============================================
   CHECKOUT
   ============================================ */
function openCheckout() {
  if (!cart.length) { toast('Panier vide', 'Ajoutez des produits', 'err'); return; }
  closeCart();
  let html = '<div class="recap-ttl">Récapitulatif</div>';
  let total = 0;
  cart.forEach(item => {
    const p = products.find(x => x.id === item.id);
    if (p) { const sub = p.price * item.qty; html += `<div class="recap-row"><span>${p.brand} ${p.model} ×${item.qty}</span><span>MAD ${sub.toLocaleString('fr-MA')}</span></div>`; total += sub; }
  });
  html += `<div class="recap-total"><span class="recap-total-lbl">Total</span><span class="recap-total-val">MAD ${total.toLocaleString('fr-MA')}</span></div>`;
  document.getElementById('orderRecap').innerHTML = html;
  document.getElementById('checkoutView').style.display = 'block';
  document.getElementById('sucView').style.display = 'none';
  document.getElementById('checkoutBg').classList.add('on');
}

async function placeOrder() {
  const nom    = document.getElementById('fNom').value.trim();
  const prenom = document.getElementById('fPrenom').value.trim();
  const tel    = document.getElementById('fTel').value.trim();
  const addr   = document.getElementById('fAddr').value.trim();
  const ville  = document.getElementById('fVille').value;
  const pay    = document.getElementById('fPay').value;
  if (!nom || !prenom || !tel || !addr || !ville || !pay) { toast('Champs manquants', 'Remplissez tous les champs', 'err'); return; }

  const items = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    return p ? { product_id: p.id, brand: p.brand, model: p.model, price: p.price, quantity: item.qty } : null;
  }).filter(Boolean);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const res = await apiFetch('/orders', {
    method: 'POST',
    body: { client: { nom, prenom, tel, email: document.getElementById('fEmail').value, addr, ville, pay }, items, total }
  });

  if (res && res.order) {
    cart = []; saveCart(); updateCartUI(); renderProducts();
    document.getElementById('sucNum').textContent = res.order.id;
    document.getElementById('checkoutView').style.display = 'none';
    document.getElementById('sucView').style.display = 'block';
    toast('🎉 Commande confirmée!', `N° ${res.order.id}`, 'ok');
  } else {
    toast('Erreur', 'Commande non envoyée — réessayez', 'err');
  }
}

/* ============================================
   REVIEWS
   ============================================ */
async function openReviews(pid) {
  currentPid = pid;
  const p = products.find(x => x.id === pid);
  if (!p) return;
  document.getElementById('rvProdName').textContent = p.brand + ' — ' + p.model;
  await loadReviewsForProduct(pid);
  renderRvList(pid);
  pendingNote[pid] = 0;
  document.getElementById('rvStarsWrap').innerHTML = `<div id="si-${pid}" style="display:flex">${starsHTML(0, true, pid)}</div>`;
  document.getElementById('rvName').value = '';
  document.getElementById('rvComment').value = '';
  document.getElementById('reviewsBg').classList.add('on');
}

function renderRvList(pid) {
  const r = reviews[pid] || [];
  const avg = avgNote(pid);
  const cnt = r.length;
  document.getElementById('rvBig').textContent = avg > 0 ? avg : '—';
  document.getElementById('rvAvgStars').innerHTML = starsHTML(avg);
  document.getElementById('rvTotal').textContent = cnt + ' avis';
  const list = document.getElementById('rvList');
  list.innerHTML = !cnt ? `<div class="rv-empty">Soyez le premier à laisser un avis !</div>` :
    r.map(rv => `<div class="rv-item">
      <div class="rv-hd">
        <span class="rv-author">${rv.name}</span>
        <div class="stars-row">${starsHTML(rv.note)}</div>
        <span class="rv-date">${rv.date}</span>
      </div>
      <div class="rv-txt">${rv.comment}</div>
    </div>`).join('');
}

async function submitReview() {
  const pid     = currentPid;
  const name    = document.getElementById('rvName').value.trim();
  const comment = document.getElementById('rvComment').value.trim();
  const note    = pendingNote[pid] || 0;
  if (!name)    { toast('Manquant', 'Entrez votre prénom', 'err'); return; }
  if (!note)    { toast('Manquant', 'Choisissez une note ★', 'err'); return; }
  if (!comment) { toast('Manquant', 'Écrivez un commentaire', 'err'); return; }

  const res = await apiFetch('/reviews/' + pid, {
    method: 'POST',
    body: { client_name: name, note, comment }
  });

  if (res && res.review) {
    await loadReviewsForProduct(pid);
    renderRvList(pid);
    renderProducts();
    document.getElementById('rvName').value = '';
    document.getElementById('rvComment').value = '';
    pendingNote[pid] = 0;
    document.getElementById('rvStarsWrap').innerHTML = `<div id="si-${pid}" style="display:flex">${starsHTML(0, true, pid)}</div>`;
    toast('✓ Avis publié!', 'Merci pour votre retour', 'ok');
  } else {
    toast('Erreur', 'Avis non envoyé — réessayez', 'err');
  }
}

/* ============================================
   MODAL HELPERS
   ============================================ */
function closeModal(id) { document.getElementById(id).classList.remove('on'); }

/* ============================================
   SCROLL REVEAL
   ============================================ */
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.pcard,.promo-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  initClock();
  initCountdown();
  initPromoPopup();

  const grid = document.getElementById('prodGrid');
  if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--gray)">⏳ Chargement...</div>`;

  await loadProducts();
  await loadPromos();

  renderPromos();
  renderProducts();
  updateCartUI();

  setTimeout(initScrollReveal, 100);

  ['checkoutBg', 'reviewsBg', 'quickOrderBg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('on'); });
  });

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
});

/* ============================================
   HAMBURGER MENU
   ============================================ */
function toggleMenu() {
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('hamburger');
  nav.classList.toggle('open');
  btn.classList.toggle('open');
}
function closeMenu() {
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('hamburger');
  nav.classList.remove('open');
  btn.classList.remove('open');
}
// Close menu on outside click
document.addEventListener('click', e => {
  const nav = document.getElementById('mainNav');
  const btn = document.getElementById('hamburger');
  if (nav && btn && !nav.contains(e.target) && !btn.contains(e.target)) {
    nav.classList.remove('open');
    btn.classList.remove('open');
  }
});


// MULTI-LANGUE

/* MULTI-LANGUE HIMO.WATCHES */
var LANGS = {
  fr: { nav_col:'Collections', nav_pro:'Promotions', nav_mai:'La Maison', nav_con:'Contact',
    h_t1:"L'Art", h_t2:'du Temps', h_sub:'Montres de Prestige - Maroc',
    h_b1:'Explorer la Collection', h_b2:'Offres du Jour', h_founded:'MAISON HIMO 2024',
    btn_cmd:'Commander Maintenant', btn_pan:'+ Ajouter au panier',
    btn_avis:'Voir les avis', t_stock:'En stock', t_liv:'Livraison rapide', t_no:'Pas encore note',
    cd_t:'CES OFFRES EXPIRENT DANS', cd_h:'HEURES', cd_m:'MIN', cd_s:'SEC',
    ft_con:'CONTACT', ft_hor:'Lun-Sam: 9h-20h', ft_liv:'Maroc - Livraison Nationale',
    ft_r:'2024 HIMO.WATCHES', f_all:'Tous', f_h:'Hommes', f_f:'Femmes', f_c:'Couple',mdl_info:'Vos Informations',mdl_prenom:'Prénom *',mdl_tel:'Téléphone *',mdl_ville:'Ville *',mdl_pay:'Paiement *',mdl_addr:'Adresse *',mdl_conf:'✦ Confirmer la Commande',mdl_wa:'◎ Commander par WhatsApp' },
  ar: { nav_col:'المجموعات', nav_pro:'العروض', nav_mai:'دارنا', nav_con:'اتصل بنا',
    h_t1:'فن', h_t2:'الوقت', h_sub:'ساعات فاخرة - المغرب',
    h_b1:'اكتشف', h_b2:'عروض اليوم', h_founded:'دار هيمو 2024',
    btn_cmd:'اطلب الآن', btn_pan:'أضف للسلة',
    btn_avis:'التقييمات', t_stock:'متوفر', t_liv:'توصيل سريع', t_no:'لا تقييم',
    cd_t:'هذه العروض تنتهي', cd_h:'ساعة', cd_m:'دقيقة', cd_s:'ثانية',
    ft_con:'تواصل', ft_hor:'الاث-السب: 9-20', ft_liv:'المغرب - توصيل وطني',
    ft_r:'2024 HIMO.WATCHES', f_all:'الكل', f_h:'رجالي', f_f:'نسائي', f_c:'زوجين',mdl_info:'معلوماتك',mdl_prenom:'الاسم *',mdl_tel:'الهاتف *',mdl_ville:'المدينة *',mdl_pay:'طريقة الدفع *',mdl_addr:'العنوان *',mdl_conf:'تأكيد الطلب ♥',mdl_wa:'◎ اطلب عبر واتساب' },
  en: { nav_col:'Collections', nav_pro:'Promotions', nav_mai:'Our Story', nav_con:'Contact',
    h_t1:'The Art', h_t2:'of Time', h_sub:'Prestige Watches - Morocco',
    h_b1:'Explore Collection', h_b2:"Today's Deals", h_founded:'MAISON HIMO 2024',
    btn_cmd:'Order Now', btn_pan:'+ Add to Cart',
    btn_avis:'See Reviews', t_stock:'In Stock', t_liv:'Fast Delivery', t_no:'Not yet rated',
    cd_t:'THESE OFFERS EXPIRE IN', cd_h:'HRS', cd_m:'MIN', cd_s:'SEC',
    ft_con:'CONTACT', ft_hor:'Mon-Sat: 9AM-8PM', ft_liv:'Morocco - Nationwide Delivery',
    ft_r:'2024 HIMO.WATCHES', f_all:'All', f_h:'Men', f_f:'Women', f_c:'Couple',mdl_info:'Your Information',mdl_prenom:'First Name *',mdl_tel:'Phone *',mdl_ville:'City *',mdl_pay:'Payment *',mdl_addr:'Address *',mdl_conf:'✦ Confirm Order',mdl_wa:'◎ Order via WhatsApp' }
};
var currentLang = localStorage.getItem("hw_lang") || "fr"; _cl = currentLang;
// t() at top of file
function setLang(lang) {
  if (!LANGS[lang]) return;
  currentLang=lang; _cl=lang; localStorage.setItem("hw_lang",lang);
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  ["fr","ar","en"].forEach(function(l){var b=document.getElementById("lang-"+l);if(b)b.classList.toggle("active",l===lang);});
  applyAllTranslations(); renderProducts(); renderPromos();
}
function applyAllTranslations() {
  var T=LANGS[currentLang]||LANGS.fr;
  function s(id,v){var el=document.getElementById(id);if(el&&v)el.textContent=v;}
  document.querySelectorAll("nav#mainNav a").forEach(function(a,i){var k=["nav_col","nav_pro","nav_mai","nav_con"][i];if(k&&T[k])a.textContent=T[k];});
  s("heroFounded",T.h_founded);s("heroTitle1",T.h_t1);s("heroTitle2",T.h_t2);
  s("heroSub",T.h_sub);s("heroBtn1",T.h_b1);s("heroBtn2",T.h_b2);
  s("cdH_lbl",T.cd_h);s("cdM_lbl",T.cd_m);s("cdS_lbl",T.cd_s);s("countdownTitle",T.cd_t);
  var st={fr:{p:"Offres <em>du Jour</em>",c:"Pièces <em>d'Exception</em>"},ar:{p:"عروض <em>حصرية</em>",c:"<em>مجموعاتنا</em>"},en:{p:"Exclusive <em>Offers</em>",c:"Premium <em>Collections</em>"}};
  var s2=st[currentLang]||st.fr;
  var ep=document.getElementById("secPromos"),ec=document.getElementById("secCollections");
  if(ep)ep.innerHTML=s2.p;if(ec)ec.innerHTML=s2.c;
  var fk=["f_all","f_h","f_f","f_c"];
  document.querySelectorAll(".ftab").forEach(function(btn,i){if(fk[i]&&T[fk[i]]){var sp=btn.querySelector("span")||btn;sp.textContent=T[fk[i]];}});
  s("footContact",T.ft_con);s("footHoraires",T.ft_hor);s("footLivraison",T.ft_liv);s("footRights",T.ft_r);s("mdlInfoTitle",T.mdl_info);s("mdlPrenom",T.mdl_prenom);s("mdlTel",T.mdl_tel);s("mdlVille",T.mdl_ville);s("mdlPay",T.mdl_pay);s("mdlAddr",T.mdl_addr);s("mdlBtnConf",T.mdl_conf);s("mdlBtnWA",T.mdl_wa);
}
document.addEventListener("DOMContentLoaded",function(){
  var saved=localStorage.getItem("hw_lang")||"fr";
  var b=document.getElementById("lang-"+saved);if(b)b.classList.add("active");
  if(saved!=="fr")setLang(saved);
});
