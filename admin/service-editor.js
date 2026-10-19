let serviceTemplates = new Map();
let serviceUploads = 0;
let productPhotos = new Map();

async function loadServiceTemplates() {
  const response = await fetch('../services.html', {cache:'no-store'});
  if (!response.ok) throw new Error('Не вдалося завантажити поточні блоки послуг.');
  const page = new DOMParser().parseFromString(await response.text(),'text/html');
  const productsResponse=await fetch('../products.html',{cache:'no-store'});
  if(!productsResponse.ok) throw new Error('Не вдалося завантажити товари.');
  const productsPage=new DOMParser().parseFromString(await productsResponse.text(),'text/html');
  productPhotos=new Map([...productsPage.querySelectorAll('[data-catalog-product]')].map(card=>[card.dataset.catalogProduct,[...card.querySelectorAll('.product-img')].map(img=>({src:img.getAttribute('src'),alt:img.alt}))]));
  serviceTemplates = new Map([...page.querySelectorAll('.service-detail-block[id]')].map(block=>[block.id,block]));
}

function renderServiceDetailEditor(row, service) {
  const template = serviceTemplates.get(service.id);
  const base = template ? PDTServiceContent.read(template) : {texts:[],images:[]};
  const saved = service.detail || {};
  const wrapper = document.createElement('details'); wrapper.className = 'service-editor-details';
  const summary = document.createElement('summary'); summary.textContent = 'Увесь блок послуги: тексти, вартість і фотографії'; wrapper.append(summary);
  const fields = document.createElement('div'); fields.className = 'service-editor-fields';
  for (const field of base.texts) {
    const value = saved.texts?.find(item=>item.path.join('.')===field.path.join('.'))?.value ?? field.value;
    const label = document.createElement('label'); label.className = 'admin-label'; label.textContent = field.label;
    if(value.length>160)label.classList.add('service-field-long');
    const input = document.createElement('textarea'); input.className = 'admin-textarea service-detail-text'; input.rows = value.length > 160 ? 4 : 2; input.value = value; input.dataset.path = JSON.stringify(field.path);
    label.append(input); fields.append(label);
  }
  const imageTitle = document.createElement('h4'); imageTitle.textContent = 'Фотографії блоку'; fields.append(imageTitle);
  for (const field of base.images) {
    const image = saved.images?.find(item=>item.path.join('.')===field.path.join('.')) || field;
    fields.append(makeServiceImageEditor(image,false));
  }
  const gallery = document.createElement('div'); gallery.className = 'service-gallery-editor';
  for (const image of saved.gallery || []) gallery.append(makeServiceImageEditor(image,true));
  fields.append(gallery);
  const add = document.createElement('button'); add.type='button'; add.className='add-item-btn'; add.textContent='+ Додати фотографію до послуги';
  add.addEventListener('click',()=>{gallery.append(makeServiceImageEditor({src:'',alt:''},true));setSaveState('Є незбережені зміни','dirty');}); fields.append(add);
  wrapper.append(fields); row.append(wrapper);
}

function makeServiceImageEditor(image, removable) {
  const box = document.createElement('div'); box.className = 'service-image-editor';
  if (image.path) box.dataset.path=JSON.stringify(image.path);
  if(image.removed)box.dataset.removed='true';
  const preview = document.createElement('img'); preview.alt = 'Попередній перегляд'; preview.hidden = !image.src || image.removed === true;
  if (PDTServiceContent.imageURL(image.src)) preview.src=image.src.startsWith('https://')?image.src:'../'+image.src;
  const srcLabel = document.createElement('label'); srcLabel.className='admin-label'; srcLabel.textContent='Файл або HTTPS-посилання';
  const src = document.createElement('input'); src.className='admin-input service-image-src'; src.value=image.src; srcLabel.append(src);
  const altLabel=document.createElement('label'); altLabel.className='admin-label'; altLabel.textContent='Опис фотографії';
  const alt=document.createElement('input'); alt.className='admin-input service-image-alt'; alt.value=image.alt || ''; altLabel.append(alt);
  const upload=document.createElement('input'); upload.type='file'; upload.accept='image/jpeg,image/png,image/webp,image/gif'; upload.setAttribute('aria-label','Завантажити фотографію');
  const status=document.createElement('p'); status.className='admin-help'; status.setAttribute('role','status');
  const updatePreview=()=>{const valid=PDTServiceContent.imageURL(src.value);preview.hidden=!valid;if(valid)preview.src=src.value.startsWith('https://')?src.value:'../'+src.value;};
  src.addEventListener('input',updatePreview);
  upload.addEventListener('change',async()=>{
    const file=upload.files[0]; if(!file)return;
    upload.disabled=true; serviceUploads++; document.getElementById('adminSaveBtn').disabled=true; status.textContent='Завантажуємо фотографію…';
    try {
      const form=new FormData();form.append('image',file);
      const response=await fetch('api/upload.php',{method:'POST',body:form});const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message || 'Завантаження не вдалося');
      src.value=result.path;delete box.dataset.removed;box.querySelector('.restore-photo-btn')?.removeAttribute('hidden');updatePreview();status.textContent='Фото завантажено. Натисніть «Зберегти зміни», щоб показати його на сайті.';setSaveState('Є незбережені зміни','dirty');
    }catch(error){status.textContent=error.message;}finally{upload.disabled=false;serviceUploads--;document.getElementById('adminSaveBtn').disabled=serviceUploads>0;upload.value='';}
  });
  box.append(preview,srcLabel,altLabel,upload,status);
  if(!removable){const remove=document.createElement('button');remove.type='button';remove.className='download-btn';remove.classList.add('restore-photo-btn');remove.hidden=image.removed === true;remove.textContent='Прибрати фото';remove.addEventListener('click',()=>{box.dataset.removed='true';preview.hidden=true;remove.hidden=true;status.textContent='Фото прибрано. Для відновлення завантажте або вкажіть інше фото.';setSaveState('Є незбережені зміни','dirty');});box.append(remove);src.addEventListener('input',()=>{delete box.dataset.removed;remove.hidden=false;});}
  if(removable){const remove=document.createElement('button');remove.type='button';remove.className='download-btn';remove.textContent='Прибрати фото з галереї';remove.addEventListener('click',()=>{box.remove();setSaveState('Є незбережені зміни','dirty');});box.append(remove);}
  return box;
}

function collectServiceDetail(row) {
  if (!row.querySelector('.service-editor-details')) return undefined;
  const image=box=>({src:box.querySelector('.service-image-src').value.trim(),alt:box.querySelector('.service-image-alt').value.trim(),...(box.dataset.removed?{removed:true}:{}),...(box.dataset.path?{path:JSON.parse(box.dataset.path)}:{})});
  return {
    texts:[...row.querySelectorAll('.service-detail-text')].map(input=>({path:JSON.parse(input.dataset.path),value:input.value})),
    images:[...row.querySelectorAll('.service-image-editor[data-path]')].map(image),
    gallery:[...row.querySelectorAll('.service-gallery-editor .service-image-editor')].map(image).filter(item=>item.src)
  };
}

function readPhotoList(container) {
 return [...container.children].filter(box=>box.classList.contains('service-image-editor')).map(box=>({src:box.querySelector('.service-image-src').value.trim(),alt:box.querySelector('.service-image-alt').value.trim(),...(box.querySelector('.slide-tag-input')?{tag:box.querySelector('.slide-tag-input').value.trim(),caption:box.querySelector('.slide-caption-input').value.trim()}: {})})).filter(photo=>photo.src);
}
function renderPhotoList(container, photos, slides=false) {
 container.replaceChildren();
 const append=photo=>{
  const box=makeServiceImageEditor(photo,true);
  if(slides){for(const [key,label] of [['tag','Назва / категорія'],['caption','Підпис слайда']]){const wrap=document.createElement('label');wrap.className='admin-label';wrap.textContent=label;const input=document.createElement(key==='caption'?'textarea':'input');input.className='admin-input slide-'+key+'-input';input.value=photo[key] || '';wrap.append(input);box.append(wrap);}const actions=document.createElement('div');for(const [direction,label] of [[-1,'↑ Вище'],[1,'↓ Нижче']]){const button=document.createElement('button');button.type='button';button.className='download-btn';button.textContent=label;button.addEventListener('click',()=>{const sibling=direction<0?box.previousElementSibling:box.nextElementSibling;if(sibling?.classList.contains('service-image-editor')){if(direction<0)container.insertBefore(box,sibling);else container.insertBefore(sibling,box);setSaveState('Є незбережені зміни','dirty');}});actions.append(button);}box.append(actions);}
  container.append(box);
 };
 photos.forEach(append);
 const add=document.createElement('button');add.type='button';add.className='add-item-btn';add.textContent=slides?'+ Додати слайд':'+ Додати фото';add.addEventListener('click',()=>{add.remove();append({src:'',alt:''});container.append(add);setSaveState('Є незбережені зміни','dirty');});container.append(add);
}
