const CACHE='doctor-rush-v12';
const CORE=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./logo-gpp.png'];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.all(CORE.map(async url=>{
      try{
        const response=await fetch(url,{cache:'reload'});
        if(response.ok) await cache.put(url,response.clone());
      }catch(e){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;

  // Navigation/HTML is network-first so GitHub updates are picked up immediately.
  if(req.mode==='navigate' || url.pathname.endsWith('/index.html')){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh && fresh.ok){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',fresh.clone());
        }
        return fresh;
      }catch(e){
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Static files load fast from cache, while a fresh copy replaces them in the background.
  event.respondWith((async()=>{
    const cached=await caches.match(req,{ignoreSearch:true});
    const network=fetch(req,{cache:'no-cache'}).then(async fresh=>{
      if(fresh && fresh.ok){
        const cache=await caches.open(CACHE);
        await cache.put(url.pathname.split('/').pop() || req.url,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }).catch(()=>null);
    return cached || (await network) || Response.error();
  })());
});
