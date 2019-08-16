;
const CACHE_NAME = 'v1_chache_dta_tms',
urlsToCache = [
    'https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js',
    'https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
    './main.css',
    './movil.css',
    './ico_512.png',
    './ico_hdpi.png',
    './ico_mdpi.png',
    './ico_xhdpi.png',
    './ico_xxhdpi.png',
    './ico_xxxhdpi.png',
    './splash.png',
    './image.png'
]

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            return cache.addAll(urlsToCache)
            .then(() => self.skipWaiting())
        })
        .catch(err => console.log('Falló el registro de cache ', err))
    )
})

self.addEventListener('activate', e => {
    const cacheWhiteList = [CACHE_NAME]
    e.waitUntil(
        caches.keys()
        .then(cachesNames => {
            cachesNames.map(cacheName => {
                if(cacheWhiteList.indexOf(cacheName) === -1) {
                    return caches.delete(cacheName)
                }
            })
        })
        .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request)
        .then(res => {
            if(res) {
                return res
            }
            return fetch(e.request)
        })
    )
})
