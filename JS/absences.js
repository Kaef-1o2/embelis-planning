/* ============================================================
   EMBELIS PLANNING
   MODULE ABSENCES ET CONGES

   Gestion :
   - chargement des absences et congés
   - signalement d'une absence par un employé
   - ouverture de la modale de signalement
   - validation des informations saisies
   - enregistrement de l'absence dans Supabase
   - prise en compte automatique par l'administrateur
   - validation et refus des absences
   - déclenchement des notifications Push
   - affichage du détail d'une indisponibilité
   - programmation des congés par l'administrateur
   - annulation des congés programmés par l'administrateur

   A venir :
   - affichage des indisponibilités dans le planning
============================================================ */


/* ============================================================
   CHARGEMENT DES ABSENCES ET CONGES
   Recharge toutes les indisponibilités visibles depuis Supabase.
============================================================ */

async function loadEmployeeUnavailability(){

    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                "employee_unavailability"
            )
            .select(`
                id,
                employee_id,
                type,
                start_date,
                end_date,
                reason,
                source,
                status,
                created_by,
                acknowledged_at,
                acknowledged_by,
                validated_at,
                validated_by,
                created_at,
                updated_at
            `)
            .order(
                "start_date",
                {
                    ascending:false
                }
            );


    if(error){

        console.error(
            "Erreur chargement absences :",
            error
        );

        employeeUnavailability =
            [];

        return;

    }


    employeeUnavailability =
        data || [];

}


/* ============================================================
   LIBELLE DU TYPE D'ABSENCE
   Transforme le code enregistré en base en texte lisible.
============================================================ */

function getAbsenceTypeLabel(
    type
){

    const labels = {

        absence:
            "Absence",

        conge:
            "Congé",

        maladie:
            "Maladie",

        indisponibilite:
            "Indisponibilité",

        autre:
            "Autre"

    };


    return (
        labels[type] ||
        "Indisponibilité"
    );

}


/* ============================================================
   LIBELLE DU STATUT
   Transforme le statut Supabase en texte destiné à l'interface.
============================================================ */

function getAbsenceStatusLabel(
    status
){

    const labels = {

        reported:
            "Signalée",

        acknowledged:
            "Prise en compte",

        approved:
            "Validée",

        rejected:
            "Refusée",

        cancelled:
            "Annulée"

    };


    return (
        labels[status] ||
        status
    );

}


/* ============================================================
   OUVERTURE DE LA MODALE DE SIGNALEMENT
   Prépare le formulaire puis ouvre la modale d'absence.
============================================================ */

function openAbsenceModal(){

    const startDate =
        document.getElementById(
            "absenceStartDate"
        );

    const endDate =
        document.getElementById(
            "absenceEndDate"
        );

    const type =
        document.getElementById(
            "absenceType"
        );

    const reason =
        document.getElementById(
            "absenceReason"
        );


    if(startDate)
        startDate.value = "";


    if(endDate)
        endDate.value = "";


    if(type)
        type.value = "absence";


    if(reason)
        reason.value = "";


    openModal(
        "absenceModal"
    );

}


/* ============================================================
   SIGNALEMENT D'UNE ABSENCE
   Vérifie le formulaire, appelle la RPC submit_absence puis
   déclenche le Push correspondant à la notification créée.
============================================================ */

async function submitAbsence(){

    const startDate =
        document.getElementById(
            "absenceStartDate"
        )?.value;

    const endDate =
        document.getElementById(
            "absenceEndDate"
        )?.value;

    const type =
        document.getElementById(
            "absenceType"
        )?.value;

    const reason =
        document.getElementById(
            "absenceReason"
        )?.value
        .trim();


    /*
       Vérification des dates obligatoires.
    */

    if(
        !startDate ||
        !endDate
    ){

        alert(
            "Veuillez renseigner la date de début et la date de fin."
        );

        return;

    }


    /*
       La date de fin ne peut pas être
       antérieure à la date de début.
    */

    if(
        endDate <
        startDate
    ){

        alert(
            "La date de fin ne peut pas être antérieure à la date de début."
        );

        return;

    }


    /*
       Vérification du type autorisé
       pour un signalement employé.
    */

    const allowedTypes = [
        "absence",
        "maladie",
        "indisponibilite",
        "autre"
    ];


    if(
        !allowedTypes.includes(
            type
        )
    ){

        alert(
            "Type d'absence invalide."
        );

        return;

    }


    /*
       Appel de la RPC sécurisée.

       La RPC détermine elle-même l'employé
       à partir du compte connecté.
    */

    const {
        data:
            notificationId,
        error
    } =
        await supabaseClient.rpc(
            "submit_absence",
            {
                p_start_date:
                    startDate,

                p_end_date:
                    endDate,

                p_type:
                    type,

                p_reason:
                    reason || null
            }
        );


    if(error){

        console.error(
            "Erreur signalement absence :",
            error
        );

        alert(
            "Impossible de signaler l'absence."
        );

        return;

    }


    /*
       La notification interne a été créée
       par le trigger SQL.

       La RPC retourne son ID pour permettre
       l'envoi de la notification Push.
    */

    if(notificationId){

        await sendAbsencePush(
            notificationId
        );

    }


    closeModal(
        "absenceModal"
    );


    await loadEmployeeUnavailability();


    alert(
        "Votre absence a bien été signalée."
    );

}


/* ============================================================
   ENVOI PUSH ABSENCE

   Déclenche l'Edge Function générique de notification Push
   avec la session authentifiée de l'utilisateur connecté.
============================================================ */

async function sendAbsencePush(
    notificationId
){

    const {
        data:
            sessionData
    } =
        await supabaseClient
            .auth
            .getSession();


    const accessToken =
        sessionData
            ?.session
            ?.access_token;



    try{

        const {
            data:
                pushData,

            error:
                pushError
        } =
            await supabaseClient
                .functions
                .invoke(
                    "send-notification-push",
                    {

                        body:{
                            notification_id:
                                notificationId
                        },

                        headers:
                            accessToken
                            ? {
                                Authorization:
                                    `Bearer ${accessToken}`
                            }
                            : {}

                    }
                );


        /*
           Supabase retourne l'erreur HTTP ici.
        */

        if(pushError){

            console.error(
                "Erreur Push absence :",
                pushError
            );


            if(
                pushError.context
            ){

                console.log(
                    "Statut HTTP Push absence :",
                    pushError
                        .context
                        .status
                );


                try{

                    const responseBody =
                        await pushError
                            .context
                            .clone()
                            .json();


                    console.log(
                        "Réponse Edge Function :",
                        responseBody
                    );

                }
                catch(responseError){

                    console.log(
                        "Impossible de lire la réponse Edge Function :",
                        responseError
                    );

                }

            }


            return;

        }


        /*
           Diagnostic en cas de succès.
        */

        console.log(
            "Push absence envoyé :",
            pushData
        );

    }
    catch(error){

        console.error(
            "Erreur inattendue Push absence :",
            error
        );

    }

}

/* ============================================================
   OUVERTURE DE LA PROGRAMMATION D'UN CONGE
   Permet à l'administrateur de programmer directement
   un congé depuis la fiche d'un employé.
============================================================ */

function openEmployeeLeaveModal(){

    /*
       Cette fonction est réservée
       à l'administrateur.
    */

    if(!isAdmin()){

        alert(
            "Cette action est réservée à l'administrateur."
        );

        return;

    }


    /*
       La fiche employé actuellement ouverte
       détermine le salarié concerné.
    */

    if(
        editingEmployeeId === null
    ){

        alert(
            "Aucun employé sélectionné."
        );

        return;

    }


    const employee =
        employees.find(
            item =>
                Number(item.id) ===
                Number(editingEmployeeId)
        );


    if(!employee){

        alert(
            "Employé introuvable."
        );

        return;

    }


    const employeeName =
        document.getElementById(
            "employeeLeaveName"
        );


    const startDate =
        document.getElementById(
            "employeeLeaveStartDate"
        );


    const endDate =
        document.getElementById(
            "employeeLeaveEndDate"
        );


    const reason =
        document.getElementById(
            "employeeLeaveReason"
        );


    if(employeeName){

        employeeName.textContent =
            employee.name;

    }


    if(startDate){

        startDate.value =
            "";

    }


    if(endDate){

        endDate.value =
            "";

    }


    if(reason){

        reason.value =
            "";

    }


    openModal(
        "employeeLeaveModal"
    );

}


/* ============================================================
   PROGRAMMATION D'UN CONGE
   Enregistre directement un congé validé pour l'employé
   sélectionné grâce à la RPC sécurisée Supabase.
============================================================ */

async function scheduleEmployeeLeave(){

    if(!isAdmin()){

        alert(
            "Cette action est réservée à l'administrateur."
        );

        return;

    }


    if(
        editingEmployeeId === null
    ){

        alert(
            "Aucun employé sélectionné."
        );

        return;

    }


    const startDate =
        document.getElementById(
            "employeeLeaveStartDate"
        )?.value;


    const endDate =
        document.getElementById(
            "employeeLeaveEndDate"
        )?.value;


    const reason =
        document.getElementById(
            "employeeLeaveReason"
        )?.value
        .trim();


    /*
       Les deux dates sont obligatoires.
    */

    if(
        !startDate ||
        !endDate
    ){

        alert(
            "Veuillez renseigner la date de début et la date de fin."
        );

        return;

    }


    /*
       Vérification de la cohérence
       de la période.
    */

    if(
        endDate <
        startDate
    ){

        alert(
            "La date de fin ne peut pas être antérieure à la date de début."
        );

        return;

    }


    const employeeId =
        Number(
            editingEmployeeId
        );


    /*
       Appel de la RPC administrateur.

       Le congé est directement créé
       avec le statut approved.
    */

    const {
        data:
            unavailabilityId,
        error
    } =
        await supabaseClient.rpc(
            "schedule_employee_leave",
            {
                p_employee_id:
                    employeeId,

                p_start_date:
                    startDate,

                p_end_date:
                    endDate,

                p_reason:
                    reason || null
            }
        );


    if(error){

        console.error(
            "Erreur programmation congé :",
            error
        );


        alert(
            "Impossible de programmer ce congé."
        );

        return;

    }


    /*
       Recharge les données immédiatement afin
       que la fiche et la liste soient à jour.
    */

    await loadEmployeeUnavailability();


    closeModal(
        "employeeLeaveModal"
    );


    /*
       Actualisation de la fiche employé
       actuellement ouverte.
    */

    renderEmployeeProfileData(
        employeeId
    );


    /*
       Actualisation de la liste des employés.

       Cela permet notamment d'afficher
       automatiquement un congé proche.
    */

    renderEmployees();


    alert(
        "Le congé a bien été programmé."
    );

}

/* ============================================================
   OUVERTURE D'UNE ABSENCE DEPUIS UNE NOTIFICATION
   Affiche le détail de l'indisponibilité concernée et marque
   automatiquement un signalement comme pris en compte
   lorsqu'un administrateur l'ouvre.
============================================================ */

async function openAbsenceNotification(
    unavailabilityId
){

    const absenceId =
        Number(
            unavailabilityId
        );


    let absence =
        employeeUnavailability.find(
            item =>
                Number(item.id) ===
                absenceId
        );


    /*
       Sécurité :
       si les données locales ne contiennent pas
       encore l'absence, on recharge Supabase.
    */

    if(!absence){

        await loadEmployeeUnavailability();


        absence =
            employeeUnavailability.find(
                item =>
                    Number(item.id) ===
                    absenceId
            );

    }


    if(!absence){

        alert(
            "Cette absence est introuvable."
        );

        return;

    }


    /*
       Lorsqu'un administrateur ouvre pour la première
       fois un signalement employé, il passe
       automatiquement de Signalée à Prise en compte.

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
       Récupération du salarié depuis
       la liste déjà chargée dans l'application.
    */

    const employee =
        employees.find(
            item =>
                Number(item.id) ===
                Number(absence.employee_id)
        );


    const employeeName =
        employee?.name ||
        "Employé";


    const modal =
        document.getElementById(
            "absenceReviewModal"
        );


    if(!modal)
        return;


    /*
       L'identifiant est conservé directement
       sur la modale pour les boutons Valider / Refuser.
    */

    modal.dataset.absenceId =
        absence.id;


    const employeeElement =
        document.getElementById(
            "absenceReviewEmployee"
        );


    const typeElement =
        document.getElementById(
            "absenceReviewType"
        );


    const datesElement =
        document.getElementById(
            "absenceReviewDates"
        );


    const reasonElement =
        document.getElementById(
            "absenceReviewReason"
        );


    const statusElement =
        document.getElementById(
            "absenceReviewStatus"
        );


    const actionsElement =
        document.getElementById(
            "absenceReviewActions"
        );


    if(employeeElement){

        employeeElement.textContent =
            employeeName;

    }


    if(typeElement){

        typeElement.textContent =
            getAbsenceTypeLabel(
                absence.type
            );

    }


    if(datesElement){

        const start =
    formatFrenchDate(
        absence.start_date
    );


const end =
    formatFrenchDate(
        absence.end_date
    );


        datesElement.textContent =
            absence.start_date ===
                absence.end_date
            ? start
            : `${start} au ${end}`;

    }


    if(reasonElement){

        reasonElement.textContent =
            absence.reason ||
            "Aucun motif renseigné";

    }


    if(statusElement){

        statusElement.textContent =
            getAbsenceStatusLabel(
                absence.status
            );

    }


    /*
       Seul l'administrateur peut afficher
       les actions Valider / Refuser.

       Les boutons restent également disponibles
       sur une absence déjà validée ou refusée afin
       de permettre une correction ultérieure.
    */

    if(actionsElement){

        const canReview =
            isAdmin() &&
            absence.source ===
                "employee" &&
            absence.status !==
                "cancelled";


        actionsElement.style.display =
            canReview
            ? ""
            : "none";

    }


    openModal(
        "absenceReviewModal"
    );

}


/* ============================================================
   TRAITEMENT D'UNE ABSENCE
   Valide ou refuse le signalement ouvert puis déclenche la
   notification Push destinée à l'employé.
============================================================ */

async function reviewAbsence(
    status
){

    if(
        status !== "approved" &&
        status !== "rejected"
    ){

        return;

    }


    const modal =
        document.getElementById(
            "absenceReviewModal"
        );


    const absenceId =
        Number(
            modal?.dataset?.absenceId
        );


    if(!absenceId){

        alert(
            "Absence introuvable."
        );

        return;

    }


    const {
        data:
            notificationId,
        error
    } =
        await supabaseClient.rpc(
            "review_absence",
            {
                p_unavailability_id:
                    absenceId,

                p_status:
                    status
            }
        );


    if(error){

        console.error(
            "Erreur traitement absence :",
            error
        );


        alert(
            status === "approved"
            ? "Impossible de valider cette absence."
            : "Impossible de refuser cette absence."
        );

        return;

    }


    /*
       Pour approved / rejected, le trigger SQL
       crée une notification destinée à l'employé.

       La RPC retourne son identifiant.
    */

    if(notificationId){

        await sendAbsencePush(
            notificationId
        );

    }


    await loadEmployeeUnavailability();


    closeModal(
        "absenceReviewModal"
    );


    alert(
        status === "approved"
        ? "L'absence a été validée."
        : "L'absence a été refusée."
    );

}

/* ============================================================
   ANNULATION D'UN CONGE PROGRAMME

   Permet à l'administrateur d'annuler un congé existant
   sans supprimer son historique.

   Le congé passe simplement au statut "cancelled".
============================================================ */

async function cancelEmployeeLeave(
    unavailabilityId
){

    if(!isAdmin()){

        alert(
            "Cette action est réservée à l'administrateur."
        );

        return;

    }


    const leave =
        employeeUnavailability.find(
            item =>
                Number(item.id) ===
                Number(unavailabilityId)
        );


    if(!leave){

        alert(
            "Congé introuvable."
        );

        return;

    }


    const confirmed =
        confirm(
            "Annuler ce congé ?\n\n" +
            formatFrenchDate(
                leave.start_date
            ) +
            (
                leave.start_date !==
                leave.end_date
                ?
                " → " +
                formatFrenchDate(
                    leave.end_date
                )
                :
                ""
            ) +
            "\n\n" +
            "Le congé restera visible dans l'historique."
        );


    if(!confirmed)
        return;


    const {
        error
    } =
        await supabaseClient.rpc(
            "cancel_employee_leave",
            {
                p_unavailability_id:
                    Number(
                        unavailabilityId
                    )
            }
        );


    if(error){

        console.error(
            "Erreur annulation congé :",
            error
        );


        alert(
            "Impossible d'annuler ce congé."
        );

        return;

    }


    await loadEmployeeUnavailability();


    renderEmployeeProfileData(
        editingEmployeeId
    );


    renderEmployees();


    alert(
        "Le congé a bien été annulé."
    );

}