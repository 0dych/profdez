/* Shared plain-text service editor model. Layout stays in the original HTML. */
window.PDTServiceContent = {
  path(root, node) {
    const path = [];
    while (node && node !== root) {
      path.unshift(Array.prototype.indexOf.call(node.parentNode.childNodes, node));
      node = node.parentNode;
    }
    return path;
  },
  node(root, path) {
    return path.reduce((node, index) => node?.childNodes[index], root);
  },
  read(root) {
    const texts = [];
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim() || node.parentElement.closest('svg, script, style')) continue;
      const parent = node.parentElement;
      const heading = parent.closest('.service-spec-item, .coop-step')?.querySelector('h5, h3');
      const label = heading?.textContent.trim() || (parent.closest('h2,h3,h5') ? 'Заголовок' : parent.closest('.service-badge') ? 'Позначка / бейдж' : ({LI:'Пункт переліку',BUTTON:'Текст кнопки',SUMMARY:'Заголовок подробиць'}[parent.tagName])) || (parent.closest('.service-price-pill') ? 'Вартість та умови' : parent.closest('.service-detail-desc') ? 'Повний опис' : 'Текст блоку');
      texts.push({path:this.path(root,node),value:node.textContent.trim(),label});
    }
    return {texts,images:[...root.querySelectorAll('img')].map(img=>({path:this.path(root,img),src:img.getAttribute('src') || '',alt:img.alt})),gallery:[]};
  },
  imageURL(value) {
    return typeof value === 'string' && /^(?:sert[0-9]+\.jpg(?:\?[a-zA-Z0-9_=&.-]+)?|img\/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp|gif)(?:\?[a-zA-Z0-9_=&.-]+)?|https:\/\/[^\s"<>]+)$/i.test(value) && !value.includes('..');
  },
  apply(root, detail) {
    if (!detail) return;
    for (const field of detail.texts || []) {
      const node = this.node(root, field.path);
      if (node?.nodeType !== Node.TEXT_NODE || node.parentElement.closest('svg,script,style')) continue;
      const prefix = node.textContent.match(/^\s*/)[0], suffix = node.textContent.match(/\s*$/)[0];
      node.textContent = prefix + field.value + suffix;
    }
    for (const field of detail.images || []) {
      const img = this.node(root, field.path);
      if (img?.tagName !== 'IMG') continue;
      img.hidden=field.removed === true;
      if (!this.imageURL(field.src)) continue;
      img.src = field.src; img.alt = field.alt || '';
    }
    root.querySelector('.service-extra-gallery')?.remove();
    if (detail.gallery?.length) {
      const gallery = document.createElement('div'); gallery.className = 'service-extra-gallery';
      for (const field of detail.gallery) {
        if (!this.imageURL(field.src)) continue;
        const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
        img.src = field.src; img.alt = field.alt || ''; img.loading = 'lazy';
        caption.textContent = field.alt || ''; figure.append(img,caption); gallery.append(figure);
      }
      root.querySelector('.service-detail-footer')?.before(gallery);
    }
  }
};
