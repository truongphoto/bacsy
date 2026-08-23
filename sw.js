const BUILD_ID = '19';
const CACHE_NAME = `doctor-rush-v${BUILD_ID}`;
const CORE = ['./','./index.html','./manifest.webmanifest','./version.json','./logo-gpp.png','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.allSettled(CORE.map(url => fetch(url,{cache:'reload'}).then(r => { if(r.ok) return cache.put(url,r.clone()); })) )));
});
self.addEventListener('message', event => { if(event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('doctor-rush-v')&&k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok)await cache.put(request,response.clone());return response;}
  catch(err){return(await cache.match(request))||(await cache.match('./index.html'))||Response.error();}
}
async function staleWhileRevalidate(request){
  const cache=await caches.open(CACHE_NAME),cached=await cache.match(request);
  const network=fetch(request).then(async response=>{if(response&&response.ok)await cache.put(request,response.clone());return response;}).catch(()=>null);
  return cached||(await network)||Response.error();
}
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/version.json')||url.pathname.endsWith('/manifest.webmanifest')){event.respondWith(networkFirst(request));return;}
  if(/\.(?:png|jpg|jpeg|webp|svg|ico)$/i.test(url.pathname)){event.respondWith(staleWhileRevalidate(request));return;}
  event.respondWith(networkFirst(request));
});
