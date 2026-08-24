/* ============================================================
   EMBELIS PLANNING - SERVICE WORKER
============================================================ */

const CACHE_NAME =
    "embelis-planning-v1.1";


const APP_FILES = [

    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icons/icon-192.png",
    "./icons/icon-512.png"

];


/* ============================================================
   INSTALLATION
============================================================ */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    cache =>
                        cache.addAll(
                            APP_FILES
                        )
                )

        );


        self.skipWaiting();

    }
);


/* ============================================================
   ACTIVATION
============================================================ */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(
                    cacheNames =>
                        Promise.all(

                            cacheNames
                                .filter(
                                    name =>
                                        name !==
                                        CACHE_NAME
                                )
                                .map(
                                    name =>
                                        caches.delete(
                                            name
                                        )
                                )

                        )
                )

        );


        self.clients.claim();

    }
);


/* ============================================================
   REQUETES
============================================================ */

self.addEventListener(
    "fetch",
    event => {

        /*
           On ne gère ici que les requêtes GET.
           Supabase continue de fonctionner normalement.
        */

        if(
            event.request.method !==
            "GET"
        ){

            return;

        }


        event.respondWith(

            fetch(
                event.request
            )
            .catch(
                () =>
                    caches.match(
                        event.request
                    )
            )

        );

    }
);
