/**
 * Адмін-панель ТОВ «ПРОФДЕЗІНФЕКЦІЯ ЗАКАРПАТТЯ»
 * Логіка керування контентом
 */


let currentData = null;
let ordersCache = [];
let dashboardStarted = false;
let contentDirty = false;

document.addEventListener("DOMContentLoaded", async () => {
  await initAuth();
});

async function startAdminDashboard() {
  if (dashboardStarted) return;
  dashboardStarted = true;
  try { await loadServiceTemplates(); await loadHomeTemplate(); await loadAdminData(); }
  catch (error) {
    dashboardStarted = false;
    document.getElementById('adminPinError').textContent = error.message;
    document.getElementById('adminPinError').style.display = 'block';
    document.getElementById('adminLockScreen').style.display = '';
    return false;
  }
  initTabs();
  initServiceSearch();
  document.getElementById('addCertificate').addEventListener('click',()=>{appendCertificateEditor({src:'',alt:'',title:'Новий сертифікат'});setSaveState('Є незбережені зміни','dirty');});
  document.getElementById('addHomeCase').addEventListener('click',()=>{const items=collectHomeCases().items;items.push({template:0,name:'Новий об’єкт',location:'',tag:'',kpis:[],taskLabel:'Завдання:',task:'',resultLabel:'Результат протоколу:',result:''});renderHomeCases({...collectHomeCases(),items});setSaveState('Є незбережені зміни','dirty');});
  initFormActions();
  initOrderManager();
  initTelegramSettings();
  initSecuritySettings();
  initUnsavedState();
  return true;
}

/**
 * Проста авторизація за PIN-кодом
 */
async function initAuth() {
  const lockScreen = document.getElementById("adminLockScreen");
  const pinInput = document.getElementById("adminPinInput");
  const loginBtn = document.getElementById("adminLoginBtn");
  const errorMsg = document.getElementById("adminPinError");

  let serverAuthAvailable = false;
  try {
    const response = await fetch("api/auth.php", { cache: "no-store" });
    if (response.ok) {
      const serverState = await response.json();
      serverAuthAvailable = true;
      if (serverState.authenticated) {
        sessionStorage.setItem("pdt_admin_logged", "true");
        if (await startAdminDashboard()) lockScreen.style.display = "none";
      }
    }
  } catch (_) {
    // Статичний режим без PHP: доступний лише локальний перегляд.
  }

  if (!serverAuthAvailable) {
    errorMsg.textContent = 'Адмінка потребує PHP-сервера та налаштованого PIN. На GitHub Pages доступний лише перегляд сайту.';
    errorMsg.style.display = 'block';
    loginBtn.disabled = true;
  }

  async function handleLogin() {
    const pin = (pinInput.value || '').trim();
    let authenticated = false;
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';
    
    if (serverAuthAvailable) {
      try {
        const response = await fetch("api/auth.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "login", pin })
        });
        const res = await response.json();
        authenticated = response.ok && res.success === true;
        if (!authenticated) errorMsg.textContent = res.message || 'Не вдалося увійти. Спробуйте пізніше.';
      } catch (_) {
        errorMsg.textContent = 'Не вдалося зв’язатися із сервером. Перевірте з’єднання та повторіть вхід.';
      }
    }
    if (authenticated) {
      sessionStorage.setItem("pdt_admin_logged", "true");
      if (await startAdminDashboard()) lockScreen.style.display = "none";
    } else {
      errorMsg.style.display = "block";
      pinInput.value = "";
      pinInput.focus();
    }
    loginBtn.disabled = !serverAuthAvailable;
  }

  if (loginBtn) loginBtn.addEventListener("click", handleLogin);
  if (pinInput) {
    pinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  }

  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("api/auth.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "logout" })
        });
      } catch (_) {}
      sessionStorage.removeItem("pdt_admin_logged");
      window.location.reload();
    });
  }
}

/**
 * Завантаження даних
 */
async function loadAdminData() {
  // 1. Серверний файл пріоритетний, щоб адмінка показувала актуальні спільні дані.
  try {
    const res = await fetch("../data/content.json", { cache: "no-store" });
    if (res.ok) {
      currentData = await res.json();
      if (!currentData.company || !Array.isArray(currentData.services) || !Array.isArray(currentData.products)) throw new Error('Invalid content');
      populateForm(currentData);
      return;
    }
  } catch (e) {
    console.info("Серверний контент недоступний.");
  }

  throw new Error('Не вдалося завантажити content.json. Перевірте сервер і повторіть вхід. Редагування заблоковано, щоб не перезаписати вміст сайту.');

}

/**
 * Заповнення полів форми
 */
function populateForm(data) {
  if (!data) return;

  const c = data.company || {};
  setVal("c_name", c.name);
  setVal("c_nameEn", c.nameEn);
  setVal("c_edrpou", c.edrpou);
  setVal("c_extract", c.extract);
  setVal("c_director", c.director);
  setVal("c_address", c.address);
  setVal("c_region", c.region);
  setVal("c_phone1", (c.phones && c.phones[0]) || "");
  setVal("c_phone2", (c.phones && c.phones[1]) || "");
  setVal("c_email", c.email);
  setVal("c_workHours", c.workHours);

  const s = c.socials || {};
  setVal("s_viber", s.viber);
  setVal("s_telegram", s.telegram);
  setVal("s_whatsapp", s.whatsapp);
  setVal("s_facebook", s.facebook);
  setVal("s_instagram", s.instagram);

  setVal('s_tiktok', s.tiktok);
  const hero = data.hero || homeTemplate.hero;
  ['title','desc','badge','tag'].forEach(key => setVal('h_'+key, hero[key]));
  document.getElementById('homeStatsContainer').innerHTML=(data.keyStats || homeTemplate.keyStats).map((stat,index)=>
    `<div><label class="admin-label">Показник ${index+1}</label><input class="admin-input home-stat-value" value="${escapeHtml(stat.value)}"><label class="admin-label">Пояснення</label><input class="admin-input home-stat-label" value="${escapeHtml(stat.label)}"></div>`).join('');

  renderCertificates(data.certificates ?? homeTemplate.certificates);
  renderHomeCases(data.homeCases ?? homeTemplate.cases);
  renderPhotoList(document.getElementById('homeSlidesContainer'),data.homeSlides ?? homeTemplate.slides,true);
  renderServicesList(data.services || []);
  renderProductsList(data.products || []);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

/**
 * Вкладки навігації
 */
function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const contents = document.querySelectorAll(".tab-content");

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));

       btn.classList.add("active");
       const target = document.getElementById(btn.dataset.tab);
       if (target) target.classList.add("active");
       const descriptions = {
         'tab-contacts':['Контакти та реквізити','Контактні дані та інформація про вашу компанію.'],
         'tab-socials':['Соцмережі та месенджери','Посилання, за якими клієнти можуть зв’язатися з вами.'],
         'tab-home':['Головна сторінка','Заголовок, опис і показники першого екрана сайту.'],
         'tab-services':['Послуги','Усі послуги в одному місці. Виберіть блок для редагування.'],
         'tab-products':['Товари','Назви, описи та вартість товарів у каталозі.'],
         'tab-orders':['Заявки','Звернення клієнтів та їх поточний статус.'],
         'tab-telegram':['Telegram','Налаштуйте сповіщення про нові звернення.'],
         'tab-security':['Безпека','Керуйте PIN-кодом доступу до панелі.']
       };
       const [title,description]=descriptions[btn.dataset.tab] || ['Керування сайтом',''];
       document.getElementById('adminPageTitle').textContent=title;
       document.getElementById('adminPageDescription').textContent=description;
       btns.forEach(item=>item.setAttribute('aria-pressed',String(item===btn)));
       document.querySelector('.admin-action-bar').hidden=['tab-orders','tab-telegram','tab-security'].includes(btn.dataset.tab);
       if (btn.dataset.tab === "tab-orders") loadOrders();
       if (btn.dataset.tab === "tab-telegram") loadTelegramSettings();
    });
  });
}

/**
 * Список послуг
 */
function renderServicesList(services) {
  const container = document.getElementById("servicesListContainer");
  if (!container) return;

  container.innerHTML = "";

  services.forEach((srv, index) => {
    const row = document.createElement("details");
    row.className = "item-edit-row service-row";
    row.innerHTML = `
      <summary class="service-row-title">${escapeHtml(srv.title || 'Нова послуга')}</summary>
      <button type="button" class="item-delete-btn" onclick="deleteService(${index})">Видалити</button>
      <div class="form-grid">
        <div>
          <label class="admin-label">ID (латиницею):</label>
          <input type="text" class="admin-input srv-id" value="${escapeHtml(srv.id || '')}" readonly>
        </div>
        <div>
          <label class="admin-label">Категорія:</label>
          <input type="text" class="admin-input srv-category" value="${escapeHtml(srv.category || '')}" placeholder="pest-control / sanitation / business / agro">
        </div>
        <div>
          <label class="admin-label">Назва послуги:</label>
          <input type="text" class="admin-input srv-title" value="${escapeHtml(srv.title || '')}">
        </div>
        <div>
          <label class="admin-label">Бейдж (наприклад: НАССР сертифіковано):</label>
          <input type="text" class="admin-input srv-badge" value="${escapeHtml(srv.badge || '')}">
        </div>
        <div class="form-group-full">
          <label class="admin-label">Короткий опис:</label>
          <textarea class="admin-textarea srv-desc" rows="2">${escapeHtml(srv.shortDesc || '')}</textarea>
        </div>
        <div class="form-group-full">
          <label class="admin-label">Опис для нової послуги (наявний блок редагуйте нижче):</label>
          <textarea class="admin-textarea srv-full-desc" rows="3">${escapeHtml(srv.fullDesc || '')}</textarea>
        </div>
        <div class="form-group-full">
          <label class="admin-label">Що входить у послугу (один пункт з нового рядка):</label>
          <textarea class="admin-textarea srv-items" rows="4">${escapeHtml((srv.items || []).join('\n'))}</textarea>
        </div>
      </div>
    `;
    if (serviceTemplates.has(srv.id)) row.querySelector('.srv-full-desc').closest('.form-group-full').hidden = true;
    else {
      const priceLabel = document.createElement('label'); priceLabel.className='admin-label'; priceLabel.textContent='Вартість нової послуги';
      const price = document.createElement('input'); price.className='admin-input srv-price'; price.value=srv.price || ''; priceLabel.append(price);row.querySelector('.form-grid').append(priceLabel);
    }
    container.appendChild(row);
    renderServiceDetailEditor(row, srv);
    const summary=row.querySelector('.service-row-title');
    const name=document.createElement('span');name.className='service-summary-name';name.textContent=srv.title || 'Нова послуга';
    const subtitle=document.createElement('span');subtitle.className='service-summary-meta';subtitle.textContent='Тексти · Вартість · Фотографії';
    const text=document.createElement('span');text.className='service-summary-copy';text.append(name,subtitle);
    summary.replaceChildren(text);
    const src=srv.detail?.images?.[0]?.src || serviceTemplates.get(srv.id)?.querySelector('img')?.getAttribute('src');
    if(PDTServiceContent.imageURL(src)){const photo=document.createElement('img');photo.className='service-summary-photo';photo.src=src.startsWith('https://')?src:'../'+src;photo.alt='';photo.loading='lazy';summary.prepend(photo);}
  });
  applyServiceSearch();
}

function initServiceSearch() {
  document.getElementById('serviceSearch')?.addEventListener('input',applyServiceSearch);
  applyServiceSearch();
}

function applyServiceSearch() {
  const query=(document.getElementById('serviceSearch')?.value || '').trim().toLocaleLowerCase('uk');
  const rows=[...document.querySelectorAll('#servicesListContainer .service-row')];
  for(const row of rows)row.hidden=!row.querySelector('.service-summary-name')?.textContent.toLocaleLowerCase('uk').includes(query);
  const count=document.getElementById('serviceSearchCount');
  if(count)count.textContent=query?`Знайдено: ${rows.filter(row=>!row.hidden).length}`:`Усього послуг: ${rows.length}`;
}

window.deleteService = function(index) {
  if (confirm("Видалити цю послугу?")) {
    collectDataFromForm();
    currentData.services.splice(index, 1);
    renderServicesList(currentData.services);
    setSaveState('Є незбережені зміни','dirty');
  }
};

window.addNewService = function() {
  collectDataFromForm();
  if (!currentData.services) currentData.services = [];
  currentData.services.push({
    id: "new-service-" + Date.now(),
    category: "pest-control",
    title: "Нова послуга",
    badge: "Гарантія",
    shortDesc: "Опис послуги...",
    items: []
  });
  renderServicesList(currentData.services);
  setSaveState('Є незбережені зміни','dirty');
};

/**
 * Список товарів
 */
function renderProductsList(products) {
  const container = document.getElementById("productsListContainer");
  if (!container) return;

  container.innerHTML = "";

  products.forEach((prod, index) => {
    const row = document.createElement("div");
    row.className = "item-edit-row";
    row.innerHTML = `
      <button type="button" class="item-delete-btn" onclick="deleteProduct(${index})">Видалити</button>
      <div class="form-grid">
        <div>
          <label class="admin-label">ID (латиницею):</label>
          <input type="text" class="admin-input prod-id" readonly value="${escapeHtml(prod.id || '')}">
        </div>
        <div>
          <label class="admin-label">Назва товару:</label>
          <input type="text" class="admin-input prod-title" value="${escapeHtml(prod.title || '')}">
        </div>
        <div>
          <label class="admin-label">Ціна / Статус:</label>
          <input type="text" class="admin-input prod-price" value="${escapeHtml(prod.price || 'За запитом')}">
        </div>
        <div>
          <label class="admin-label">Бейдж:</label>
          <input type="text" class="admin-input prod-badge" value="${escapeHtml(prod.badge || '')}">
        </div>
        <div>
          <label class="admin-label">Наявність:</label>
          <input type="text" class="admin-input prod-status" value="${escapeHtml(prod.status || '')}">
        </div>
        <div class="form-group-full">
          <label class="admin-label">Опис товару:</label>
          <textarea class="admin-textarea prod-desc" rows="2">${escapeHtml(prod.shortDesc || '')}</textarea>
        </div>
        <div class="form-group-full">
          <label class="admin-label">Характеристики (один пункт з нового рядка):</label>
          <textarea class="admin-textarea prod-features" rows="4">${escapeHtml((prod.features || []).join('\n'))}</textarea>
        </div>
      </div>
    `;
    const photos=document.createElement('div');photos.className='product-photo-editor';
    const heading=document.createElement('h4');heading.textContent='Фотографії товару';row.append(heading,photos);
    renderPhotoList(photos,prod.photos ?? productPhotos.get(prod.id) ?? []);
    container.appendChild(row);
  });
}

window.deleteProduct = function(index) {
  collectDataFromForm();
  if (confirm("Видалити цей товар?")) {
    currentData.products.splice(index, 1);
    renderProductsList(currentData.products);
    setSaveState('Є незбережені зміни', 'dirty');
  }
};

window.addNewProduct = function() {
  collectDataFromForm();
  if (!currentData.products) currentData.products = [];
  currentData.products.push({
    id: "new-product-" + Date.now(),
    title: "Новий товар",
    price: "За запитом",
    badge: "В наявності",
    status: "В наявності",
    shortDesc: "Опис товару...",
    features: [],
    photos: []
  });
  renderProductsList(currentData.products);
  setSaveState('Є незбережені зміни', 'dirty');
};

let homeTemplate;
async function loadHomeTemplate() {
 const response=await fetch('../index.html',{cache:'no-store'});
 if(!response.ok) throw new Error('Не вдалося завантажити головну сторінку.');
 const doc=new DOMParser().parseFromString(await response.text(),'text/html');
 const section=doc.querySelector('#cases');
 const text=selector=>section.querySelector(selector)?.textContent.trim() || '';
 const cases={tag:text('.section-tag'),title:text('.section-title'),subtitle:text('.section-subtitle'),items:[...section.querySelectorAll('.case-card')].map((card,index)=>{const task=card.querySelector('.case-task').cloneNode(true);const taskLabel=task.querySelector('strong').textContent.trim();task.querySelector('strong').remove();return {template:index,name:card.querySelector('.case-company-name').textContent.trim(),location:card.querySelector('.case-location').textContent.trim(),tag:card.querySelector('.case-tag').textContent.trim(),kpis:[...card.querySelectorAll('.case-kpi')].map(el=>el.textContent.trim()),taskLabel,task:task.textContent.trim(),resultLabel:card.querySelector('.case-result-label').textContent.trim(),result:card.querySelector('.case-result-text').textContent.trim()};})};
 const showcase=doc.querySelector('.documents-showcase');
 const certificates={title:showcase.querySelector('#documentsTitle').textContent.trim(),description:showcase.querySelector('.documents-heading p').textContent.trim(),items:[...showcase.querySelectorAll('.document-card')].map(card=>({src:card.querySelector('img').getAttribute('src'),alt:card.querySelector('img').alt,title:card.querySelector('.document-info h3').textContent.trim(),label:card.querySelector('.document-label').textContent.trim(),specialty:card.querySelector('.document-specialty').textContent.trim(),issuer:card.querySelector('.document-issuer').textContent.trim(),reference:card.querySelector('.document-reference').textContent.trim()}))};
 homeTemplate={certificates,cases,slides:[...doc.querySelectorAll('#worksSlider .works-slide')].map(slide=>({src:slide.querySelector('img').getAttribute('src'),alt:slide.querySelector('img').alt,tag:slide.querySelector('.works-slide-tag').textContent.trim(),caption:slide.querySelector('.works-slide-text').textContent.trim()})),hero:{title:doc.querySelector('.hero-title').innerHTML.trim(),desc:doc.querySelector('.hero-desc').textContent.trim(),badge:doc.querySelector('[data-bind="hero-badge-text"]').textContent.trim(),tag:doc.querySelector('[data-bind="hero-badge-tag"]').textContent.trim()},keyStats:[...doc.querySelectorAll('.hero-stats > div')].map(el=>({value:el.querySelector('.stat-val').textContent.trim(),label:el.querySelector('.stat-label').textContent.trim()}))};
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  }[char]));
}

/**
 * Збір даних з полів та збереження
 */
function collectDataFromForm() {
  const d = currentData || {};

  d.company = d.company || {};
  d.company.name = getVal("c_name");
  d.company.nameEn = getVal("c_nameEn");
  d.company.edrpou = getVal("c_edrpou");
  d.company.extract = getVal("c_extract");
  d.company.director = getVal("c_director");
  d.company.address = getVal("c_address");
  d.company.region = getVal("c_region");
  d.company.phones = [getVal("c_phone1"), getVal("c_phone2")].filter(Boolean);
  d.company.email = getVal("c_email");
  d.company.workHours = getVal("c_workHours");

  d.company.socials = {
    ...d.company.socials,
    viber: getVal("s_viber"),
    telegram: getVal("s_telegram"),
    whatsapp: getVal("s_whatsapp"),
    facebook: getVal("s_facebook"),
    instagram: getVal("s_instagram"),
    tiktok: getVal("s_tiktok")
  };

  d.hero={...d.hero,title:getVal('h_title'),desc:getVal('h_desc'),badge:getVal('h_badge'),tag:getVal('h_tag')};
  d.certificates=collectCertificates();
  d.homeCases=collectHomeCases();
  d.homeSlides=readPhotoList(document.getElementById('homeSlidesContainer'));
  d.keyStats=[...document.querySelectorAll('.home-stat-value')].map((el,index)=>({value:el.value.trim(),label:document.querySelectorAll('.home-stat-label')[index].value.trim()}));

  // Оновлення послуг з DOM
  const srvRows = document.querySelectorAll("#servicesListContainer .item-edit-row");
  srvRows.forEach((row, i) => {
    if (d.services[i]) {
      d.services[i].id = row.querySelector(".srv-id").value.trim();
      d.services[i].category = row.querySelector(".srv-category").value.trim();
      d.services[i].title = row.querySelector(".srv-title").value;
      d.services[i].badge = row.querySelector(".srv-badge").value;
      d.services[i].shortDesc = row.querySelector(".srv-desc").value;
      d.services[i].fullDesc = row.querySelector(".srv-full-desc").value;
      d.services[i].items = row.querySelector(".srv-items").value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
      const detail = collectServiceDetail(row);
      if (detail) d.services[i].detail = detail;
      if (row.querySelector('.srv-price')) d.services[i].price = row.querySelector('.srv-price').value;
    }
  });

  // Оновлення товарів з DOM
  const prodRows = document.querySelectorAll("#productsListContainer .item-edit-row");
  prodRows.forEach((row, i) => {
    if (d.products[i]) {
      d.products[i].id = row.querySelector(".prod-id").value.trim();
      d.products[i].title = row.querySelector(".prod-title").value;
      d.products[i].price = row.querySelector(".prod-price").value;
      d.products[i].badge = row.querySelector(".prod-badge").value;
      d.products[i].status = row.querySelector(".prod-status").value;
      d.products[i].shortDesc = row.querySelector(".prod-desc").value;
      d.products[i].photos = readPhotoList(row.querySelector('.product-photo-editor'));
      d.products[i].features = row.querySelector(".prod-features").value.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    }
  });

  return d;
}

/** Заявки */
function initOrderManager() {
  document.getElementById("ordersRefreshBtn")?.addEventListener("click", loadOrders);
  loadOrders();
}

async function loadOrders() {
  const container = document.getElementById("ordersContainer");
  const summary = document.getElementById("ordersSummary");
  if (!container) return;
  try {
    const response = await fetch("api/orders.php", { cache: "no-store" });
    if (!response.ok) throw new Error("API недоступне");
    ordersCache = await response.json();
  } catch (error) {
    ordersCache = [];
    container.textContent = 'Не вдалося завантажити заявки. Перевірте з’єднання та авторизацію й натисніть «Оновити».';
    if (summary) summary.textContent = 'Дані заявок недоступні.';
    const count = document.getElementById('ordersNewCount');
    if (count) count.hidden = true;
    return;
  }

  renderOrders(ordersCache);
  const newCount = ordersCache.filter(order => order.status === "new").length;
  if (summary) {
    summary.textContent = `Усього заявок: ${ordersCache.length}. Нових: ${newCount}. Натисніть на телефон для швидкого виклику або переходу в чат.`;
  }
  const count = document.getElementById("ordersNewCount");
  if (count) {
    count.textContent = newCount;
    count.hidden = newCount === 0;
  }
}

function renderOrders(orders) {
  const container = document.getElementById("ordersContainer");
  if (!container) return;
  if (!orders.length) {
    container.innerHTML = '<div class="empty-orders">Нових заявок поки немає. Коли клієнт заповнить форму, вона з’явиться тут і, за налаштуванням, у Telegram.</div>';
    return;
  }
  const statusOptions = [
    ["new", "Нова"], ["in_progress", "В роботі"], ["done", "Виконано"], ["cancelled", "Неактуальна"]
  ];
  container.innerHTML = `<table class="orders-table"><thead><tr><th>Клієнт</th><th>Послуга / об'єкт</th><th>Адреса</th><th>Дата</th><th>Статус та дії</th></tr></thead><tbody>${orders.map(order => `
    <tr class="${order.status === 'new' ? 'is-new' : ''}">
      <td>
        <div class="order-client">${escapeHtml(order.name)}</div>
        <a href="tel:${escapeHtml(String(order.phone).replace(/[^+\d]/g, ''))}">${escapeHtml(order.phone)}</a>
        ${order.email ? `<div class="order-meta"><a href="mailto:${escapeHtml(order.email)}">${escapeHtml(order.email)}</a></div>` : ''}
      </td>
      <td>
        ${escapeHtml(order.service)}
        <div class="order-meta">${escapeHtml(order.objectType || 'Тип об’єкта не вказано')}</div>
        ${order.notes ? `<div class="order-meta" style="margin-top:0.25rem;color:#334155;">💬 ${escapeHtml(order.notes)}</div>` : ''}
      </td>
      <td>${escapeHtml(order.address || '—')}</td>
      <td>${escapeHtml(order.createdAt || '—')}</td>
      <td>
        <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
          <select class="order-status" data-order-status="${escapeHtml(order.id)}">${statusOptions.map(([value, label]) => `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
          <button type="button" class="item-delete-btn" data-order-delete="${escapeHtml(order.id)}" style="position:static;padding:0.35rem 0.6rem;font-size:0.78rem;" title="Видалити заявку">✕</button>
        </div>
      </td>
    </tr>`).join('')}</tbody></table>`;
  container.querySelectorAll("[data-order-status]").forEach(select => select.addEventListener("change", async () => {
    const previous = ordersCache.find(order => order.id === select.dataset.orderStatus)?.status || "new";
    select.disabled = true;
    try {
      const response = await fetch("api/orders.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id: select.dataset.orderStatus, status: select.value })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error();
      await loadOrders();
    } catch {
      select.value = previous;
      alert('Не вдалося зберегти статус. Перевірте з’єднання та авторизацію.');
    } finally { select.disabled = false; }
  }));
  container.querySelectorAll("[data-order-delete]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Видалити цю заявку безповоротно?")) return;
    btn.disabled = true;
    try {
      const response = await fetch("api/orders.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: btn.dataset.orderDelete })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error();
      await loadOrders();
    } catch {
      btn.disabled = false;
      alert('Не вдалося видалити заявку. Перевірте з’єднання та авторизацію.');
    }
  }));
}

/** Telegram: токен не зберігається у content.json */
function initTelegramSettings() {
  document.getElementById("telegramSaveBtn")?.addEventListener("click", saveTelegramSettings);
  loadTelegramSettings();
}

function initSecuritySettings() {
  document.getElementById("changePinBtn")?.addEventListener("click", async () => {
    const newPin = getVal("newAdminPin");
    const confirmation = getVal("confirmAdminPin");
    const status = document.getElementById("pinStatus");
    if (newPin !== confirmation) {
      if (status) status.textContent = "PIN-коди не збігаються.";
      return;
    }
    if (!/^\d{6,32}$/.test(newPin)) {
      if (status) status.textContent = "PIN має містити від 6 до 32 цифр.";
      return;
    }
    try {
      const response = await fetch("api/auth.php", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_pin", newPin })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      document.getElementById("newAdminPin").value = "";
      document.getElementById("confirmAdminPin").value = "";
      if (status) status.textContent = "✓ PIN оновлено.";
    } catch (error) {
      if (status) status.textContent = `Не вдалося оновити PIN: ${error.message || 'перевірте PHP-хостинг'}`;
    }
  });
}

async function loadTelegramSettings() {
  const status = document.getElementById("telegramStatus");
  try {
    const response = await fetch("api/telegram.php", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const data = await response.json();
    setVal("tg_chatId", data.chatId || "");
    if (status) status.textContent = data.configured ? "✓ Telegram налаштовано. Для заміни введіть новий токен." : "Telegram ще не налаштовано.";
  } catch {
    if (status) status.textContent = "Налаштування збережуться після запуску PHP на хостингу.";
  }
}

async function saveTelegramSettings() {
  const token = getVal("tg_botToken");
  const chatId = getVal("tg_chatId");
  const status = document.getElementById("telegramStatus");
  if (!token || !chatId) {
    if (status) status.textContent = "Вкажіть і токен, і Chat ID.";
    return;
  }
  try {
    const response = await fetch("api/telegram.php", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, chatId })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message);
    document.getElementById("tg_botToken").value = "";
    if (status) status.textContent = "✓ Telegram налаштовано. Наступні заявки надходитимуть у чат.";
  } catch (error) {
    if (status) status.textContent = `Не вдалося зберегти: ${error.message || 'перевірте PHP-хостинг'}`;
  }
}

/**
 * Обробка збереження та експорту
 */
function initFormActions() {
  const saveBtn = document.getElementById("adminSaveBtn");
  const downloadBtn = document.getElementById("adminDownloadBtn");
  const resetBtn = document.getElementById("adminResetBtn");

  // Збереження (в браузерне сховище + спроба записати на PHP-сервер)
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      setSaveState("Зберігаємо…", "saving");
      saveBtn.disabled = true;
      const dataToSave = collectDataFromForm();
      const jsonString = JSON.stringify(dataToSave, null, 2);

      let draftSaved = false;
      try {
        localStorage.setItem("pdt_site_content", jsonString);
        draftSaved = true;
      } catch (_) {}

      // 2. Спроба зберегти на сервер через api/save.php (якщо хостинг підтримує PHP)
      let serverSaved = false;
      let serverError = 'Перевірте з’єднання та авторизацію.';
      try {
        const res = await fetch("api/save.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonString
        });
        const resData = await res.json();
        serverSaved = res.ok && resData.success === true;
        if (!serverSaved) serverError = resData.message || (res.status === 401 ? 'Сесія завершилася. Увійдіть повторно.' : 'Сервер відхилив зміни. Перевірте введені дані та права запису.');
      } catch (e) {
        // Сервер PHP не запущений (працюємо в локальному або статичному режимі)
      }

      if (serverSaved) {
        currentData = dataToSave;
        try { localStorage.removeItem('pdt_site_content'); } catch (_) {}
        setSaveState("Збережено на сервері", "saved");
        alert("✅ Зміни збережено на сервері та опубліковано на сайті.");
      } else {
        setSaveState(draftSaved ? "Чернетка в браузері. Не опубліковано" : "Не збережено", "dirty");
        alert(`Зміни НЕ опубліковані. ${serverError} ${draftSaved ? 'Чернетка збережена в цьому браузері.' : 'Збережіть копію кнопкою «Завантажити JSON».'}`);
      }
      saveBtn.disabled = false;
    });
  }

  // Експорт оновленого content.json
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const dataToSave = collectDataFromForm();
      const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "content.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Скидання змін
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Скинути всі внесені зміни та очистити кеш браузера?")) {
        localStorage.removeItem("pdt_site_content");
        window.location.reload();
      }
    });
  }
}

function initUnsavedState() {
  const isContentField = target => target.id !== 'serviceSearch' && target.closest('.tab-content') && !target.closest('#tab-orders, #tab-telegram, #tab-security');
  document.addEventListener("input", event => {
    if (isContentField(event.target)) setSaveState("Є незбережені зміни", "dirty");
  });
  document.addEventListener("change", event => {
    if (isContentField(event.target)) setSaveState("Є незбережені зміни", "dirty");
  });
  window.addEventListener('beforeunload', event => {
    if (!contentDirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function setSaveState(text, state) {
  if (state === 'dirty') contentDirty = true;
  if (state === 'saved') contentDirty = false;
  const status = document.getElementById("adminSaveState");
  if (!status) return;
  status.textContent = text;
  status.dataset.state = state;
}

function renderHomeCases(cases) {
 setVal('casesTag',cases.tag);setVal('casesTitle',cases.title);setVal('casesSubtitle',cases.subtitle);
 const container=document.getElementById('homeCasesContainer');container.replaceChildren();
 cases.items.forEach(item=>{
 const row=document.createElement('details');row.className='item-edit-row case-editor-row';row.dataset.template=item.template ?? 0;
 const summary=document.createElement('summary');summary.className='service-row-title';summary.textContent=item.name || 'Кейс';row.append(summary);
 const grid=document.createElement('div');grid.className='form-grid';
 for(const [key,label,long] of [['name','Назва об’єкта'],['location','Місто / адреса'],['tag','Послуга / категорія'],['kpis','Показники — кожен з нового рядка',true],['taskLabel','Назва поля завдання'],['task','Завдання',true],['resultLabel','Назва поля результату'],['result','Результат',true]]){
 const wrap=document.createElement('label');wrap.className='admin-label'+(long?' form-group-full':'');wrap.textContent=label;const input=document.createElement(long?'textarea':'input');input.className=long?'admin-textarea':'admin-input';input.dataset.caseField=key;input.value=key==='kpis'?(item.kpis || []).join('\n'):item[key] || '';if(long)input.rows=3;if(key==='name')input.addEventListener('input',()=>summary.textContent=input.value || 'Кейс');wrap.append(input);grid.append(wrap);}
 const actions=document.createElement('div');actions.className='case-editor-actions';
 for(const [direction,label] of [[-1,'↑ Вище'],[1,'↓ Нижче'],[0,'Прибрати кейс']]){const button=document.createElement('button');button.type='button';button.className='download-btn';button.textContent=label;button.addEventListener('click',()=>{if(!direction)row.remove();else{const sibling=direction<0?row.previousElementSibling:row.nextElementSibling;if(!sibling)return;if(direction<0)container.insertBefore(row,sibling);else container.insertBefore(sibling,row);}setSaveState('Є незбережені зміни','dirty');});actions.append(button);}
 row.append(grid,actions);container.append(row);
 });
}
function collectHomeCases(){return {tag:getVal('casesTag'),title:getVal('casesTitle'),subtitle:getVal('casesSubtitle'),items:[...document.querySelectorAll('#homeCasesContainer .case-editor-row')].map(row=>{const item={template:Number(row.dataset.template)};row.querySelectorAll('[data-case-field]').forEach(input=>item[input.dataset.caseField]=input.dataset.caseField==='kpis'?input.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean):input.value.trim());return item;})};}

function renderCertificates(data){setVal('certificatesTitle',data.title);setVal('certificatesDescription',data.description);document.getElementById('certificatesContainer').replaceChildren();data.items.forEach(appendCertificateEditor);}
function appendCertificateEditor(item){
 const box=makeServiceImageEditor(item,true);box.classList.add('certificate-editor');
 const remove=box.querySelector('button');remove.textContent='Прибрати сертифікат';
 for(const [key,label] of [['title','Назва документа'],['label','Стандарт / позначка'],['specialty','Спеціалізація'],['issuer','Організація, що видала документ'],['reference','Номер / строк дії']]){const wrap=document.createElement('label');wrap.className='admin-label';wrap.textContent=label;const input=document.createElement('input');input.className='admin-input';input.dataset.certField=key;input.value=item[key] || '';wrap.append(input);box.insertBefore(wrap,remove);}
 const actions=document.createElement('div');for(const [direction,label] of [[-1,'↑ Вище'],[1,'↓ Нижче']]){const button=document.createElement('button');button.type='button';button.className='download-btn';button.textContent=label;button.addEventListener('click',()=>{const parent=box.parentElement,sibling=direction<0?box.previousElementSibling:box.nextElementSibling;if(!sibling)return;if(direction<0)parent.insertBefore(box,sibling);else parent.insertBefore(sibling,box);setSaveState('Є незбережені зміни','dirty');});actions.append(button);}box.append(actions);document.getElementById('certificatesContainer').append(box);
}
function collectCertificates(){return {title:getVal('certificatesTitle'),description:getVal('certificatesDescription'),items:[...document.querySelectorAll('#certificatesContainer .certificate-editor')].map(box=>{const item={src:box.querySelector('.service-image-src').value.trim(),alt:box.querySelector('.service-image-alt').value.trim()};box.querySelectorAll('[data-cert-field]').forEach(input=>item[input.dataset.certField]=input.value.trim());return item;}).filter(item=>item.src)};}
