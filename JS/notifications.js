/* ============================================================
   EMBELIS PLANNING
   MODULE NOTIFICATIONS

   Gestion :
   - chargement des notifications
   - affichage du centre de notifications
   - notifications en temps réel
   - lecture et suivi des notifications
   - navigation vers les éléments concernés
   - ouverture directe de la fiche employé depuis une notification d'absence
   - changements récents du planning
   - ouverture directe de la fiche employé depuis une notification d'absence
============================================================ */

async function loadPlanningPublicationChanges(
    publicationId
){

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "planning_publication_changes"
            )
            .select(`
                id,
                publication_id,
                job_id,
                change_type,
                job_name,
                job_date,
                job_time,
                old_team_id,
                new_team_id
            `)
            .eq(
                "publication_id",
                publicationId
            )
            .order(
                "job_date",
                {
                    ascending:true
                }
            );


    if(error){

        console.error(
            "Erreur chargement changements publication :",
            error
        );

        return [];

    }


    return data || [];

}

   /* ============================================================
   CHANGEMENTS PLANNING RECENTS - 24 HEURES
============================================================ */

async function loadRecentPlanningChanges(){

    recentPlanningChanges =
        [];


    const now =
        Date.now();


    const twentyFourHours =
        24 *
        60 *
        60 *
        1000;


    /*
       Notifications planning reçues
       durant les dernières 24 heures.

       Peu importe qu'elles soient lues
       ou non.
    */

    const recentNotifications =
        notifications.filter(
            notification => {

                if(
                    notification.type !== "planning" &&
                    notification.type !== "planning_publication"
                ){

                    return false;

                }


                const createdAt =
                    new Date(
                        notification.created_at
                    ).getTime();


                return (
                    now -
                    createdAt
                ) < twentyFourHours;

            }
        );


    for(
        const notification
        of recentNotifications
    ){

        /* ====================================================
           ANCIENNES NOTIFICATIONS INDIVIDUELLES
        ==================================================== */

        if(
            notification.type ===
            "planning"
        ){

            recentPlanningChanges.push({

                id:
                    Number(
                        notification.reference_id
                    ),

                title:
                    notification.title,

                created_at:
                    notification.created_at

            });


            continue;

        }


        /* ====================================================
           PUBLICATIONS GROUPEES
        ==================================================== */

        if(
            notification.type ===
            "planning_publication"
        ){

            const changes =
                await loadPlanningPublicationChanges(
                    notification.reference_id
                );


            changes
                .filter(
                    change =>
                        change.change_type !==
                        "deleted"
                )
                .forEach(
                    change => {

                        recentPlanningChanges.push({

                            id:
                                Number(
                                    change.job_id
                                ),

                            title:
                                change.change_type ===
                                "added"
                                ? "Nouveau chantier au planning"
                                : "Planning modifié",

                            created_at:
                                notification.created_at

                        });

                    }
                );

        }

    }


    /*
       Plusieurs notifications peuvent concerner
       le même chantier.

       On garde une seule entrée par chantier.
    */

    recentPlanningChanges =
        recentPlanningChanges.filter(
            (
                change,
                index,
                array
            ) =>
                index ===
                array.findIndex(
                    item =>
                        Number(item.id) ===
                        Number(change.id)
                )
        );

}

/* ============================================================
   CHARGEMENT DES NOTIFICATIONS
============================================================ */

async function loadNotifications(){

    if(!currentUser){

        notifications = [];

        updateNotificationBadge();

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("notifications")
            .select(`
                id,
                type,
                title,
                message,
                reference_id,
                is_read,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending:false
                }
            );


    if(error){

        console.error(
            "Erreur chargement notifications :",
            error
        );

        return;

    }


    notifications =
    data || [];


/*
   Conserve les indications Nouveau / Modifié
   pendant 24 heures, même après lecture.
*/

await loadRecentPlanningChanges();


updateNotificationBadge();

}

/* ============================================================
   COMPTEUR
============================================================ */

function updateNotificationBadge(){

    const badge =
        document.getElementById(
            "notificationBadge"
        );


    const mobileBadge =
        document.getElementById(
            "mobileNotificationBadge"
        );


    const unread =
        notifications.filter(
            notification =>
                !notification.is_read
        ).length;


    const badgeText =
        unread > 99
        ? "99+"
        : unread;


    if(badge){

        if(unread > 0){

            badge.textContent =
                badgeText;

            badge.style.display =
                "flex";

        }
        else{

            badge.style.display =
                "none";

        }

    }


    if(mobileBadge){

        if(unread > 0){

            mobileBadge.textContent =
                badgeText;

            mobileBadge.style.display =
                "flex";

        }
        else{

            mobileBadge.style.display =
                "none";

        }

    }

}

/* ============================================================
   MARQUER COMME LUE
============================================================ */

async function markNotificationRead(
    notificationId
){

    const {
        error
    } =
        await supabaseClient
            .from("notifications")
            .update({

                is_read:
                    true,

                read_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                notificationId
            );


    if(error){

        console.error(
            "Erreur lecture notification :",
            error
        );

        return;

    }


    await loadNotifications();

    renderNotifications();

}

/* ============================================================
   AFFICHAGE
============================================================ */

function renderNotifications(){

    const list =
        document.getElementById(
            "notificationList"
        );


    if(!list)
        return;


    if(!notifications.length){

        list.innerHTML = `

            <div class="notification-empty">

                🔔

                <div>
                    Aucune notification
                </div>

            </div>

        `;

        return;

    }


    list.innerHTML =
        notifications
        .map(
            notification => {

                const date =
                    new Date(
                        notification.created_at
                    );


                const dateText =
                    date.toLocaleDateString(
                        "fr-FR"
                    );


                const timeText =
                    date.toLocaleTimeString(
                        "fr-FR",
                        {
                            hour:"2-digit",
                            minute:"2-digit"
                        }
                    );


                return `

                    <div
    class="
        notification-item
        ${notification.is_read
            ? ""
            : "unread"}
    "
    onclick="
        openNotificationReference(
            ${notification.id}
        )
    ">

                        <div class="notification-item-title">

                            ${escapeHtml(
                                notification.title
                            )}

                        </div>


                        <div class="notification-item-message">

                            ${escapeHtml(
                                notification.message
                            )}

                        </div>


                        <div class="notification-item-date">

                            ${dateText}
                            à
                            ${timeText}

                        </div>

                    </div>

                `;

            }
        )
        .join("");

}

/* ============================================================
   
============================================================ */

async function openNotificationReference(
    notificationId
){

    const notification =
        notifications.find(
            item =>
                item.id === notificationId
        );


    if(!notification)
        return;


    const toast =
        document.getElementById(
            "notificationToast"
        );


    if(toast){

        toast.remove();

    }

/* ========================================================
   PLANNING
======================================================== */

if(
    notification.type === "planning" ||
    notification.type === "planning_publication"
){

    /*
       Recharge le planning depuis Supabase.

       Admin    -> jobs
       Employé  -> published_jobs
    */

    await loadJobs();


    /*
       Marque la notification comme lue.
    */

    await markNotificationRead(
        notificationId
    );


    /*
       Recharge les notifications
       et les changements récents
       pour conserver Nouveau / Modifié.
    */

    await loadNotifications();


    /*
       Reconstruit le planning
       avec les nouvelles données.
    */

    renderPlanning();


    /* ====================================================
       MOBILE
    ==================================================== */

    if(
        window.innerWidth <= 768
    ){

        const mobileButton =
            document.querySelector(
                '.mobile-nav-button[data-mobile-page="planning"]'
            );


        openMobilePage(
            "planning",
            mobileButton
        );


        setMobilePlanningView(
            mobilePlanningView
        );

    }


    /* ====================================================
       PC
    ==================================================== */

    else{

        const planningButton =
            document.querySelector(
                '.menu-button[data-page="planning"]'
            );


        if(planningButton){

            planningButton.click();

        }


        renderPlanning();

    }


    /*
       Ferme le panneau notifications.
    */

    const panel =
        document.getElementById(
            "notificationPanel"
        );


    if(panel){

        panel.remove();

    }


    return;

}
   
/* ========================================================
   SAMEDI VOLONTAIRE
======================================================== */

if(
    notification.type ===
    "saturday_request"
){

    /*
       Marque la notification comme lue.
    */

    await markNotificationRead(
        notificationId
    );


    /*
       Recharge les données du samedi courant.
    */

    await loadSaturdayRequests();

    renderSaturday();


    /*
       Téléphone.
    */

    if(
        window.innerWidth <= 768
    ){

        const mobileButton =
            document.querySelector(
                '.mobile-nav-button[data-mobile-page="saturday"]'
            );


        openMobilePage(
            "saturday",
            mobileButton
        );

    }
    else{

        /*
           PC.
        */

        const button =
            document.querySelector(
                '.menu-button[data-page="saturday"]'
            );


        if(button){

            button.click();

        }

    }


    return;

}

  /* ========================================================
   HEURES SUPPLEMENTAIRES
======================================================== */

if(
    notification.type === "overtime" ||
    notification.type === "overtime_request"
){

    /*
       Marque la notification comme lue.
    */

    await markNotificationRead(
        notificationId
    );


    /*
       Recharge les demandes depuis Supabase AVANT
       d'afficher la page.

       Important notamment pour l'admin qui vient
       de recevoir une nouvelle demande.
    */

    await loadOvertimeRequests();


    renderOvertime();


    /* ====================================================
       MOBILE
    ==================================================== */

    if(
        window.innerWidth <= 768
    ){

        const mobileButton =
            document.querySelector(
                '.mobile-nav-button[data-mobile-page="overtime"]'
            );


        openMobilePage(
            "overtime",
            mobileButton
        );


        /*
           On reconstruit une dernière fois après
           changement de page.
        */

        renderOvertime();

    }


    /* ====================================================
       PC
    ==================================================== */

    else{

        const button =
            document.querySelector(
                '.menu-button[data-page="overtime"]'
            );


        if(button){

            button.click();

        }


        renderOvertime();

    }


    /*
       Ferme le panneau de notifications.
    */

    const panel =
        document.getElementById(
            "notificationPanel"
        );


    if(panel){

        panel.remove();

    }


    return;

}

/* ========================================================
   ABSENCES ET CONGES

   Lorsqu'une notification d'absence est sélectionnée :
   - marque la notification comme lue
   - recharge les indisponibilités
   - retrouve l'absence et l'employé concernés
   - passe automatiquement "reported" à "acknowledged"
     lorsque l'administrateur consulte le signalement
   - ouvre la page Employés
   - ouvre directement la fiche de l'employé concerné
======================================================== */

if(
    notification.type ===
    "absence"
){

    const absenceId =
        Number(
            notification.reference_id
        );


    /*
       Marque la notification comme lue.
    */

    await markNotificationRead(
        notificationId
    );


    /*
       Recharge les indisponibilités afin de travailler
       avec la dernière version enregistrée dans Supabase.
    */

    await loadEmployeeUnavailability();


    let absence =
        employeeUnavailability.find(
            item =>
                Number(item.id) ===
                absenceId
        );


    if(!absence){

        alert(
            "Cette absence est introuvable."
        );

        return;

    }


    /*
       Lorsqu'un administrateur ouvre pour la première fois
       une absence signalée par un employé, elle passe
       automatiquement de "reported" à "acknowledged".

       Aucun Push n'est envoyé pour cette étape.
    */

    if(
        isAdmin() &&
        absence.source ===
            "employee" &&
        absence.status ===
            "reported"
    ){

        const {
            error:
                acknowledgeError
        } =
            await supabaseClient.rpc(
                "review_absence",
                {
                    p_unavailability_id:
                        absenceId,

                    p_status:
                        "acknowledged"
                }
            );


        if(acknowledgeError){

            console.error(
                "Erreur prise en compte absence :",
                acknowledgeError
            );

        }
        else{

            /*
               Recharge après modification du statut
               afin que la fiche affiche immédiatement
               "Prise en compte".
            */

            await loadEmployeeUnavailability();


            absence =
                employeeUnavailability.find(
                    item =>
                        Number(item.id) ===
                        absenceId
                );

        }

    }


    /*
       Ferme le panneau de notifications avant
       d'ouvrir la fiche employé.
    */

    const panel =
        document.getElementById(
            "notificationPanel"
        );


    if(panel){

        panel.remove();

    }


    /*
       Navigation vers la page Employés.
    */

    if(
        window.innerWidth <= 768
    ){

        const mobileButton =
            document.querySelector(
                '.mobile-nav-button[data-mobile-page="employees"]'
            );


        openMobilePage(
            "employees",
            mobileButton
        );

    }
    else{

        const employeeButton =
            document.querySelector(
                '.menu-button[data-page="employees"]'
            );


        if(employeeButton){

            employeeButton.click();

        }

    }


    /*
       Actualise la liste des employés.

       Le salarié reste notamment marqué comme
       ayant une absence à traiter puisque
       "acknowledged" reste un statut à traiter.
    */

    renderEmployees();


    /*
   Ouvre directement la fiche du salarié concerné.
*/

editEmployee(
    Number(
        absence.employee_id
    )
);


/*
   Met en évidence l'absence précise
   correspondant à la notification.
*/

setTimeout(
    () => {

        highlightEmployeeAbsence(
            absenceId
        );

    },
    150
);


return;

}

    /* ========================================================
       PLANNING
    ======================================================== */

    if(
    notification.type === "planning"
){

    /*
       On mémorise le chantier concerné
       pour afficher Nouveau / Modifié.
    */

    highlightedPlanningJob = {

        id:
            Number(
                notification.reference_id
            ),

        title:
            notification.title

    };


    /*
       Recharge la dernière version publiée.
    */

    await loadJobs();


    /*
       Recherche le chantier concerné.
       Un chantier supprimé peut ne plus exister,
       donc on vérifie avant.
    */

    const targetJob =
    jobs.find(
        job =>
            Number(job.id) ===
            Number(notification.reference_id)
    );


const targetDate =
    getPlanningNotificationDate(
        notification,
        targetJob
    );


if(targetDate){



        /*
           Lundi de la semaine actuelle.
        */

        const currentMonday =
            mondayOfWeek(
                0
            );


        currentMonday.setHours(
            12,
            0,
            0,
            0
        );


        /*
           Trouve le lundi de la semaine
           du chantier.
        */

        const targetMonday =
            new Date(
                targetDate
            );


        const targetDay =
            targetMonday.getDay();


        const differenceToMonday =
            targetDay === 0
            ? -6
            : 1 - targetDay;


        targetMonday.setDate(
            targetMonday.getDate() +
            differenceToMonday
        );


        /*
           Calcul de l'écart en semaines.
        */

        const millisecondsPerWeek =
            7 *
            24 *
            60 *
            60 *
            1000;


        weekOffset =
            Math.round(
                (
                    targetMonday -
                    currentMonday
                ) /
                millisecondsPerWeek
            );


    }


    /*
       Marque ensuite la notification comme lue.
    */

    await markNotificationRead(
        notificationId
    );


    /*
       Affiche immédiatement la bonne semaine.
    */

    ;


    const button =
        document.querySelector(
            '.menu-button[data-page="planning"]'
        );


    if(button){

        button.click();

    }


    return;

}

}

/* ============================================================
   OUVERTURE / FERMETURE
============================================================ */

function toggleNotifications(){

    let panel =
        document.getElementById(
            "notificationPanel"
        );


    if(panel){

        panel.remove();

        return;

    }


    createNotificationPanel();

}

   /* ============================================================
   FERMETURE DU PANNEAU AU CLIC EXTERIEUR
============================================================ */

document.addEventListener(
    "click",
    function(event){

        const panel =
            document.getElementById(
                "notificationPanel"
            );

        const button =
            document.getElementById(
                "notificationButton"
            );
       
const mobileButton =
    document.getElementById(
        "mobileNotificationButton"
    );

        if(!panel)
            return;


        /*
           Si le clic est dans le panneau
           ou sur la cloche, on ne ferme pas.
        */

        if(
    panel.contains(event.target) ||

    (
        button &&
        button.contains(event.target)
    ) ||

    (
        mobileButton &&
        mobileButton.contains(event.target)
    )
){

    return;

}


        /*
           Clic ailleurs :
           fermeture du panneau.
        */

        panel.remove();

    }
);

/* ============================================================
   PANNEAU
============================================================ */

function createNotificationPanel(){

    const panel =
        document.createElement(
            "div"
        );


    panel.id =
        "notificationPanel";


    panel.className =
        "notification-panel";


    panel.innerHTML = `

        <div class="notification-panel-header">

            <strong>
                Notifications
            </strong>

            <button
                class="notification-mark-all"
                onclick="markAllNotificationsRead()">

                Tout lire

            </button>

        </div>


        <div
            class="notification-list"
            id="notificationList">

        </div>

    `;


    document.body.appendChild(
        panel
    );


    renderNotifications();

}

/* ============================================================
   TOUT LIRE
============================================================ */

async function markAllNotificationsRead(){

    const unreadIds =
        notifications
        .filter(
            notification =>
                !notification.is_read
        )
        .map(
            notification =>
                notification.id
        );


    if(!unreadIds.length)
        return;


    const {
        error
    } =
        await supabaseClient
            .from("notifications")
            .update({

                is_read:
                    true,

                read_at:
                    new Date().toISOString()

            })
            .in(
                "id",
                unreadIds
            );


    if(error){

        console.error(
            "Erreur lecture notifications :",
            error
        );

        return;

    }


    await loadNotifications();

    renderNotifications();

}

   /* ============================================================
   NOTIFICATIONS TEMPS REEL
============================================================ */

function startNotificationRealtime(){

    if(!currentUser)
        return;


    /*
       Si un ancien canal existe,
       on le supprime avant d'en créer un nouveau.
    */

    if(notificationsChannel){

        supabaseClient
            .removeChannel(
                notificationsChannel
            );

        notificationsChannel =
            null;

    }


    notificationsChannel =
        supabaseClient
            .channel(
                "embelis-notifications-" +
                currentUser.id
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter:
                        "recipient_user_id=eq." +
                        currentUser.id
                },
                async payload => {

    console.log(
        "Nouvelle notification :",
        payload.new
    );


    await loadNotifications();

                   ;


    if(
        document.getElementById(
            "notificationPanel"
        )
    ){

        renderNotifications();

    }


    showNotificationToast(
        payload.new
    );

}
            )
            .subscribe(
                status => {

                    console.log(
                        "Realtime notifications :",
                        status
                    );

                }
            );

}
   function showNotificationToast(
    notification
){

    const existing =
        document.getElementById(
            "notificationToast"
        );


    if(existing){

        existing.remove();

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.id =
        "notificationToast";


    toast.className =
        "notification-toast";


    toast.innerHTML = `

        <div class="notification-toast-title">

            🔔
            ${escapeHtml(
                notification.title
            )}

        </div>


        <div class="notification-toast-message">

            ${escapeHtml(
                notification.message
            )}

        </div>


        <div class="notification-toast-actions">

            <button
                class="notification-toast-button"
                onclick="
                    openNotificationReference(
                        ${notification.id}
                    )
                ">

                Voir

            </button>

        </div>

    `;


    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {

            const current =
                document.getElementById(
                    "notificationToast"
                );


            if(current){

                current.remove();

            }

        },
        7000
    );

}

   function getPlanningNotificationDate(
    notification,
    targetJob
){

    /*
       Chantier encore présent :
       on utilise directement job_date.
    */

    if(
        targetJob &&
        targetJob.job_date
    ){

        return new Date(
            targetJob.job_date +
            "T12:00:00"
        );

    }


    /*
       Chantier supprimé :
       on récupère DD/MM/YYYY
       depuis le message.
    */

    const match =
        notification.message
        ?.match(
            /(\d{2})\/(\d{2})\/(\d{4})/
        );


    if(!match)
        return null;


    const day =
        Number(match[1]);

    const month =
        Number(match[2]) - 1;

    const year =
        Number(match[3]);


    return new Date(
        year,
        month,
        day,
        12,
        0,
        0
    );

}