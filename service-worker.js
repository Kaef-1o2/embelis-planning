/* ============================================================
   EMBELIS PLANNING - SERVICE WORKER
============================================================ */

const CACHE_NAME =
    "embelis-planning-v2";


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

/* ============================================================
   NOTIFICATIONS PUSH
============================================================ */

self.addEventListener(
    "push",
    event => {

        let data =
            {};


        try{

            data =
                event.data
                ? event.data.json()
                : {};

        }
        catch{

            data = {

                title:
                    "Embelis Planning",

                body:
                    event.data
                    ? event.data.text()
                    : "Nouvelle notification"

            };

        }


        const title =
            data.title ||
            "Embelis Planning";


        const options = {

            body:
                data.body ||
                "Vous avez une nouvelle notification.",

            icon:
                "./icons/icon-192.png",

            badge:
                "./icons/icon-192.png",

            data:{

                url:
                    data.url ||
                    "./",

                type:
                    data.type ||
                    null

            }

        };


        event.waitUntil(

            self.registration
                .showNotification(
                    title,
                    options
                )

        );

    }
);


/* ============================================================
   CLIC SUR NOTIFICATION PUSH
============================================================ */

self.addEventListener(
    "notificationclick",
    event => {

        event.notification
            .close();


        const targetUrl =
            event.notification
                .data
                ?.url ||
            "./";


        event.waitUntil(

            clients
                .matchAll({

                    type:
                        "window",

                    includeUncontrolled:
                        true

                })
                .then(
                    windowClients => {

                        for(
                            const client
                            of windowClients
                        ){

                            if(
                                "focus" in client
                            ){

                                client.navigate(
                                    targetUrl
                                );

                                return client
                                    .focus();

                            }

                        }


                        return clients
                            .openWindow(
                                targetUrl
                            );

                    }
                )

        );

    }
);

