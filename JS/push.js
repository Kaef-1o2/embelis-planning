/* ============================================================
   EMBELIS PLANNING - PUSH
============================================================ */

/* ============================================================
   NOTIFICATIONS MOBILE
============================================================ */

function openMobileNotifications(){

    const desktopButton =
        document.getElementById(
            "notificationButton"
        );


    if(desktopButton){

        desktopButton.click();

    }

}

/* ============================================================
   ACTIVER LES NOTIFICATIONS PUSH
============================================================ */

async function enablePushNotifications(){

    try{

        /* ========================================================
           VERIFICATION SERVICE WORKER
        ======================================================== */

        if(
            !(
                "serviceWorker" in navigator
            )
        ){

            alert(
                "Les notifications ne sont pas prises en charge sur cet appareil."
            );

            return;

        }


        /* ========================================================
           VERIFICATION PUSH MANAGER
        ======================================================== */

        if(
            !(
                "PushManager" in window
            )
        ){

            alert(
                "Les notifications push ne sont pas prises en charge sur ce navigateur."
            );

            return;

        }


        /* ========================================================
           AUTORISATION NOTIFICATIONS
        ======================================================== */

        const permission =
            await Notification
                .requestPermission();


        if(
            permission !==
            "granted"
        ){

            alert(
                "Les notifications n'ont pas été autorisées."
            );

            return;

        }


        /* ========================================================
           SERVICE WORKER
        ======================================================== */

        const registration =
            await navigator
                .serviceWorker
                .ready;


        /* ========================================================
           ABONNEMENT PUSH
        ======================================================== */

        let subscription =
            await registration
                .pushManager
                .getSubscription();


        /*
           Si cet appareil n'a encore aucun abonnement Push,
           on en crée un avec notre clé VAPID publique.
        */

        if(!subscription){

            subscription =
                await registration
                    .pushManager
                    .subscribe({

                        userVisibleOnly:
                            true,

                        applicationServerKey:
                            urlBase64ToUint8Array(
                                VAPID_PUBLIC_KEY
                            )

                    });

        }


        const subscriptionJson =
            subscription.toJSON();


        /* ========================================================
           UTILISATEUR CONNECTE
        ======================================================== */

        const {
            data:{
                user
            },
            error:
                userError
        } =
            await supabaseClient
                .auth
                .getUser();


        if(
            userError ||
            !user
        ){

            console.error(
                "Erreur récupération utilisateur :",
                userError
            );

            alert(
                "Utilisateur non connecté."
            );

            return;

        }


        /* ========================================================
           INFORMATIONS DE L'ABONNEMENT
        ======================================================== */

        const endpoint =
            subscription.endpoint;


        const p256dh =
            subscriptionJson
                .keys
                ?.p256dh;


        const auth =
            subscriptionJson
                .keys
                ?.auth;


        const deviceName =
            navigator.userAgent;


        if(
            !endpoint ||
            !p256dh ||
            !auth
        ){

            console.error(
                "Abonnement Push incomplet :",
                subscriptionJson
            );

            alert(
                "Impossible de récupérer les informations Push de cet appareil."
            );

            return;

        }


        /* ========================================================
           ENREGISTREMENT / REATTRIBUTION DE L'APPAREIL

           La RPC Supabase :

           - supprime cet endpoint des anciens comptes ;
           - l'associe au compte actuellement connecté ;
           - enregistre les clés Push.

           Un même appareil ne reste donc plus associé
           simultanément à plusieurs utilisateurs.
        ======================================================== */

        const {
            error
        } =
            await supabaseClient
                .rpc(
                    "register_push_subscription",
                    {

                        p_endpoint:
                            endpoint,

                        p_p256dh:
                            p256dh,

                        p_auth:
                            auth,

                        p_device_name:
                            deviceName

                    }
                );


        if(error){

            console.error(
                "Erreur enregistrement abonnement Push :",
                error
            );

            alert(
                "Impossible d'activer les notifications."
            );

            return;

        }


        /* ========================================================
           SUCCES
        ======================================================== */

        alert(
            "Notifications activées sur cet appareil."
        );


        console.log(
            "Abonnement Push attribué à l'utilisateur :",
            user.id
        );


        console.log(
            "Abonnement Push enregistré :",
            subscription
        );

    }
    catch(error){

        console.error(
            "Erreur activation Push :",
            error
        );


        alert(
            "Erreur lors de l'activation des notifications."
        );

    }

}

/* ============================================================
   TEST NOTIFICATION PUSH
============================================================ */

async function sendPushTest(){

    try{

        const {
            data,
            error
        } =
            await supabaseClient
                .functions
                .invoke(
                    "send-push-test",
                    {
                        body:{}
                    }
                );


        if(error){

            console.error(
                "Erreur push test :",
                error
            );

            alert(
                "Erreur lors de l'envoi du push."
            );

            return;

        }


        console.log(
            "Résultat push test :",
            data
        );


        if(
            data?.sent > 0
        ){

            alert(
                "Notification push envoyée."
            );

        }
        else{

            alert(
                "Aucune notification n'a été envoyée."
            );

        }

    }
    catch(error){

        console.error(
            "Erreur sendPushTest :",
            error
        );

        alert(
            "Erreur lors du test push."
        );

    }

}