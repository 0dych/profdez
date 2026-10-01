const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'dist','client-preview');
fs.mkdirSync(dest,{recursive:true});
const copy=(name)=>fs.cpSync(path.join(root,name),path.join(dest,name),{recursive:true});
for(const name of ['index.html','services.html','products.html','instructions.html','contacts.html','css','js','img','logo.png','sert1.jpg','sert2.jpg'])copy(name);
fs.mkdirSync(path.join(dest,'data'),{recursive:true});
const data=JSON.parse(fs.readFileSync(path.join(root,'data/content.json'),'utf8'));delete data.telegramBot;
fs.writeFileSync(path.join(dest,'data/content.json'),JSON.stringify(data,null,2));
for(const name of ['index.html','services.html','products.html','instructions.html','contacts.html']){
  const file=path.join(dest,name);const html=fs.readFileSync(file,'utf8').replace('<body','<body data-demo="true"');fs.writeFileSync(file,html);
}
fs.writeFileSync(path.join(dest,'.nojekyll'),'');
fs.writeFileSync(path.join(dest,'README.md'),'# Демонстрация сайта\n\nЗагрузите содержимое этой папки в НОВЫЙ репозиторий и включите GitHub Pages для корня ветки main. Это демонстрация интерфейса: заявки не отправляются, админка и приватные данные не включены. Для рабочего сайта нужен PHP 8.2+ и настройка администратора/Telegram.\n');
const check=(dir)=>{for(const item of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(item.isDirectory())check(full);else{if(/\.(php|log)$/.test(item.name)||item.name==='orders.json')throw Error('Private file in build');if(/\.(js|json|html)$/.test(item.name)&&/\d{5,}:[A-Za-z0-9_-]{20,}/.test(fs.readFileSync(full,'utf8')))throw Error('Token in build');}}};check(dest);
console.log('Safe static preview built: '+dest);
