/**
 * ТОВ «ПРОФДЕЗІНФЕКЦІЯ ЗАКАРПАТТЯ» - Головний JavaScript
 * Чистий Vanilla JS (ES6+) без сторонніх бібліотек
 */

// Вбудовані резервні дані (працюють навіть якщо сайт відкривають локально через file://)
const DEFAULT_CONTENT = {
  company: {
    name: "ТОВ «ПРОФДЕЗІНФЕКЦІЯ ЗАКАРПАТТЯ»",
    nameEn: "LLC «PDT»",
    edrpou: "40769799",
    extract: "Виписка від 09.02.2024 № 1003231070005003995",
    director: "Ольга Химинець",
    address: "89603, Закарпатська обл., м. Мукачево, вул. Берегівська-об'їзна, 7",
    region: "м. Мукачево, Ужгород та вся Закарпатська область",
    phones: ["+38 (067) 744-77-49", "+38 (066) 212-20-70"],
    email: "profdezzak@gmail.com",
    workHours: "Пн-Нд: 08:00 - 20:00 (Аварійні виїзди 24/7)",
    socials: {
      viber: "viber://chat?number=%2B380677447749",
      telegram: "https://t.me/+380677447749",
      whatsapp: "https://wa.me/380677447749",
      facebook: "https://www.facebook.com/profdezinfekcia.zakarpatta.mukacevo",
      instagram: "https://www.instagram.com/profdezzakarpattia?stkn=MWQzbzFtOXZlNG1mcQ%3D%3D",
      tiktok: "https://www.tiktok.com/@profdezzakarpattia?_r=1"
    }
  },
  trust: {
    eyebrow: "Нам довіряють",
    title: "Захищаємо людей і відповідальний бізнес",
    subtitle: "Працюємо прозоро: з діагностикою, безпечними засобами та офіційними документами.",
    items: [
      { icon: "✓", title: "Сертифікати НАССР", subtitle: "Відповідність ДСТУ EN 16636:2015" },
      { icon: "📋", title: "Офіційні акти", subtitle: "100% захист під час перевірок Держпродспоживслужби" },
      { icon: "👨‍⚕️", title: "Сертифіковані лікарі", subtitle: "Лікарі-дезінфектори з профільним медичним досвідом" },
      { icon: "📍", title: "Вся Закарпатська область", subtitle: "Швидкий виїзд із Мукачева (Ужгород, Берегове, Хуст, Тячів)" }
    ]
  }
};

let siteData = DEFAULT_CONTENT;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Спроба завантажити свіжі дані з JSON
  await loadSiteContent();

  // 2. Ініціалізація компонентів інтерфейсу
  initMobileMenu();
  initSpeedDial();
  initServiceFilters();
  initCardSliders();
  initRevealAnimations();
  initInstructionTabs();
  initModal();
  initLeadForms();
  initCertificatesModal();
  initWorksSlider();
  initScrollToTop();
  initContactPageFeatures();
  initAnchorSmoothScroll();
});

/**
 * Завантаження content.json або використання локального сховища/дефолту
 */
async function loadSiteContent() {
  let loaded = null;
  try {
    const res = await fetch('data/content.json', { cache: 'no-store' });
    if (res.ok) {
      loaded = await res.json();
    }
  } catch (err) {
    console.info("Серверний конфіг недоступний; перевіряємо локальну копію.");
  }

  // Якщо в адмінці зберігали зміни в цьому браузері — показуємо їх
  const localSaved = localStorage.getItem('pdt_site_content');
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed && typeof parsed === 'object') {
        siteData = Object.assign({}, loaded || DEFAULT_CONTENT, parsed);
        if (siteData.trust && Array.isArray(siteData.trust.items)) {
          siteData.trust.items = siteData.trust.items.filter(i => i && i.title && !i.title.includes('Нова перевага'));
        }
        applyDataToDOM(siteData);
        return;
      }
    } catch (e) {
      console.warn("Помилка читання localStorage", e);
    }
  }

  siteData = loaded || DEFAULT_CONTENT;
  applyDataToDOM(siteData);
}

/**
 * Оновлення динамічних текстових вузлів на сторінках
 */
function applyDataToDOM(data) {
  if (!data || !data.company) return;

  const c = data.company;
  document.querySelectorAll('[data-primary-call]').forEach(link => {
    link.href = `tel:${c.phones[0].replace(/[^+\d]/g, '')}`;
    link.setAttribute('aria-label', `Зателефонувати ${c.phones[0]}`);
  });

  // Оновлення телефонів у шапці та підвалі
  document.querySelectorAll('[data-bind="phone-primary"]').forEach(el => {
    if (el.classList.contains('speed-dial-btn')) {
      el.setAttribute('aria-label', `Зателефонувати ${c.phones[0]}`);
      el.title = `Зателефонувати ${c.phones[0]}`;
    } else {
      el.textContent = c.phones[0];
    }
    if (el.tagName === 'A') el.href = `tel:${c.phones[0].replace(/[^+\d]/g, '')}`;
  });

  document.querySelectorAll('[data-bind="phone-secondary"]').forEach(el => {
    el.textContent = c.phones[1];
    if (el.tagName === 'A') el.href = `tel:${c.phones[1].replace(/[^+\d]/g, '')}`;
  });

  document.querySelectorAll('[data-bind="email"]').forEach(el => {
    el.textContent = c.email;
    if (el.tagName === 'A') el.href = `mailto:${c.email}`;
  });

  document.querySelectorAll('[data-bind="address"]').forEach(el => {
    el.textContent = c.address;
  });

  document.querySelectorAll('[data-bind="workHours"], [data-bind="work-hours"]').forEach(el => {
    el.textContent = c.workHours;
  });
  document.querySelectorAll('[data-bind="region"]').forEach(el => { el.textContent = c.region || ''; });

  // Оновлення посилань соцмереж
  if (c.socials) {
    document.querySelectorAll('[data-social="viber"]').forEach(el => el.href = c.socials.viber || '#');
    document.querySelectorAll('[data-social="telegram"]').forEach(el => el.href = c.socials.telegram || '#');
    document.querySelectorAll('[data-social="whatsapp"]').forEach(el => el.href = c.socials.whatsapp || '#');
    document.querySelectorAll('[data-social="facebook"]').forEach(el => el.href = c.socials.facebook || '#');
    document.querySelectorAll('[data-social="instagram"]').forEach(el => el.href = c.socials.instagram || '#');
    document.querySelectorAll('[data-social="tiktok"]').forEach(el => el.href = c.socials.tiktok || '#');
  }

  applyHeroSection(data.hero);
  applyKeyStats(data.keyStats);
  applyTrustSection(data.trust);
  applyCatalogCards(data);
}

function applyHeroSection(hero) {
  if (!hero) return;
  const titleEl = document.querySelector('[data-bind="hero-title"]') || document.querySelector('.hero-title');
  if (titleEl && hero.title) {
    const template = document.createElement('template');
    template.innerHTML = hero.title;
    const clean = node => {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
      if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode('');
      if (!['SPAN', 'STRONG', 'EM', 'BR'].includes(node.tagName)) return document.createTextNode(node.textContent);
      const element = document.createElement(node.tagName.toLowerCase());
      element.append(...[...node.childNodes].map(clean));
      return element;
    };
    titleEl.replaceChildren(...[...template.content.childNodes].map(clean));
  }
  const descEl = document.querySelector('[data-bind="hero-desc"]') || document.querySelector('.hero-desc');
  if (descEl && hero.desc) {
    descEl.textContent = hero.desc;
  }
  const badgeText = document.querySelector('[data-bind="hero-badge-text"]');
  if (badgeText && hero.badge) {
    badgeText.textContent = hero.badge;
  }
  const badgeTag = document.querySelector('[data-bind="hero-badge-tag"]');
  if (badgeTag && hero.tag) {
    badgeTag.textContent = hero.tag;
  }
}

function applyKeyStats(stats) {
  if (!Array.isArray(stats) || !stats.length) return;
  const statCards = document.querySelectorAll('.hero-stats > div, .hero-stat-card');
  stats.forEach((st, idx) => {
    if (statCards[idx]) {
      const val = statCards[idx].querySelector('.stat-val, .hero-stat-val');
      const lbl = statCards[idx].querySelector('.stat-label, .hero-stat-lbl');
      if (val && st.value) val.textContent = st.value;
      if (lbl && st.label) lbl.textContent = st.label;
    }
  });
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach(el => {
    if (value) el.textContent = value;
  });
}

function applyTrustSection(trust) {
  if (!trust) return;
  setText('[data-bind="trust-eyebrow"]', trust.eyebrow);
  setText('[data-bind="trust-title"]', trust.title);
  setText('[data-bind="trust-subtitle"]', trust.subtitle);

  const grid = document.getElementById('trustHighlights');
  if (!grid || !Array.isArray(trust.items) || !trust.items.length) return;
  const validItems = trust.items.filter(item => item && item.title && !item.title.includes('Нова перевага'));
  if (!validItems.length) return;
  grid.replaceChildren();
  validItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'trust-item';
    const icon = document.createElement('div');
    icon.className = 'trust-icon';
    icon.textContent = item.icon || '✓';
    const text = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'trust-title';
    title.textContent = item.title || '';
    const subtitle = document.createElement('div');
    subtitle.className = 'trust-sub';
    subtitle.textContent = item.subtitle || '';
    text.append(title, subtitle);
    card.append(icon, text);
    grid.appendChild(card);
  });
}

function applyCatalogCards(data) {
  (data.services || []).forEach(service => {
    const card = document.querySelector(`[data-catalog-service="${CSS.escape(String(service.id))}"]`) || document.getElementById(service.id);
    if (!card) return;
    card.dataset.category = service.category || card.dataset.category;
    const badge = card.querySelector('.service-badge');
    const title = card.querySelector('.service-title');
    const description = card.querySelector('.service-desc');
    const features = card.querySelector('.service-features');
    const orderButton = card.querySelector('[data-open-modal]');
    if (badge) badge.textContent = service.badge || '';
    if (title) title.textContent = service.title || '';
    if (description) description.textContent = service.shortDesc || '';
    if (features && Array.isArray(service.items) && service.items.length) {
      features.replaceChildren(...service.items.slice(0, 3).map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    }
    if (orderButton) orderButton.dataset.serviceName = service.title || 'Консультація';
  });

  (data.products || []).forEach(product => {
    const card = document.querySelector(`[data-catalog-product="${CSS.escape(String(product.id))}"]`);
    if (!card) return;
    const badge = card.querySelector('.product-badge');
    const title = card.querySelector('.product-title');
    const description = card.querySelector('.product-desc');
    const features = card.querySelector('.product-features');
    const price = card.querySelector('.product-price');
    const orderButton = card.querySelector('[data-open-modal]');
    if (badge) badge.textContent = product.badge || product.status || '';
    if (title) title.textContent = product.title || '';
    if (description) description.textContent = product.shortDesc || '';
    if (price) price.textContent = product.price || 'За запитом';
    if (features && Array.isArray(product.features) && product.features.length) {
      features.replaceChildren(...product.features.slice(0, 4).map(text => {
        const item = document.createElement('li');
        item.textContent = text;
        return item;
      }));
    }
    if (orderButton) orderButton.dataset.serviceName = product.title || 'Замовлення товару';
  });
}

/**
 * Мобільне меню (Hamburger)
 */
function initMobileMenu() {
  const toggle = document.querySelector('.mobile-toggle');
  const menu = document.querySelector('.nav-menu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', menu.classList.contains('open'));
  });

  // Мобільне розкриття підменю послуг
  const dropdownToggle = menu.querySelector('.dropdown-mobile-toggle');
  const dropdownItem = menu.querySelector('.nav-item-dropdown');
  if (dropdownToggle && dropdownItem) {
    // A selected link can retain both hover and keyboard focus on desktop.
    dropdownItem.addEventListener('pointerenter', () => dropdownItem.classList.remove('dropdown-dismissed'));
    dropdownItem.addEventListener('focusin', () => dropdownItem.classList.remove('dropdown-dismissed'));
    dropdownToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdownItem.classList.remove('dropdown-dismissed');
      const isOpen = dropdownItem.classList.toggle('mobile-open');
      dropdownToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Закриття при кліку на посилання
  menu.querySelectorAll('.nav-link, .dropdown-item, .dropdown-all-btn').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      dropdownToggle?.setAttribute('aria-expanded', 'false');
      if (dropdownItem) {
        dropdownItem.classList.remove('mobile-open');
        dropdownItem.classList.add('dropdown-dismissed');
        if (dropdownItem.contains(document.activeElement)) document.activeElement.blur();
      }
    });
  });

  // Закриття меню при кліку поза його межами
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      dropdownToggle?.setAttribute('aria-expanded', 'false');
      if (dropdownItem) dropdownItem.classList.remove('mobile-open');
    }
  });

  // Закриття меню клавішею Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      dropdownToggle?.setAttribute('aria-expanded', 'false');
      if (dropdownItem) dropdownItem.classList.remove('mobile-open');
    }
  });
}

/**
 * Плаваючий віджет швидкого зв'язку (Speed Dial)
 */
function initSpeedDial() {
  const wrapper = document.querySelector('.speed-dial-wrapper');
  const mainBtn = document.querySelector('.speed-dial-main');

  if (!wrapper || !mainBtn) return;

  mainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove('open');
    }
  });
}

/**
 * Фільтрація карток послуг та інтерактивна навігація
 */
function initServiceFilters() {
  const mobileView = window.matchMedia('(max-width: 768px)');
  const map = document.querySelector('.zakarpattia-map-card');
  if (map) {
    const details = document.createElement('details');
    details.className = 'coverage-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Мукачево · Ужгород · усе Закарпаття';
    map.before(details);
    details.append(summary, map);
    const adaptMap = () => { details.open = !mobileView.matches; };
    adaptMap();
    mobileView.addEventListener('change', adaptMap);
  }
  const serviceDetails = document.querySelectorAll('.service-more');
  const adaptDetails = () => serviceDetails.forEach(detail => { detail.open = !mobileView.matches; });
  adaptDetails();
  mobileView.addEventListener('change', adaptDetails);
  let collapsedForPrint = [];
  window.addEventListener('beforeprint', () => {
    collapsedForPrint = [...serviceDetails].filter(detail => !detail.open);
    collapsedForPrint.forEach(detail => { detail.open = true; });
  });
  window.addEventListener('afterprint', () => {
    collapsedForPrint.forEach(detail => { detail.open = false; });
  });
  const filterBtns = document.querySelectorAll('.services-tab-btn, .filter-btn');
  const serviceCards = document.querySelectorAll('.service-card, .service-detail-block');
  const quickBtns = document.querySelectorAll('.service-quick-btn');

  const applyCategoryFilter = (filter) => {
    filterBtns.forEach(b => {
      const active = b.dataset.filter === filter;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });

    serviceCards.forEach(card => {
      const cats = (card.dataset.category || '').split(' ');
      if (filter === 'all' || cats.includes(filter)) {
        card.style.display = card.classList.contains('service-detail-block') ? 'block' : 'flex';
        card.style.animation = card.classList.contains('service-detail-block') ? 'none' : 'fadeIn 0.3s ease';
      } else {
        card.style.display = 'none';
      }
    });

    quickBtns.forEach(qBtn => {
      const cats = (qBtn.dataset.category || '').split(' ');
      if (filter === 'all' || cats.includes(filter)) {
        qBtn.style.display = 'flex';
      } else {
        qBtn.style.display = 'none';
      }
    });
    const counter = document.querySelector('.services-quick-count');
    if (counter) {
      counter.setAttribute('role', 'status');
      counter.textContent = `Знайдено: ${[...quickBtns].filter(btn => btn.style.display !== 'none').length}`;
    }

    const slider = document.getElementById('servicesSlider');
    if (slider) {
      slider.scrollTo({ left: 0, behavior: 'smooth' });
    }
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyCategoryFilter(btn.dataset.filter);
      if (quickBtns.length) {
        const url = new URL(location.href);
        if (btn.dataset.filter === 'all') url.searchParams.delete('category');
        else url.searchParams.set('category', btn.dataset.filter);
        url.hash = '';
        history.pushState(null, '', url);
      }
    });
  });
  const restoreCategory = () => {
    const category = new URL(location.href).searchParams.get('category') || 'all';
    applyCategoryFilter([...filterBtns].some(btn => btn.dataset.filter === category) ? category : 'all');
    const target = document.getElementById(location.hash.slice(1));
    if (target?.matches('.service-detail-block') && target.style.display === 'none') applyCategoryFilter('all');
  };
  if (quickBtns.length) {
    restoreCategory();
    window.addEventListener('popstate', restoreCategory);
    window.addEventListener('hashchange', restoreCategory);
    document.addEventListener('service:reveal', (event) => {
      if (event.detail?.style.display !== 'none') return;
      applyCategoryFilter('all');
      const url = new URL(location.href);
      url.searchParams.delete('category');
      history.replaceState(null, '', url);
    });
  }

  // Обробка кліку на швидкі кнопки переходу
  quickBtns.forEach(qBtn => {
    qBtn.addEventListener('click', (e) => {
      const targetId = qBtn.getAttribute('href')?.replace('#', '');
      if (!targetId) return;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        // Якщо блок прихований фільтром — повертаємо показ усіх
        if (targetEl.style.display === 'none' || targetEl.classList.contains('is-hidden')) {
          applyCategoryFilter('all');
        }
        scrollToTargetWithOffset(targetEl);
        if (history.pushState) {
          history.pushState(null, '', `#${targetId}`);
        }
      }
    });
  });

  // Автоматичне позиціонування та підсвічування при переході за хешем (#deratization тощо)
  if (window.location.hash) {
    const hashId = window.location.hash.replace('#', '');
    const targetBlock = document.getElementById(hashId);
    if (targetBlock) {
      if (targetBlock.style.display === 'none') applyCategoryFilter('all');
      const positionTarget = () => {
        scrollToTargetWithOffset(targetBlock);
      };
      setTimeout(positionTarget, 150);
      window.addEventListener('load', positionTarget, { once: true });
    }
  }
}

/**
 * Плавне точне прокручування до цільового блоку з урахуванням висоти закріпленої шапки
 */
function scrollToTargetWithOffset(element, customOffset = null) {
  if (element?.tagName === 'DETAILS') element.open = true;
  if (!element) return;
  if (element.matches('.service-detail-block')) document.dispatchEvent(new CustomEvent('service:reveal', { detail: element }));
  const header = document.querySelector('.site-header');
  const headerHeight = header ? header.getBoundingClientRect().height : 75;
  const offset = customOffset !== null ? customOffset : (headerHeight + 25);

  const rect = element.getBoundingClientRect();
  const absoluteTop = rect.top + window.pageYOffset;
  const targetY = Math.max(0, absoluteTop - offset);

  window.scrollTo({
    top: targetY,
    behavior: 'smooth'
  });
}

/** Компактні горизонтальні каталоги на головній сторінці з автопрокруткою */
/** РљРѕРјРїР°РєС‚РЅС– РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅС– РєР°С‚Р°Р»РѕРіРё Р· РЅРµРїРµСЂРµСЂРІРЅРёРј С€РѕРІРєРѕРІРёРј СЂСѓС…РѕРј (Infinite Marquee Glide) */
function initCardSliders() {
  // РћР±СЂРѕР±РЅРёРєРё СЃС‚СЂС–Р»РѕРє СЂСѓС‡РЅРѕРіРѕ РіРѕСЂС‚Р°РЅРЅСЏ
  document.querySelectorAll('[data-slider-prev], [data-slider-next]').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.sliderPrev || button.dataset.sliderNext;
      const slider = document.getElementById(targetId);
      if (!slider) return;
      const direction = button.dataset.sliderNext ? 1 : -1;
      const visibleChild = Array.from(slider.children).find(c => c.offsetWidth > 0);
      const step = visibleChild ? visibleChild.offsetWidth + 20 : 380;
      slider.scrollBy({ left: direction * step, behavior: 'smooth' });
    });
  });

  // РќРµРїРµСЂРµСЂРІРЅРёР№ РїР»Р°РІРЅРёР№ СЂСѓС… РґР»СЏ СЃР»Р°Р№РґРµСЂС–РІ Р· data-autoplay="true"
  const autoSliders = document.querySelectorAll('.card-slider[data-autoplay="true"]');
  autoSliders.forEach(slider => {
    let animId = null;
    let isPaused = false;
    let isVisible = true;
    let pauseTimeout = null;
    const speed = 0.65; // РЁРІРёРґРєС–СЃС‚СЊ: С€РѕРІРєРѕРІРёР№ РґРµР»С–РєР°С‚РЅРёР№ СЂСѓС… (~40px/СЃРµРє)

    // РљР»РѕРЅСѓС”РјРѕ РїРµСЂРІРёРЅРЅС– РєР°СЂС‚РєРё РґР»СЏ СЃС‚РІРѕСЂРµРЅРЅСЏ Р±РµР·РїРµСЂРµСЂРІРЅРѕРіРѕ Р±РµР·С€РѕРІРЅРѕРіРѕ С†РёРєР»Сѓ
    const originalChildren = Array.from(slider.children);
    if (originalChildren.length <= 1) return;

    originalChildren.forEach(child => {
      const clone = child.cloneNode(true);
      clone.setAttribute('data-clone', 'true');
      slider.appendChild(clone);
    });

    // Р РѕР·СЂР°С…СѓРЅРѕРє С‚РѕС‡РєРё Р±РµР·С€РѕРІРЅРѕРіРѕ Р·Р°С†РёРєР»РµРЅРЅСЏ (С€РёСЂРёРЅР° РѕСЂРёРіС–РЅР°Р»СЊРЅРѕРіРѕ РЅР°Р±РѕСЂСѓ)
    const getHalfWidth = () => {
      const originalCards = Array.from(slider.children).filter(c => !c.hasAttribute('data-clone') && c.offsetWidth > 0);
      if (!originalCards.length) return slider.scrollWidth / 2;
      const lastOrig = originalCards[originalCards.length - 1];
      return (lastOrig.offsetLeft + lastOrig.offsetWidth + 20) - originalCards[0].offsetLeft;
    };

    let halfWidth = getHalfWidth();
    window.addEventListener('resize', () => {
      halfWidth = getHalfWidth();
    });

    // РћСЃРЅРѕРІРЅРёР№ С†РёРєР» РїР»Р°РІРЅРѕС— Р°РЅС–РјР°С†С–С— РЅР° requestAnimationFrame (60/120 FPS)
    const tick = () => {
      if (!isPaused && isVisible && !slider.classList.contains('is-dragging')) {
        slider.scrollLeft += speed;

        // РљРѕР»Рё РґС–Р№С€Р»Рё РґРѕ РєРѕРїС–С— вЂ” РјРёС‚С‚С”РІРѕ РїРѕРІРµСЂС‚Р°С”РјРѕ РЅР° РїРѕС‡Р°С‚РѕРє РѕСЂРёРіС–РЅР°Р»СЊРЅРѕРіРѕ РЅР°Р±РѕСЂСѓ
        // РћСЃРєС–Р»СЊРєРё РєРѕРїС–С— С–РґРµРЅС‚РёС‡РЅС– РґРѕ РїС–РєСЃРµР»СЏ, РІС–Р·СѓР°Р»СЊРЅРѕ Р·СЃСѓРІ Р°Р±СЃРѕР»СЋС‚РЅРѕ РЅРµРІРёРґРёРјРёР№
        if (slider.scrollLeft >= halfWidth) {
          slider.scrollLeft -= halfWidth;
        } else if (slider.scrollLeft <= 0) {
          slider.scrollLeft += halfWidth;
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    // РџР°СѓР·Р° РїСЂРё РЅР°РІРµРґРµРЅРЅС– РєСѓСЂСЃРѕСЂСѓ РјРёС€С– Р±РµР·РїРѕСЃРµСЂРµРґРЅСЊРѕ РЅР° РєР°СЂС‚РєРё
    slider.addEventListener('mouseenter', () => {
      clearTimeout(pauseTimeout);
      isPaused = true;
    });

    slider.addEventListener('mouseleave', () => {
      clearTimeout(pauseTimeout);
      pauseTimeout = setTimeout(() => {
        isPaused = false;
      }, 700);
    });

    // РџР°СѓР·Р° РїСЂРё РґРѕС‚РёРєСѓ РЅР° СЃРјР°СЂС‚С„РѕРЅР°С…
    slider.addEventListener('touchstart', () => {
      clearTimeout(pauseTimeout);
      isPaused = true;
    }, { passive: true });

    slider.addEventListener('touchend', () => {
      clearTimeout(pauseTimeout);
      pauseTimeout = setTimeout(() => {
        isPaused = false;
      }, 2500);
    }, { passive: true });

    // РџСЂРё РєР»С–РєСѓ РЅР° СЃС‚СЂС–Р»РєРё вЂ” РїР°СѓР·Р° РЅР° 3.5 СЃРµРєСѓРЅРґРё
    const sliderId = slider.id;
    if (sliderId) {
      document.querySelectorAll(`[data-slider-prev="${sliderId}"], [data-slider-next="${sliderId}"]`).forEach(btn => {
        btn.addEventListener('click', () => {
          clearTimeout(pauseTimeout);
          isPaused = true;
          pauseTimeout = setTimeout(() => {
            isPaused = false;
          }, 3500);
        });
      });
    }

    // Р—СѓРїРёРЅСЏС”РјРѕ Р°РЅС–РјР°С†С–СЋ, РєРѕР»Рё Р±Р»РѕРє РїРѕР·Р° РµРєСЂР°РЅРѕРј (0% РЅР°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ CPU)
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          isVisible = entry.isIntersecting;
        });
      }, { threshold: 0.05 });
      observer.observe(slider);
    }
  });

  // Natural horizontal scroll: Shift + Wheel or trackpad deltaX
  document.querySelectorAll('.card-slider').forEach(slider => {
    slider.addEventListener('wheel', (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        slider.scrollBy({ left: e.deltaY * 1.5, behavior: 'auto' });
      }
    }, { passive: false });

    // Drag-to-scroll РґР»СЏ РјРёС€РєРё
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;

    slider.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, a, input, select, textarea')) return;
      isDown = true;
      isDragging = false;
      slider.classList.add('is-dragging');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        setTimeout(() => {
          slider.classList.remove('is-dragging');
          isDragging = false;
        }, 50);
      }
    });

    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.3;
      if (Math.abs(walk) > 6) {
        isDragging = true;
      }
      slider.scrollLeft = scrollLeft - walk;
    });

    slider.addEventListener('click', (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  });
}

/** Ненав'язливе появлення блоків під час прокрутки. */
function initRevealAnimations() {
  const elements = document.querySelectorAll('.section-header, .trust-item, .service-card, .product-card, .haccp-card, .contact-info-card, .map-card');
  if (!elements.length || !('IntersectionObserver' in window)) return;

  elements.forEach((element, index) => {
    element.classList.add('reveal');
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  elements.forEach(element => observer.observe(element));
}

/**
 * Перемикання вкладок у розділі інструкцій
 */
function initInstructionTabs() {
  const tabBtns = document.querySelectorAll('.instructions-tab-btn');
  const contentBlocks = document.querySelectorAll('.instruction-block');

  if (!tabBtns.length) return;

  document.getElementById('printInstruction')?.addEventListener('click', () => window.print());
  let closedDetails = [];
  window.addEventListener('beforeprint', () => {
    closedDetails = [...document.querySelectorAll('.instruction-block.active details:not([open])')];
    closedDetails.forEach(detail => { detail.open = true; });
  });
  window.addEventListener('afterprint', () => {
    closedDetails.forEach(detail => { detail.open = false; });
    closedDetails = [];
  });

  const activateTab = (targetId) => {
    if (![...tabBtns].some(btn => btn.dataset.target === targetId)) return;
    tabBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.target === targetId);
      b.setAttribute('aria-selected', String(b.dataset.target === targetId));
    });
    contentBlocks.forEach(block => {
      block.classList.toggle('active', block.id === targetId);
    });
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.target);
    });
  });

  // Підтримка хеш-посилань (наприклад, #faq, #full-faq, #full-patron тощо)
  const hash = window.location.hash;
  if (hash === '#faq' || hash === '#full-faq') {
    activateTab('full-faq');
    const target = document.getElementById('full-faq');
    if (target) {
      setTimeout(() => scrollToTargetWithOffset(target), 150);
    }
  } else if (hash) {
    const targetId = hash.replace('#', '');
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      activateTab(targetId);
      setTimeout(() => scrollToTargetWithOffset(targetEl), 150);
    }
  }
}

/**
 * Модальне вікно замовлення та швидкої консультації
 */
function initModal() {
  const backdrop = document.getElementById('orderModal');
  if (!backdrop) return;
  const closeBtn = backdrop.querySelector('.modal-close');
  const serviceInput = backdrop.querySelector('#modalServiceInput');
  const dialog = backdrop.querySelector('[role="dialog"]');
  let opener = null;
  const close = () => {
    backdrop.classList.remove('open');
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };
  backdrop.addEventListener('order:close', close);
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open-modal]');
    if (!btn) return;
    e.preventDefault();
    opener = btn;
    const form = backdrop.querySelector('form');
    if (form) form.hidden = false;
    const descEl = backdrop.querySelector('#orderModalDescription') || backdrop.querySelector('.order-modal-description');
    if (descEl) {
      descEl.hidden = false;
      const product = !!btn.closest('.product-card');
      descEl.textContent = product
        ? 'Залиште ім’я та телефон. Ми уточнимо наявність, ціну й умови отримання товару.'
        : 'Залиште ім’я та телефон. Ми зв’яжемося з вами, уточнимо деталі та погодимо вартість.';
    }
    backdrop.querySelectorAll('.lead-success, .lead-feedback').forEach(el => { el.hidden = true; });
    const serviceName = btn.dataset.serviceName || 'Консультація';
    if (serviceInput) serviceInput.value = serviceName === 'Виклик лікаря' ? 'Консультація щодо послуг' : serviceName;
    const product = !!btn.closest('.product-card');
    const titleEl = backdrop.querySelector('#orderModalTitle') || backdrop.querySelector('.order-modal-title') || backdrop.querySelector('h2, h3');
    if (titleEl) {
      titleEl.textContent = product ? 'Заявка на товар' : 'Залишити заявку';
    }
    backdrop.classList.add('open');
    requestAnimationFrame(() => {
      if (backdrop.classList.contains('open') && dialog) dialog.focus({ preventScroll: true });
    });
  });
  if (closeBtn) closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', (e) => {
    if (!backdrop.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      e.preventDefault(); last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first?.focus();
    }
  });
}

// ─── Telegram lead integration ────────────────────────────────────────────────

function initLeadForms() {
  const forms = document.querySelectorAll('form[data-lead-form]');
  forms.forEach(form => {
    const feedback = document.createElement('p');
    feedback.className = 'lead-feedback';
    feedback.setAttribute('role', 'alert');
    feedback.hidden = true;
    form.querySelector('[type="submit"]').before(feedback);
    const success = document.createElement('div');
    success.className = 'lead-success';
    success.hidden = true;
    success.tabIndex = -1;
    success.setAttribute('role', 'status');
    const title = document.createElement('h3');
    title.textContent = 'Заявку отримано';
    const note = document.createElement('p');
    note.textContent = 'Ми зв’яжемося з вами за вказаним номером, щоб уточнити деталі. Повторно надсилати заявку не потрібно.';
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'btn btn-primary';
    done.textContent = form.closest('#orderModal') ? 'Готово' : 'Нова заявка';
    success.append(title, note, done);
    form.after(success);
    done.addEventListener('click', () => {
      const modal = form.closest('#orderModal');
      if (modal) modal.dispatchEvent(new Event('order:close'));
      else { success.hidden = true; form.hidden = false; form.querySelector('input:not([readonly])')?.focus(); }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      feedback.hidden = true;
      if (document.body.dataset.demo === 'true') {
        feedback.textContent = 'Демонстраційна версія: заявку не надіслано. Для зв’язку скористайтеся телефоном.';
        feedback.hidden = false;
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      const origText = btn ? btn.innerText : '';
      if (btn) { btn.disabled = true; btn.innerText = 'Надсилаємо...'; }
      const payload = getLeadPayload(form);
      let sent = false;
      try {
        const response = await fetch('admin/api/orders.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok && result.success) {
          sent = true;

        }
      } catch (_) {}
      if (!sent) {
        feedback.textContent = 'Не вдалося надіслати заявку. Дані збережено в полях — спробуйте ще раз або зателефонуйте нам.';
        feedback.hidden = false;
        if (btn) { btn.disabled = false; btn.innerText = origText; }
        return;
      }
      form.reset();
      form.hidden = true;
      success.hidden = false;
      const modal = form.closest('#orderModal');
      if (modal) {
        modal.querySelector('#orderModalTitle').textContent = 'Дякуємо за звернення';
        modal.querySelector('#orderModalDescription').hidden = true;
      }
      success.focus();
      if (btn) { btn.disabled = false; btn.innerText = origText; }
    });
  });
}

function getLeadPayload(form) {
  const field = (selector) => form.querySelector(selector)?.value.trim() || '';
  const service = field('[name="service"]') || field('#modalServiceInput') || 'Консультація';
  const textInputs = [...form.querySelectorAll('input[type="text"]')];
  const nameInput = form.querySelector('[name="name"]') || textInputs.find(i => i.id !== 'modalServiceInput');
  const addressInput = form.querySelector('[name="address"]');
  const emailInput = form.querySelector('input[type="email"], [name="email"]');
  return {
    name: nameInput?.value.trim() || 'Клієнт',
    phone: field('[name="phone"]') || field('input[type="tel"]'),
    email: emailInput?.value.trim() || '',
    service,
    objectType: field('[name="objectType"]'),
    address: addressInput?.value.trim() || '',
    notes: field('[name="notes"]')
  };
}

/**
 * Збільшення сертифікатів у модальному вікні
 */
function initCertificatesModal() {
  const certElements = document.querySelectorAll('[data-zoom-cert]');
  if (!certElements.length) return;

  let modal = document.getElementById('certModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'certModal';
    modal.className = 'cert-modal-backdrop';
    modal.innerHTML = `
      <div class="cert-modal-wrapper">
        <button type="button" class="cert-modal-close" aria-label="Закрити">&times;</button>
        <div class="cert-modal-image-box">
          <img src="" alt="Сертифікат" id="certModalImg" class="cert-modal-img">
        </div>
        <div class="cert-modal-caption" id="certModalCaption"></div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.cert-modal-close');
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('cert-modal-wrapper')) {
        modal.classList.remove('open');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        modal.classList.remove('open');
      }
    });
  }

  const modalImg = modal.querySelector('#certModalImg');
  const modalCaption = modal.querySelector('#certModalCaption');

  certElements.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const imgSrc = item.getAttribute('data-zoom-cert') || item.getAttribute('src') || item.getAttribute('href');
      const caption = item.getAttribute('data-cert-title') || item.getAttribute('alt') || 'Офіційний сертифікат';
      if (!imgSrc) return;

      modalImg.src = imgSrc;
      modalCaption.textContent = caption;
      modal.classList.add('open');
    });
  });
}

/**
 * Спливаюче сповіщення (Toast)
 */
function showToast(message) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4500);
}

/**
 * Слайдер фото виконаних робіт (секція "Захищаємо людей")
 */
function initWorksSlider() {
  const gallery = document.querySelector('.work-photos-details');
  if (gallery) {
    const mobile = window.matchMedia('(max-width: 768px)');
    const adaptGallery = () => { gallery.open = !mobile.matches || location.hash === '#trust'; };
    adaptGallery();
    mobile.addEventListener('change', adaptGallery);
  }
  const wrapper = document.getElementById('worksSlider');
  if (!wrapper) return;

  const slides = Array.from(wrapper.querySelectorAll('.works-slide'));
  const dots   = Array.from(document.querySelectorAll('.works-slider-dots .works-dot'));
  const prevBtn = document.querySelector('.works-slider-prev');
  const nextBtn = document.querySelector('.works-slider-next');

  if (!slides.length) return;

  let current  = 0;
  let timer    = null;
  const DELAY  = 4800;
  const TOTAL  = slides.length;

  function goTo(idx) {
    slides[current].classList.remove('active');
    slides[current].setAttribute('aria-hidden', 'true');
    if (dots[current]) {
      dots[current].classList.remove('active');
      dots[current].setAttribute('aria-selected', 'false');
    }

    current = (idx + TOTAL) % TOTAL;

    slides[current].classList.add('active');
    slides[current].setAttribute('aria-hidden', 'false');
    if (dots[current]) {
      dots[current].classList.add('active');
      dots[current].setAttribute('aria-selected', 'true');
    }
  }

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(() => goTo(current + 1), DELAY);
  }

  function stopAutoplay() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  // Arrows
  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current - 1); startAutoplay(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current + 1); startAutoplay(); });

  // Dots
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startAutoplay(); });
  });

  // Pause on hover
  const wrapperEl = wrapper.closest('.works-slider-wrapper');
  if (wrapperEl) {
    wrapperEl.addEventListener('mouseenter', stopAutoplay);
    wrapperEl.addEventListener('mouseleave', startAutoplay);
    wrapperEl.addEventListener('focusin',    stopAutoplay);
    wrapperEl.addEventListener('focusout',   startAutoplay);
  }

  // Touch / swipe support
  let touchStartX = 0;
  wrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    stopAutoplay();
  }, { passive: true });

  wrapper.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 40) {
      goTo(delta < 0 ? current + 1 : current - 1);
    }
    startAutoplay();
  }, { passive: true });

  // Keyboard accessibility
  if (wrapperEl) {
    wrapperEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { goTo(current - 1); startAutoplay(); }
      if (e.key === 'ArrowRight') { goTo(current + 1); startAutoplay(); }
    });
  }

  startAutoplay();
}

/**
 * Плаваюча кнопка швидкого повернення нагору (Вгору ↑)
 */
function initScrollToTop() {
  const btn = document.createElement('button');
  btn.id = 'backToTop';
  btn.className = 'back-to-top-btn';
  btn.setAttribute('type', 'button');
  btn.setAttribute('aria-label', 'Повернутися нагору');
  btn.setAttribute('title', 'Повернутися нагору');
  btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>`;
  document.body.appendChild(btn);

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 420) {
          btn.classList.add('is-visible');
        } else {
          btn.classList.remove('is-visible');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}



/**
 * Модальне вікно лікаря-консультанта (кнопки [data-doctor-contact])
 */
function initDoctorContactModal() {
  const triggers = document.querySelectorAll('[data-doctor-contact]');
  if (!triggers.length) return;

  let modal = document.getElementById('doctorContactModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'doctorContactModal';
    modal.className = 'cert-modal-backdrop';
    modal.innerHTML = `
      <div class="cert-modal-wrapper" style="max-width:400px;text-align:center;padding:2rem 1.5rem;">
        <button type="button" class="cert-modal-close" aria-label="Закрити">&times;</button>
        <h3 style="margin-bottom:1rem;">Зв'яжіться з лікарем</h3>
        <p style="margin-bottom:1.5rem;color:var(--color-text-muted,#666);">Оберіть зручний спосіб зв'язку</p>
        <div style="display:flex;flex-direction:column;gap:0.75rem;">
          <a href="tel:0677447749" class="btn btn-primary" style="justify-content:center;">
            📞 Зателефонувати: 067 744-77-49
          </a>
          <a href="viber://chat?number=%2B380677447749" class="btn btn-outline" style="justify-content:center;">
            💜 Viber
          </a>
          <a href="https://t.me/+380677447749" target="_blank" rel="noopener" class="btn btn-outline" style="justify-content:center;">
            ✈️ Telegram
          </a>
          <a href="https://wa.me/380677447749" target="_blank" rel="noopener" class="btn btn-outline" style="justify-content:center;">
            💬 WhatsApp
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.cert-modal-close');
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) modal.classList.remove('open');
    });
  }

  triggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('open');
    });
  });
}

/**
 * Функціонал сторінки контактів (Копіювання реквізитів, перемикач B2B/B2C, синхронізація форми)
 */
function initContactPageFeatures() {
  // 1. Швидке копіювання значення в буфер обміну
  document.querySelectorAll('[data-copy-val]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const val = btn.getAttribute('data-copy-val');
      if (!val) return;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(val);
        } else {
          const temp = document.createElement('textarea');
          temp.value = val;
          temp.style.position = 'fixed';
          temp.style.left = '-9999px';
          document.body.appendChild(temp);
          temp.focus();
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        showToast(`📋 Скопійовано в буфер: ${val.length > 30 ? val.substring(0, 30) + '...' : val}`);
      } catch (err) {
        showToast(`📋 Скопійовано: ${val.substring(0, 25)}...`);
      }
    });
  });

  // 2. Перемикач типу клієнта (Юридична особа / Приватна)
  const clientTypeBtns = document.querySelectorAll('.client-type-btn');
  const serviceSelect = document.getElementById('contactServiceSelect');
  const serviceInput = document.getElementById('contactServiceInput');
  const objectTypeInput = document.getElementById('contactObjectType');

  clientTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      clientTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const isB2b = btn.getAttribute('data-client-type') === 'b2b';
      
      if (objectTypeInput) {
        objectTypeInput.value = isB2b ? 'Юридична особа / НАССР' : 'Приватний сектор (Будинок / Квартира)';
      }
      if (serviceSelect) {
        if (isB2b) {
          serviceSelect.value = 'Комплексний НАССР аудит та пест-контроль';
        } else {
          serviceSelect.value = 'Дезінсекція (Комахи, таргани, клопи)';
        }
        if (serviceInput) {
          serviceInput.value = serviceSelect.value;
        }
      }
    });
  });

  if (serviceSelect && serviceInput) {
    serviceSelect.addEventListener('change', () => {
      serviceInput.value = serviceSelect.value;
    });
  }
}

/**
 * Глобальний обробник плавного скролу для всіх якірних посилань (a[href*="#"])
 * Гарантує, що при натисканні будь-якої кнопки користувач потрапляє точно на початок блоку,
 * без закриття заголовка закріпленою шапкою і без потрапляння «посередині» блоку.
 */
function initAnchorSmoothScroll() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href*="#"]');
    if (!link) return;

    // Ігноруємо кнопки модалок та специфічні швидкі кнопки (у них окрема логіка)
    if (link.hasAttribute('data-open-modal') || link.classList.contains('service-quick-btn')) return;

    const href = link.getAttribute('href');
    if (!href || href === '#' || href.startsWith('#!')) return;

    // Перевіряємо, чи якір веде на елемент поточної сторінки
    try {
      const url = new URL(link.href, window.location.href);
      const isCurrentPage = (url.pathname === window.location.pathname) ||
        (url.pathname.endsWith('index.html') && window.location.pathname.endsWith('/')) ||
        (window.location.pathname.endsWith('index.html') && url.pathname.endsWith('/'));

      if (isCurrentPage && url.hash) {
        const targetId = url.hash.slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          scrollToTargetWithOffset(targetEl);
          if (history.pushState) {
            history.pushState(null, '', url.hash);
          }
        }
      }
    } catch (_) {}
  });

  // Якщо сторінка (наприклад index.html або contacts.html) відкрита з хешем у URL
  if (window.location.hash && !window.location.pathname.includes('services.html') && !window.location.pathname.includes('instructions.html')) {
    const hashId = window.location.hash.slice(1);
    const targetEl = document.getElementById(hashId);
    if (targetEl) {
      const scrollOnLoad = () => {
        scrollToTargetWithOffset(targetEl);
      };
      setTimeout(scrollOnLoad, 200);
      window.addEventListener('load', scrollOnLoad, { once: true });
    }
  }
}
