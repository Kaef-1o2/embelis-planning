/* ============================================================
   EMBELIS PLANNING
   MODULE INTERFACE UTILISATEUR

   Gestion :
   - ouverture et fermeture des modales
   - navigation Retour sur mobile
   - affichage de l'utilisateur connecté
   - profil utilisateur
   - affichage des actions du profil selon le rôle
   - affichage des absences de l'utilisateur connecté dans son profil
============================================================ */

/* ============================================================
   OUVERTURE MODALE + HISTORIQUE MOBILE
============================================================ */

function openModal(id){

    const modal =
        document.getElementById(
            id
        );


    if(!modal)
        return;


    modal.style.display =
        "flex";


    /*
       Sur mobile, on ajoute une étape
       dans l'historique.

       Le bouton Retour du téléphone
       pourra ainsi fermer la modale
       au lieu de quitter Embelis.
    */

    if(
        window.innerWidth <= 768 &&
        history.state?.embelisModal !== id
    ){

        history.pushState(
            {
                embelisModal:
                    id
            },
            "",
            window.location.href
        );

    }

}

/* ============================================================
   MODALES
============================================================ */

function closeModal(id){

    /*
       Pendant une invitation,
       le choix du mot de passe est obligatoire.
    */

    if(
        id === "passwordModal" &&
        invitePasswordRequired
    ){

        alert(
            "Vous devez choisir votre mot de passe pour terminer l'activation de votre compte."
        );

        return;

    }


    /*
       Quand la modale mot de passe se ferme,
       on désactive les champs pour éviter que
       Chrome les interprète en arrière-plan.
    */

    if(
        id === "passwordModal"
    ){

        document.getElementById(
            "newPassword"
        ).disabled =
            true;


        document.getElementById(
            "confirmPassword"
        ).disabled =
            true;

    }


    const modal =
        document.getElementById(
            id
        );


    if(modal){

    /*
       Si on ferme la modale mot de passe,
       on désactive ses champs.
    */

    if(
        id === "passwordModal"
    ){

        document.getElementById(
            "newPassword"
        ).disabled =
            true;


        document.getElementById(
            "confirmPassword"
        ).disabled =
            true;

    }


    modal.style.display =
        "none";

}

}

/* ============================================================
   RETOUR TELEPHONE - NAVIGATION EMBELIS
============================================================ */

window.addEventListener(
    "popstate",
    function(){

        /*
           1 - Si une modale est ouverte :
           on la ferme d'abord.
        */

        const openModalElement =
            Array.from(
                document.querySelectorAll(
                    ".overlay"
                )
            )
            .find(
                modal =>
                    getComputedStyle(
                        modal
                    ).display !== "none"
            );


        if(openModalElement){

            /*
               Invitation :
               mot de passe obligatoire.
            */

            if(
                openModalElement.id ===
                    "passwordModal" &&
                invitePasswordRequired
            ){

                history.pushState(
                    {
                        embelisModal:
                            "passwordModal"
                    },
                    "",
                    window.location.href
                );

                return;

            }


            openModalElement.style.display =
                "none";

            return;

        }


        /*
           2 - Si on n'est pas sur Planning :
           Retour = Planning.
        */

        if(
            currentPage !==
            "planning"
        ){

            currentPage =
                "planning";


            localStorage.setItem(
                "embelis_current_page",
                currentPage
            );


            const planningButton =
                document.querySelector(
                    '.menu-button[data-page="planning"]'
                );


            if(planningButton){

                planningButton.click();

            }


            /*
               On recrée une étape d'historique
               pour rester dans Embelis.
            */

            history.pushState(
                {
                    embelisPage:
                        "planning"
                },
                "",
                window.location.href
            );


            return;

        }


        /*
           3 - Déjà sur Planning :
           le navigateur peut gérer
           le retour normalement.
        */

    }
);

/* ============================================================
   UTILISATEUR CONNECTÉ - SIDEBAR
============================================================ */

function renderCurrentUserSidebar(){

    if(!currentEmployee)
        return;


    const nameElement =
        document.getElementById(
            "sidebarUserName"
        );


    const roleElement =
        document.getElementById(
            "sidebarUserRole"
        );


    const avatarElement =
        document.getElementById(
            "sidebarUserAvatar"
        );
   
    const mobileAvatar =
    document.getElementById(
        "mobileUserAvatar"
    );


if(mobileAvatar){

    const words =
        (
            currentEmployee.name ||
            "Utilisateur"
        )
        .trim()
        .split(/\s+/);


    mobileAvatar.textContent =
        words
            .slice(0,2)
            .map(
                word =>
                    word.charAt(0)
                    .toUpperCase()
            )
            .join("");

}

    if(nameElement){

        nameElement.textContent =
            currentEmployee.name ||
            "Utilisateur";

    }


    if(roleElement){

        roleElement.textContent =
            currentEmployee.role ||
            (
                currentEmployee.app_role === "admin"
                ? "Administrateur"
                : "Employé"
            );

    }


    if(avatarElement){

        const words =
            (
                currentEmployee.name ||
                "Utilisateur"
            )
            .trim()
            .split(/\s+/);


        avatarElement.textContent =
            words
                .slice(0,2)
                .map(
                    word =>
                        word.charAt(0)
                        .toUpperCase()
                )
                .join("");

    }

}

   function openUserProfile(){

    /*
       À chaque ouverture du profil,
       la liste revient à sa version compacte.
    */

    profileAbsencesExpanded =
        false;


    renderUserProfile();


    openModal(
        "profileModal"
    );

}

      function openPasswordFromProfile(){

    closeModal(
        "profileModal"
    );


    openPasswordModal();

}

/* ============================================================
   ETAT D'AFFICHAGE DES ABSENCES DU PROFIL
============================================================ */

let profileAbsencesExpanded =
    false;

/* ============================================================
   ABSENCES DU PROFIL UTILISATEUR

   Affiche les absences signalées par l'employé connecté
   avec un statut compréhensible.

   L'employé peut uniquement consulter ses absences.
   L'annulation reste réservée au responsable.
============================================================ */

function renderProfileAbsences(){

    const container =
        document.getElementById(
            "profileAbsenceList"
        );


    if(!container)
        return;


    if(
        !currentEmployee ||
        currentEmployee.app_role !== "employee"
    ){

        container.innerHTML = "";

        return;

    }


    const today =
        getTodayDateString();


    const absences =
        employeeUnavailability
        .filter(
            absence =>
                Number(absence.employee_id) ===
                    Number(currentEmployee.id) &&

                absence.source === "employee" &&

                absence.type !== "conge"
        )
        .sort(
            (a,b) =>
                String(b.start_date)
                .localeCompare(
                    String(a.start_date)
                )
        );


    if(absences.length === 0){

        container.innerHTML = `
            <div class="profile-absence-empty">
                Aucune absence signalée.
            </div>
        `;

        return;

    }


    /*
       Les absences en cours ou futures sont prioritaires.

       On conserve également les deux dernières absences
       terminées pour donner un historique rapide.
    */

    const activeAbsences =
        absences.filter(
            absence =>
                absence.end_date >= today &&
                absence.status !== "cancelled"
        );


    const pastAbsences =
    absences
    .filter(
        absence =>
            absence.end_date < today ||
            absence.status === "cancelled"
    );


/*
   Les absences actuelles et futures restent prioritaires,
   puis viennent les anciennes.
*/

const orderedAbsences = [
    ...activeAbsences,
    ...pastAbsences
];


/*
   Le profil affiche seulement 3 éléments
   tant que l'utilisateur n'a pas demandé
   à voir toute la liste.
*/

const visibleAbsences =
    profileAbsencesExpanded
    ? orderedAbsences
    : orderedAbsences.slice(
        0,
        3
    );


    container.innerHTML =
        visibleAbsences
        .map(
            absence => {

                let statusLabel =
                    "Statut inconnu";


                let statusClass =
                    "";


                if(
                    absence.status ===
                    "reported"
                ){

                    statusLabel =
                        "🟡 Signalée — en attente de consultation";

                    statusClass =
                        "reported";

                }


                if(
                    absence.status ===
                    "acknowledged"
                ){

                    statusLabel =
                        "🟠 Prise en compte — en attente de décision";

                    statusClass =
                        "acknowledged";

                }


                if(
                    absence.status ===
                    "approved"
                ){

                    statusLabel =
                        "🟢 Validée";

                    statusClass =
                        "approved";

                }


                if(
                    absence.status ===
                    "rejected"
                ){

                    statusLabel =
                        "🔴 Refusée";

                    statusClass =
                        "rejected";

                }


                if(
                    absence.status ===
                    "cancelled"
                ){

                    statusLabel =
                        "⚫ Annulée";

                    statusClass =
                        "cancelled";

                }


                const startDate =
    formatFrenchDate(
        absence.start_date
    );


const endDate =
    formatFrenchDate(
        absence.end_date
    );


                const dates =
                    absence.start_date ===
                    absence.end_date

                    ? startDate

                    : `${startDate} → ${endDate}`;


                const reason =
                    absence.reason
                    ? `
                        <div class="profile-absence-reason">
                            ${escapeHtml(absence.reason)}
                        </div>
                    `
                    : "";


                return `
                    <div
                        class="
                            profile-absence-card
                            profile-absence-${statusClass}
                        "
                    >

                        <div class="profile-absence-card-top">

                            <strong>
                                ${dates}
                            </strong>

                        </div>


                        <div class="profile-absence-status">
                            ${statusLabel}
                        </div>


                        ${reason}

                    </div>
                `;

            }
        )
        .join("");

        /*
   Bouton Voir plus / Réduire.
*/

if(
    orderedAbsences.length > 3
){

    const hiddenCount =
        orderedAbsences.length - 3;


    container.innerHTML += `

        <button
            type="button"
            class="btn secondary profile-absence-more-button"
            onclick="toggleProfileAbsences()"
        >

            ${
                profileAbsencesExpanded
                ? "Réduire"
                : `Voir plus (${hiddenCount})`
            }

        </button>

    `;

}

}

/* ============================================================
   AFFICHER / REDUIRE LES ABSENCES DU PROFIL
============================================================ */

function toggleProfileAbsences(){

    profileAbsencesExpanded =
        !profileAbsencesExpanded;


    renderProfileAbsences();

}

   /* ============================================================
   PROFIL UTILISATEUR
   Affiche les informations du salarié connecté et adapte
   les actions disponibles selon son rôle.
============================================================ */

function renderUserProfile(){

    if(!currentEmployee)
        return;


    const name =
        currentEmployee.name ||
        "Utilisateur";


    const words =
        name
        .trim()
        .split(/\s+/);


    const initials =
        words
        .slice(0,2)
        .map(
            word =>
                word.charAt(0)
                .toUpperCase()
        )
        .join("");


    document.getElementById(
        "profileAvatar"
    ).textContent =
        initials;


    document.getElementById(
        "profileName"
    ).textContent =
        name;


    document.getElementById(
        "profileRole"
    ).textContent =
        currentEmployee.role ||
        (
            currentEmployee.app_role === "admin"
            ? "Administrateur"
            : "Employé"
        );


    document.getElementById(
        "profileTeam"
    ).textContent =
        currentEmployee.team ||
        "Aucune équipe";


    document.getElementById(
        "profilePhone"
    ).textContent =
        currentEmployee.phone ||
        "Non renseigné";


    document.getElementById(
        "profileStatus"
    ).textContent =
        currentEmployee.active === false
        ? "Inactif"
        : "Actif";


    /*
       Le signalement d'absence est réservé
       aux comptes employés.

       Les administrateurs géreront les congés
       depuis les fiches employés.
    */

    const absenceSection =
    document.getElementById(
        "profileAbsenceSection"
    );


if(absenceSection){

    const isEmployee =
        currentEmployee.app_role ===
        "employee";


    absenceSection.style.display =
        isEmployee
        ? ""
        : "none";


    if(isEmployee){

        renderProfileAbsences();

    }

}

}