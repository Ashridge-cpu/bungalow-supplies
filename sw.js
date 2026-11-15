// Offline-first: serve the app shell from cache instantly, refresh it in the background.
const V='bs-v1-202611151922';
const SHELL=['./','./index.html','./app.js','./sync.js','./config.js','./manifest.webmanifest','./banner.webp','./stirling.gif','./logo.webp','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('bs-')&&x!==V).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname==='www.gstatic.com'&&u.pathname.startsWith('/firebasejs/')){ // Firebase SDK: cache-first (versioned URLs)
    e.respondWith(caches.open('bs-sdk').then(c=>c.match(r).then(m=>m||fetch(r).then(n=>{if(n.ok)c.put(r,n.clone());return n}))));return}
  if(u.origin!==location.origin||!u.pathname.startsWith('/bungalow-supplies/'))return;
  e.respondWith(caches.open(V).then(c=>c.match(r,{ignoreSearch:true}).then(m=>{
    const net=fetch(r).then(n=>{if(n.ok)c.put(r,n.clone());return n}).catch(()=>m);
    return m||net})));
});
