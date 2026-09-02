/* ============================================================
   EMBELIS PLANNING
   MODULE AUTHENTIFICATION

   Gestion :
   - utilisateur connecté
   - connexion / déconnexion
   - rôles et permissions
   - accès des employés
   - invitations
   - changement de mot de passe
============================================================ */

/* ============================================================
   UTILISATEUR CONNECTE
============================================================ */

async function loadCurrentUser(){

    const {
        data: {
            user
        },
        error
    } = await supabaseClient.auth.getUser();


    if(error){

        console.error(
            "Erreur récupération utilisateur :",
            error
        );

        return null;

    }


    if(!user){

        console.log(
            "Aucun utilisateur connecté."
        );

        return null;

    }


    currentUser =
        user;


    const {
        data: employee,
        error: employeeError
    } =
        await supabaseClient
            .from("employees")
            .select(`
                id,
                name,
                role,
                active,
                team_id,
                auth_user_id,
                app_role,
                teams (
                    id,
                    name
                )
            `)
            .eq(
                "auth_user_id",
                user.id
            )
            .maybeSingle();


    if(employeeError){

        console.error(
            "Erreur récupération employé :",
            employeeError
        );

        return null;

    }


    if(!employee){

        console.warn(
            "Le compte connecté n'est associé à aucun employé."
        );

        return null;

    }


    currentEmployee = {

        id:
            employee.id,

        name:
            employee.name,

        role:
            employee.role,

        active:
            employee.active,

        team_id:
            employee.team_id,

        app_role:
            employee.app_role,

        team:
            employee.teams
            ? employee.teams.name
            : ""

    };


    console.log(
        "Utilisateur connecté :",
        currentEmployee
    );


    console.log(
        "Rôle application :",
        currentEmployee.app_role
    );


    return currentEmployee;

}

    /* ============================================================
    AFFICHAGE SELON LE ROLE
 ============================================================ */

function isAdmin(){

    return (
        currentEmployee &&
        currentEmployee.app_role === "admin"
    );

}
   
 function applyUserPermissions(){

    const admin =
        isAdmin();


    document
        .querySelectorAll(
            '.menu-button[data-page="teams"], .menu-button[data-page="employees"]'
        )
        .forEach(
            button => {

                button.style.display =
                    admin
                    ? ""
                    : "none";

            }
        );
    
/*
   Navigation mobile :
   Équipes et Employés réservés à l'admin.
*/

document
    .querySelectorAll(
        '.mobile-nav-button[data-mobile-page="teams"], ' +
        '.mobile-nav-button[data-mobile-page="employees"]'
    )
    .forEach(
        button => {

            button.style.display =
                admin
                ? ""
                : "none";

        }
    );

    const newJobButton =
        document.getElementById(
            "newJobButton"
        );


    if(newJobButton){

        newJobButton.style.display =
            admin
            ? "inline-flex"
            : "none";

    }

    const proposeSaturdayButton =
    document.getElementById(
        "proposeSaturdayButton"
    );


if(proposeSaturdayButton){

    proposeSaturdayButton.style.display =
        isAdmin()
        ? "inline-flex"
        : "none";

}

    const newOvertimeButton =
    document.getElementById(
        "newOvertimeButton"
    );


if(newOvertimeButton){

    newOvertimeButton.style.display =
        isAdmin()
        ? "none"
        : "inline-flex";

}

}
    /* ============================================================
   AUTHENTIFICATION
============================================================ */

async function loginUser(){

    const identifier =
        document
            .getElementById("loginEmail")
            .value
            .trim();


    const password =
        document
            .getElementById("loginPassword")
            .value;


    const errorBox =
        document
            .getElementById("loginError");


    errorBox.style.display =
        "none";


    if(!identifier || !password){

        errorBox.textContent =
            "Merci de renseigner votre e-mail ou votre téléphone et votre mot de passe.";

        errorBox.style.display =
            "block";

        return;

    }


    const button =
        document.querySelector(
            ".login-button"
        );


    button.disabled =
        true;

    button.textContent =
        "Connexion...";


    const isEmail =
        identifier.includes("@");


    let credentials;


    if(isEmail){

        credentials = {

            email:
                identifier,

            password

        };

    }
    else{

        let phone =
            identifier.replace(
                /[\s.\-()]/g,
                ""
            );


        /*
           Format français :
           06... -> +336...
           07... -> +337...
        */

        if(
            phone.startsWith("0")
        ){

            phone =
                "+33" +
                phone.slice(1);

        }


        credentials = {

            phone,

            password

        };

    }


    const {
        data,
        error
    } =
        await supabaseClient.auth
            .signInWithPassword(
                credentials
            );


    button.disabled =
        false;

    button.textContent =
        "Se connecter";


    if(error){

        console.error(
            "Erreur connexion :",
            error
        );


        errorBox.textContent =
            "E-mail, téléphone ou mot de passe incorrect.";

        errorBox.style.display =
            "block";

        return;

    }


    if(!data.user){

        errorBox.textContent =
            "Impossible de récupérer votre compte.";

        errorBox.style.display =
            "block";

        return;

    }


    currentUser =
        data.user;


    const employee =
        await loadCurrentUser();


    if(!employee){

        console.error(
            "LOGIN : loadCurrentUser() a retourné null."
        );


        errorBox.textContent =
            "Connexion réussie, mais aucun employé n'est associé à ce compte.";

        errorBox.style.display =
            "block";

        return;

    }

    resetUserInterface();
   
    hideLoginScreen();

applyUserPermissions();

   renderCurrentUserSidebar();


/*
   À chaque nouvelle connexion,
   on arrive sur le planning.
*/

currentPage =
    "planning";


localStorage.setItem(
    "embelis_current_page",
    currentPage
);


renderAll();

restorePage();

await loadNotifications();

startNotificationRealtime();


    console.log(
        "TEST ROLE :",
        currentEmployee.app_role
    );

}


 function hideLoginScreen(){

     const screen =
         document.getElementById(
             "loginScreen"
         );


     if(screen){

         screen.style.display =
             "none";

     }

 }


 function showLoginScreen(){

     const screen =
         document.getElementById(
             "loginScreen"
         );


     if(screen){

         screen.style.display =
             "flex";

     }

 }

/* ============================================================
   OUVRIR CREATION ACCES EMPLOYE
============================================================ */

function openEmployeeAccessModal(){

    if(
        editingEmployeeId === null
    ){

        alert(
            "Enregistrez d'abord l'employé."
        );

        return;

    }


    const employee =
        employees.find(
            e =>
                e.id ===
                editingEmployeeId
        );


    if(!employee)
        return;


    if(
        employee.auth_user_id
    ){

        alert(
            "Cet employé possède déjà un accès."
        );

        return;

    }


    const emailInput =
        document.getElementById(
            "employeeAccessEmail"
        );


    if(emailInput){

        emailInput.value =
            "";

    }


    const emailRadio =
        document.querySelector(
            'input[name="employeeAccessMethod"][value="email"]'
        );


    if(emailRadio){

        emailRadio.checked =
            true;

    }


    updateEmployeeAccessMethod();


    openModal(
    "employeeAccessModal"
);

}

/* ============================================================
   MODE DE CONNEXION EMPLOYE
============================================================ */

function updateEmployeeAccessMethod(){

    const method =
        document.querySelector(
            'input[name="employeeAccessMethod"]:checked'
        )?.value;


    const emailGroup =
        document.getElementById(
            "employeeAccessEmailGroup"
        );


    if(emailGroup){

        emailGroup.style.display =
            method === "email"
            ? ""
            : "none";

    }

}
   
/* ============================================================
   CREER ACCES EMPLOYE
============================================================ */

async function createEmployeeAccess(){

    if(
        editingEmployeeId === null
    ){

        alert(
            "Aucun employé sélectionné."
        );

        return;

    }


    const method =
        document.querySelector(
            'input[name="employeeAccessMethod"]:checked'
        )?.value;


    /*
       Téléphone prévu pour plus tard.
    */

    if(
        method === "phone"
    ){

        alert(
            "Connexion par téléphone bientôt disponible."
        );

        return;

    }


    const email =
        document.getElementById(
            "employeeAccessEmail"
        ).value
        .trim()
        .toLowerCase();


    if(!email){

        alert(
            "Merci d'indiquer une adresse e-mail."
        );

        return;

    }


    /*
       Vérification simple du format.
    */

    if(
        !email.includes("@") ||
        !email.includes(".")
    ){

        alert(
            "L'adresse e-mail ne semble pas valide."
        );

        return;

    }


    const button =
        document.querySelector(
            '#employeeAccessModal .btn.primary'
        );


    if(button){

        button.disabled =
            true;

        button.textContent =
            "Envoi...";

    }


    try{

        const {
            data,
            error
        } =
            await supabaseClient
                .functions
                .invoke(
                    "create-employee-access",
                    {

                        body: {

    employee_id:
        editingEmployeeId,

    email,

    redirect_to:
        window.location.origin +
        window.location.pathname +
        "?invite=1"

}

                    }
                );


        if(error){

            console.error(
                "Erreur Edge Function :",
                error
            );


            alert(
                "Impossible d'envoyer l'invitation.\n\n" +
                (
                    data?.error ||
                    error.message ||
                    "Erreur inconnue."
                )
            );

            return;

        }


        if(
            !data ||
            data.success !== true
        ){

            console.error(
                "Réponse création accès :",
                data
            );


            alert(
                "Impossible d'envoyer l'invitation.\n\n" +
                (
                    data?.error ||
                    "Réponse serveur invalide."
                )
            );

            return;

        }


        await loadEmployees();


        closeModal(
            "employeeAccessModal"
        );


        closeModal(
            "employeeModal"
        );


        renderAll();

        restorePage();


        alert(
            "Invitation envoyée avec succès.\n\n" +
            "Une invitation a été envoyée à :\n" +
            email
        );

    }
    catch(error){

        console.error(
            "Erreur invitation employé :",
            error
        );


        alert(
            "Une erreur est survenue lors de l'envoi de l'invitation."
        );

    }
    finally{

        if(button){

            button.disabled =
                false;

            button.textContent =
                "Envoyer l'invitation";

        }

    }

}

   /* ============================================================
   SUPPRIMER ACCES EMPLOYE
============================================================ */

async function deleteEmployeeAccess(
    employeeId
){

    const employee =
        employees.find(
            item =>
                item.id === employeeId
        );


    if(!employee)
        return;


    const confirmed =
        confirm(
            "Supprimer l'accès à l'application de " +
            employee.name +
            " ?\n\n" +
            "Sa fiche salarié, son équipe et ses informations seront conservées."
        );


    if(!confirmed)
        return;


    const {
        data,
        error
    } =
        await supabaseClient
            .functions
            .invoke(
                "delete-employee-access",
                {

                    body: {

                        employee_id:
                            employeeId

                    }

                }
            );


    if(error){

        console.error(
            "Erreur suppression accès :",
            error
        );


        alert(
            "Impossible de supprimer l'accès.\n\n" +
            (
                data?.error ||
                error.message ||
                "Erreur inconnue."
            )
        );

        return;

    }


    if(
        !data ||
        data.success !== true
    ){

        alert(
            data?.error ||
            "Impossible de supprimer l'accès."
        );

        return;

    }


    await loadEmployees();


    closeModal(
        "employeeModal"
    );


    renderAll();

    restorePage();


    alert(
        "Accès supprimé avec succès.\n\n" +
        employee.name +
        " ne peut plus se connecter à Embelis."
    );

}

/* ============================================================
   INVITATION EMPLOYE
============================================================ */

async function handleInviteAccess(){

    const params =
        new URLSearchParams(
            window.location.search
        );


    const isInvite =
        params.get("invite") === "1";


    if(!isInvite)
        return;
   
invitePasswordRequired = true;

    /*
       On vérifie si Supabase a bien
       récupéré une session depuis le lien.
    */

    const {
        data: {
            session
        },
        error
    } =
        await supabaseClient.auth
            .getSession();


    if(error){

        console.error(
            "Erreur session invitation :",
            error
        );

        return;

    }


    if(!session){

        console.warn(
            "Invitation détectée mais aucune session active."
        );

        return;

    }


    /*
       L'utilisateur est authentifié via
       le lien d'invitation.
    */

    currentUser =
        session.user;


    await loadCurrentUser();


    hideLoginScreen();


    document.getElementById(
        "passwordModalTitle"
    ).textContent =
        "Choisir mon mot de passe";


    document.getElementById(
        "newPassword"
    ).value =
        "";


    document.getElementById(
        "confirmPassword"
    ).value =
        "";

   /*
   Réactive les champs pour
   la création du premier mot de passe.
*/

document.getElementById(
    "newPassword"
).disabled =
    false;


document.getElementById(
    "confirmPassword"
).disabled =
    false;

    openModal(
    "passwordModal"
);

}

 /* ============================================================
   OUVRIR MODALE MOT DE PASSE
============================================================ */

function openPasswordModal(){

    const passwordInput =
        document.getElementById(
            "newPassword"
        );

    const confirmationInput =
        document.getElementById(
            "confirmPassword"
        );


    passwordInput.disabled =
        false;

    confirmationInput.disabled =
        false;


    passwordInput.value =
        "";

    confirmationInput.value =
        "";


    document.getElementById(
        "passwordModalTitle"
    ).textContent =
        "Mon mot de passe";


    const cancelButton =
        document.getElementById(
            "passwordCancelButton"
        );


    if(cancelButton){

        cancelButton.style.display =
            "";

    }


    openModal(
    "passwordModal"
);


    /*
       Place directement le curseur
       dans le premier champ.
    */

    passwordInput.focus();

}


/* ============================================================
   CHANGER SON MOT DE PASSE
============================================================ */

async function updateMyPassword(){

    const password =
        document.getElementById(
            "newPassword"
        ).value;


    const confirmation =
        document.getElementById(
            "confirmPassword"
        ).value;


    if(
        !password ||
        password.length < 8
    ){

        alert(
            "Le mot de passe doit contenir au moins 8 caractères."
        );

        return;

    }


    if(
        password !== confirmation
    ){

        alert(
            "Les deux mots de passe ne correspondent pas."
        );

        return;

    }


    const {
        error
    } =
        await supabaseClient.auth
            .updateUser({

                password

            });


    if(error){

        console.error(
            "Erreur modification mot de passe :",
            error
        );


        alert(
            "Impossible de modifier le mot de passe.\n\n" +
            error.message
        );

        return;

    }


    /*
       Si l'utilisateur vient d'une invitation,
       l'activation est maintenant terminée.
    */

    if(
        invitePasswordRequired
    ){

        invitePasswordRequired =
            false;

       currentPage =
    "planning";


localStorage.setItem(
    "embelis_current_page",
    currentPage
);


        /*
           Retire ?invite=1 de l'URL
           sans recharger la page.
        */

        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );


        const cancelButton =
            document.getElementById(
                "passwordCancelButton"
            );


        if(cancelButton){

            cancelButton.style.display =
                "";

        }

    }


    closeModal(
        "passwordModal"
    );
   restorePage();


    alert(
        "Votre mot de passe a été enregistré avec succès."
    );

}

/* ============================================================
   DECONNEXION UTILISATEUR
============================================================ */

async function logoutUser(){

    /* ========================================================
       1. RETRAIT DE L'APPAREIL DES NOTIFICATIONS PUSH
       
       IMPORTANT :
       Cette opération doit être effectuée AVANT signOut(),
       pendant que Supabase connaît encore l'utilisateur.
    ======================================================== */

    try{

        if(
            "serviceWorker" in navigator &&
            "PushManager" in window
        ){

            const registration =
                await navigator
                    .serviceWorker
                    .ready;


            const subscription =
                await registration
                    .pushManager
                    .getSubscription();


            if(subscription){

                const {
                    error:
                        pushLogoutError
                } =
                    await supabaseClient
                        .rpc(
                            "unregister_push_subscription",
                            {

                                p_endpoint:
                                    subscription.endpoint

                            }
                        );


                if(pushLogoutError){

                    /*
                       Une erreur Push ne doit PAS empêcher
                       l'utilisateur de se déconnecter.
                    */

                    console.error(
                        "Erreur retrait abonnement Push :",
                        pushLogoutError
                    );

                }
                else{

                    console.log(
                        "Appareil Push retiré du compte."
                    );

                }

            }

        }

    }
    catch(error){

        /*
           Même principe :
           un problème Push ne bloque jamais la déconnexion.
        */

        console.error(
            "Erreur nettoyage Push déconnexion :",
            error
        );

    }


    /* ========================================================
       2. DECONNEXION SUPABASE
    ======================================================== */

    const {
        error
    } =
        await supabaseClient
            .auth
            .signOut();


    if(error){

        console.error(
            "Erreur déconnexion :",
            error
        );

        return;

    }


    /* ========================================================
       3. ARRET DU CANAL REALTIME DES NOTIFICATIONS
    ======================================================== */

    if(notificationsChannel){

        await supabaseClient
            .removeChannel(
                notificationsChannel
            );


        notificationsChannel =
            null;

    }


    /* ========================================================
       4. REINITIALISATION DE L'INTERFACE
    ======================================================== */

    resetUserInterface();


    currentUser =
        null;


    currentEmployee =
        null;


    /* ========================================================
       5. RETOUR A LA CONNEXION
    ======================================================== */

    showLoginScreen();

}

   /* ============================================================
   NETTOYAGE INTERFACE UTILISATEUR
============================================================ */

function resetUserInterface(){

    /*
       Ferme toutes les modales encore ouvertes.
    */

    document
        .querySelectorAll(
            ".overlay"
        )
        .forEach(
            modal => {

                modal.style.display =
                    "none";

            }
        );


    /*
       Ferme le panneau notifications
       s'il est encore ouvert.
    */

    const notificationPanel =
        document.getElementById(
            "notificationPanel"
        );


    if(notificationPanel){

        notificationPanel.remove();

    }


    /*
       Supprime un éventuel toast.
    */

    const notificationToast =
        document.getElementById(
            "notificationToast"
        );


    if(notificationToast){

        notificationToast.remove();

    }

}