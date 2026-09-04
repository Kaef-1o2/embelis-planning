/* ============================================================
   EMBELIS PLANNING
   MODULE PRINCIPAL DE L'APPLICATION

   Gestion :
   - initialisation de l'application
   - chargement général des données
   - rendu global
   - démarrage Embelis
   - splash screen
============================================================ */

/* ============================================================
   RENDU GLOBAL DE L'APPLICATION
   Actualise les différents modules principaux de l'interface
   à partir des données actuellement chargées.
============================================================ */

function renderAll(){

    refreshTeamSelects();

    ;

    renderEmployees();

    renderSaturday();

    renderOvertime();

    renderTeams();

}

/* ============================================================
   MASQUER L'ECRAN DE DEMARRAGE
   Lance l'animation de disparition du splash screen Embelis,
   puis le retire complètement de l'affichage.
============================================================ */

function hideEmbelisSplash(){

    const splash =
        document.getElementById(
            "embelisSplash"
        );


    if(!splash)
        return;


    setTimeout(
        () => {

            splash.classList.add(
                "hide"
            );

        },
        1400
    );


    setTimeout(
        () => {

            splash.remove();

        },
        1900
    );

}

/* ============================================================
   INITIALISER L'APPLICATION
   Charge les données principales depuis Supabase, puis lance
   le rendu de l'interface et restaure la dernière page ouverte.
============================================================ */

async function initApp(){

    try{

        console.log("1 - Chargement équipes...");

        await loadTeams();

        console.log("✓ Équipes OK");


        console.log("2 - Chargement employés...");

        await loadEmployees();

        console.log("✓ Employés OK");


        console.log("3 - Chargement absences et congés...");

        await loadEmployeeUnavailability();

        console.log("✓ Absences et congés OK");


        console.log("4 - Chargement chantiers...");

        await loadJobs();

        console.log("✓ Chantiers OK");


        console.log("5 - Chargement samedi...");

        await loadSaturdayRequests();

        await loadSaturdayHistory();

        console.log("✓ Samedi OK");


        console.log("6 - Chargement heures supplémentaires...");

        await loadOvertimeRequests();

        console.log("✓ Heures supplémentaires OK");


        /*
           Toutes les données nécessaires sont maintenant
           chargées avant le premier rendu de l'interface.

           Cela permet notamment à renderEmployees()
           de retrouver les absences et congés après
           un rechargement complet de l'application.
        */

        renderAll();


        restorePage();


        console.log(
            "✓ EMBELIS PAYSAGE : SUPABASE OK"
        );

    }
    catch(error){

        console.error(
            "❌ ERREUR SUPABASE :",
            error
        );


        alert(
            "Erreur Supabase :\n\n" +
            "Code : " +
            (
                error.code ||
                "inconnu"
            ) +
            "\nMessage : " +
            (
                error.message ||
                "inconnu"
            ) +
            "\nDétails : " +
            (
                error.details ||
                "aucun"
            )
        );

    }

}

/* ============================================================
   DEMARRER L'APPLICATION
   Vérifie l'utilisateur connecté, applique ses permissions,
   initialise les données et démarre les services nécessaires.
============================================================ */

async function startApp(){

    const employee =
        await loadCurrentUser();


    if(employee){

        hideLoginScreen();


        applyUserPermissions();


        renderCurrentUserSidebar();


        if(
            window.innerWidth <= 768 &&
            !history.state?.embelisApp
        ){

            history.replaceState(
                {
                    embelisApp:
                        true,

                    embelisPage:
                        currentPage
                },
                "",
                window.location.href
            );

        }


        /*
           Chargement principal de l'application.
        */

        await initApp();


        /*
           Charge les notifications
           et les changements récents du planning.
        */

        await loadNotifications();


        /*
           Important :
           on reconstruit le planning après
           le chargement des notifications.

           Sinon le planning desktop reste vide
           au premier chargement.
        */

        renderPlanning();


        startNotificationRealtime();


        /*
           Vue planning mobile.
        */

        if(
            window.innerWidth <= 768
        ){

            setMobilePlanningView(
                mobilePlanningView
            );

        }


        return;

    }


    showLoginScreen();

}

/* ============================================================
   LANCER EMBELIS
   Exécute la séquence finale de démarrage, gère un éventuel
   accès par invitation puis masque l'écran de démarrage.
============================================================ */

async function startEmbelis(){

    await startApp();

    await handleInviteAccess();

    hideEmbelisSplash();

}