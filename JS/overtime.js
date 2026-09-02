/* ============================================================
   EMBELIS PLANNING
   MODULE HEURES SUPPLEMENTAIRES

   Gestion :
   - chargement des demandes d'heures supplémentaires
   - déclaration des heures supplémentaires
   - calcul du temps supplémentaire
   - validation et refus des demandes
   - affichage et suivi des demandes
============================================================ */


/* ============================================================
   CHARGEMENT DES DEMANDES D'HEURES SUPPLEMENTAIRES
============================================================ */

async function loadOvertimeRequests(){

    const { data, error } =
        await supabaseClient
            .from("overtime_requests")
            .select(`
                id,
                employee_id,
                work_date,
                job_id,
                type,
                planned_end_time,
                actual_end_time,
                overtime_minutes,
                reason,
                status,
                created_at,
                updated_at,
                validated_at,
                validated_by,
                employees (
                    id,
                    name,
                    team_id
                ),
                jobs (
                    id,
                    name
                )
            `)
            .order(
                "work_date",
                {
                    ascending: false
                }
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if(error){

        console.error(
            "Erreur chargement demandes heures supplémentaires :",
            error
        );

        return;

    }


    overtimeRequests =
        data || [];

}

/* ============================================================
   HEURES SUPPLEMENTAIRES
============================================================ */

  
function renderOvertime(){

    const container =
        document.getElementById(
            "overtimeGrid"
        );


    if(!container)
        return;


    const admin =
        isAdmin();


    let requests =
        overtimeRequests;


    /*
       Employé :
       uniquement ses propres demandes.
    */

    if(!admin){

        requests =
            requests.filter(
                request =>
                    request.employee_id ===
                    currentEmployee.id
            );

    }


    if(!requests.length){

        container.innerHTML = `

            <div class="empty-state">

                Aucune demande d'heure supplémentaire.

            </div>

        `;

        return;

    }


    container.innerHTML =

        requests
        .map(
            request => {

                const employee =
                    request.employees;


                const job =
                    request.jobs;
               
                const displayDate =
                   request.work_date
                    ? request.work_date
                     .split("-")
                     .reverse()
                     .join("/")
                      : "";

                const hours =
                    Math.floor(
                        request.overtime_minutes /
                        60
                    );


                const minutes =
                    request.overtime_minutes %
                    60;


                const duration =
                    hours +
                    "h" +
                    String(minutes)
                        .padStart(
                            2,
                            "0"
                        );


                let typeLabel =
                    "Autre";


                if(
                    request.type ===
                    "job"
                ){

                    typeLabel =
                        "Chantier";

                }
                else if(
                    request.type ===
                    "maintenance"
                ){

                    typeLabel =
                        "Entretien / travaux";

                }


                let statusLabel =
                    "En attente";


                let statusClass =
                    "pending";


                if(
                    request.status ===
                    "approved"
                ){

                    statusLabel =
                        "Validée";

                    statusClass =
                        "accepted";

                }
                else if(
                    request.status ===
                    "rejected"
                ){

                    statusLabel =
                        "Refusée";

                    statusClass =
                        "refused";

                }
                else if(
                    request.status ===
                    "cancelled"
                ){

                    statusLabel =
                        "Annulée";

                    statusClass =
                        "cancelled";

                }


                return `

                    <div
                        class="overtime-card"
                    >

                        <div class="overtime-card-header">

                            <div>

                                <b>
                                    ${
                                        escapeHtml(
                                            employee
                                            ?.name ||
                                            "Employé"
                                        )
                                    }
                                </b>

                                <div class="small">

    ${displayDate}

</div>

                            </div>


                            <span
                                class="status ${statusClass}"
                            >

                                ${statusLabel}

                            </span>

                        </div>


                        <div class="overtime-main">

                            <strong>
                                +${duration}
                            </strong>

                            <span>
                                ${typeLabel}
                            </span>

                        </div>


                        ${
                            job
                            ?
                            `
                            <div class="small">

                                Chantier :
                                <b>
                                    ${
                                        escapeHtml(
                                            job.name
                                        )
                                    }
                                </b>

                            </div>
                            `
                            :
                            ""
                        }


                        <div class="small">

                            Fin prévue :
                            ${request.planned_end_time}

                            <br>

                            Fin réelle :
                            ${request.actual_end_time}

                        </div>


                        ${
                            request.reason
                            ?
                            `
                            <div class="overtime-reason">

                                ${escapeHtml(
                                    request.reason
                                )}

                            </div>
                            `
                            :
                            ""
                        }


                        ${
                            admin &&
                            request.status ===
                            "pending"
                            ?
                            `

                            <div
                                class="overtime-actions"
                            >

                                <button
                                    class="small-btn accept"
                                    onclick="
                                        approveOvertime(
                                            ${request.id}
                                        )
                                    "
                                >

                                    Valider

                                </button>


                                <button
                                    class="small-btn refuse"
                                    onclick="
                                        rejectOvertime(
                                            ${request.id}
                                        )
                                    "
                                >

                                    Refuser

                                </button>

                            </div>

                            `
                            :
                            ""
                        }

                    </div>

                `;

            }
        )
        .join("");

}

/* ============================================================
   HEURES SUPPLÉMENTAIRES - NOUVELLE DEMANDE
============================================================ */

function openNewOvertime(){

    if(!currentEmployee){

        alert(
            "Utilisateur non connecté."
        );

        return;

    }


    const dateInput =
        document.getElementById(
            "overtimeDate"
        );


    const typeSelect =
        document.getElementById(
            "overtimeType"
        );


    const actualEnd =
        document.getElementById(
            "overtimeActualEnd"
        );


    const reason =
        document.getElementById(
            "overtimeReason"
        );


    dateInput.value =
        new Date()
            .toISOString()
            .split("T")[0];


    typeSelect.value =
        "job";


    actualEnd.value =
        "";


    reason.value =
        "";


    updateOvertimeForm();


    openModal(
    "overtimeModal"
);

}
   function updateOvertimeForm(){

    const type =
        document.getElementById(
            "overtimeType"
        ).value;


    const jobGroup =
        document.getElementById(
            "overtimeJobGroup"
        );


    const plannedEnd =
        document.getElementById(
            "overtimePlannedEnd"
        );


    if(
        type === "job"
    ){

        jobGroup.style.display =
            "";

        plannedEnd.readOnly =
            true;

        loadOvertimeJobs();

    }
    else{

        jobGroup.style.display =
            "none";

        plannedEnd.readOnly =
            false;

        plannedEnd.value =
            "";

    }


    calculateOvertime();

}

async function loadOvertimeJobs(){

    const date =
        document.getElementById(
            "overtimeDate"
        ).value;


    const select =
        document.getElementById(
            "overtimeJob"
        );


    select.innerHTML = `

        <option value="">
            Sélectionner un chantier
        </option>

    `;


    if(!date)
        return;


    const { data, error } =
        await supabaseClient
            .from("jobs")
            .select(`
                id,
                name,
                time,
                job_date,
                team_id
            `)
            .eq(
                "job_date",
                date
            )
            .order(
                "time"
            );


    if(error){

        console.error(
            "Erreur chargement chantiers :",
            error
        );

        return;

    }


    (data || []).forEach(
        job => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                job.id;


            option.textContent =
                job.name +
                " — " +
                job.time;


            option.dataset.time =
                job.time || "";


            select.appendChild(
                option
            );

        }
    );

}

 /* ============================================================
   CALCUL DES HEURES SUPPLEMENTAIRES
============================================================ */

function calculateOvertime(){

    const plannedEnd =
        document.getElementById(
            "overtimePlannedEnd"
        ).value;


    const actualEnd =
        document.getElementById(
            "overtimeActualEnd"
        ).value;


    const box =
        document.getElementById(
            "overtimeCalculation"
        );


    if(
        !actualEnd
    ){

        box.textContent =
            "+0h00";

        return;

    }


    /*
       Pour les tâches sans chantier,
       il n'y a pas d'heure prévue.
    */

    if(
        !plannedEnd
    ){

        box.textContent =
            "Fin réelle : " +
            actualEnd;

        return;

    }


    const [
        plannedHour,
        plannedMinute
    ] =
        plannedEnd
            .split(":")
            .map(Number);


    const [
        actualHour,
        actualMinute
    ] =
        actualEnd
            .split(":")
            .map(Number);


    const planned =
        plannedHour * 60 +
        plannedMinute;


    const actual =
        actualHour * 60 +
        actualMinute;


    const overtime =
        actual - planned;


    if(
        overtime <= 0
    ){

        box.textContent =
            "+0h00";

        return;

    }


    const hours =
        Math.floor(
            overtime / 60
        );


    const minutes =
        overtime % 60;


    box.textContent =
        "+" +
        hours +
        "h" +
        String(minutes)
            .padStart(2,"0");

}

   /* ============================================================
   HEURE DE FIN PREVUE DU CHANTIER
============================================================ */

function updateOvertimePlannedEnd(){

    const select =
        document.getElementById(
            "overtimeJob"
        );


    const option =
        select.options[
            select.selectedIndex
        ];


    const plannedEnd =
        document.getElementById(
            "overtimePlannedEnd"
        );


    if(
        !option ||
        !option.value
    ){

        plannedEnd.value =
            "";

        calculateOvertime();

        return;

    }


    const time =
        option.dataset.time ||
        "";


    /*
       Exemple :
       6h30–14h30

       On récupère uniquement
       l'heure de fin.
    */

    const match =
        time.match(
            /[–-]\s*(\d{1,2})h(\d{2})/
        );


    if(!match){

        plannedEnd.value =
            "";

        console.warn(
            "Impossible de déterminer l'heure de fin :",
            time
        );

        calculateOvertime();

        return;

    }


    const hour =
        String(
            Number(match[1])
        ).padStart(
            2,
            "0"
        );


    const minute =
        match[2];


    plannedEnd.value =
        hour +
        ":" +
        minute;


    calculateOvertime();

}

   /* ============================================================
   ENVOI DEMANDE HEURES SUPPLEMENTAIRES
============================================================ */

async function submitOvertimeRequest(){

    function timeToMinutes(time){

        if(!time)
            return 0;

        const parts =
            time.split(":");

        const hours =
            Number(parts[0]);

        const minutes =
            Number(parts[1]);

        return (
            hours * 60 +
            minutes
        );

    }


    if(!currentEmployee){

        alert(
            "Utilisateur non connecté."
        );

        return;

    }


    const date =
        document.getElementById(
            "overtimeDate"
        ).value;


    const type =
        document.getElementById(
            "overtimeType"
        ).value;


    const jobSelect =
        document.getElementById(
            "overtimeJob"
        );


    const plannedEnd =
        document.getElementById(
            "overtimePlannedEnd"
        ).value;


    const actualEnd =
        document.getElementById(
            "overtimeActualEnd"
        ).value;


    const reason =
        document.getElementById(
            "overtimeReason"
        ).value
        .trim();


    const jobId =
        type === "job" &&
        jobSelect.value
        ?
        Number(jobSelect.value)
        :
        null;


    if(!date){

        alert(
            "Merci de sélectionner une date."
        );

        return;

    }


    if(!plannedEnd){

        alert(
            "Merci de renseigner l'heure de fin prévue."
        );

        return;

    }


    if(!actualEnd){

        alert(
            "Merci de renseigner l'heure de fin réelle."
        );

        return;

    }


    const plannedMinutes =
        timeToMinutes(
            plannedEnd
        );


    const actualMinutes =
        timeToMinutes(
            actualEnd
        );


    if(
        actualMinutes <= plannedMinutes
    ){

        alert(
            "L'heure de fin réelle doit être supérieure à l'heure de fin prévue."
        );

        return;

    }


    const overtimeMinutes =
        actualMinutes -
        plannedMinutes;


    /* ========================================================
       CREATION DE LA DEMANDE COTE SERVEUR
    ======================================================== */

    const {
        data:
            notificationId,
        error
    } =
        await supabaseClient
            .rpc(
                "submit_overtime_request",
                {

                    p_work_date:
                        date,

                    p_job_id:
                        jobId,

                    p_type:
                        type,

                    p_planned_end_time:
                        plannedEnd,

                    p_actual_end_time:
                        actualEnd,

                    p_overtime_minutes:
                        overtimeMinutes,

                    p_reason:
                        reason || null

                }
            );


    /* ========================================================
       ERREUR CREATION DEMANDE
    ======================================================== */

    if(error){

        console.error(
            "Erreur création demande heures supplémentaires :",
            error
        );


        alert(
            "Erreur lors de l'envoi de la demande.\n\n" +
            error.message
        );

        return;

    }


    console.log(
        "Demande heures sup créée. Notification ID :",
        notificationId
    );


    /* ========================================================
       PUSH VERS LE RESPONSABLE
    ======================================================== */

    if(notificationId){

        const {
            data:
                pushResult,
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
                        }

                    }
                );


        /*
           Une erreur Push ne doit jamais empêcher
           l'enregistrement de la demande.
        */

        if(pushError){

            console.error(
                "Erreur Push nouvelle demande heures sup :",
                pushError
            );

        }
        else{

            console.log(
                "Push nouvelle demande heures sup :",
                pushResult
            );

        }

    }
    else{

        console.warn(
            "Aucun notificationId retourné : Push non envoyé."
        );

    }


    /* ========================================================
       CONFIRMATION
    ======================================================== */

    alert(
        "Votre demande d'heures supplémentaires a bien été envoyée."
    );


    closeModal(
        "overtimeModal"
    );


    await loadOvertimeRequests();

    renderOvertime();

}

/* ============================================================
   VALIDATION DES HEURES SUPPLEMENTAIRES
============================================================ */

async function approveOvertime(
    requestId
){

    if(!isAdmin()){

        alert(
            "Vous n'avez pas les permissions pour valider cette demande."
        );

        return;

    }


    const confirmed =
        confirm(
            "Valider cette demande d'heures supplémentaires ?"
        );


    if(!confirmed)
        return;


    /* ========================================================
       VALIDATION SERVEUR
    ======================================================== */

    const {
        data:
            notificationId,
        error
    } =
        await supabaseClient
            .rpc(
                "review_overtime_request",
                {

                    p_request_id:
                        requestId,

                    p_status:
                        "approved"

                }
            );


    if(error){

        console.error(
            "Erreur validation heures supplémentaires :",
            error
        );

        alert(
            "Erreur lors de la validation.\n\n" +
            error.message
        );

        return;

    }


    /* ========================================================
       PUSH MOBILE
    ======================================================== */

    if(notificationId){

        const {
            data:
                pushResult,
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
                        }

                    }
                );


        if(pushError){

            /*
               Une erreur Push ne doit PAS annuler
               la validation des heures supplémentaires.
            */

            console.error(
                "Erreur Push heures sup :",
                pushError
            );

        }
        else{

            console.log(
                "Push heures sup :",
                pushResult
            );

        }

    }


    /* ========================================================
       ACTUALISATION
    ======================================================== */

    await loadOvertimeRequests();

    renderOvertime();

}


/* ============================================================
   REFUS DES HEURES SUPPLEMENTAIRES
============================================================ */

async function rejectOvertime(
    requestId
){

    if(!isAdmin()){

        alert(
            "Vous n'avez pas les permissions pour refuser cette demande."
        );

        return;

    }


    const confirmed =
        confirm(
            "Refuser cette demande d'heures supplémentaires ?"
        );


    if(!confirmed)
        return;


    /* ========================================================
       REFUS SERVEUR
    ======================================================== */

    const {
        data:
            notificationId,
        error
    } =
        await supabaseClient
            .rpc(
                "review_overtime_request",
                {

                    p_request_id:
                        requestId,

                    p_status:
                        "rejected"

                }
            );


    if(error){

        console.error(
            "Erreur refus heures supplémentaires :",
            error
        );

        alert(
            "Erreur lors du refus.\n\n" +
            error.message
        );

        return;

    }


    /* ========================================================
       PUSH MOBILE
    ======================================================== */

    if(notificationId){

        const {
            data:
                pushResult,
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
                        }

                    }
                );


        if(pushError){

            console.error(
                "Erreur Push heures sup :",
                pushError
            );

        }
        else{

            console.log(
                "Push heures sup :",
                pushResult
            );

        }

    }


    /* ========================================================
       ACTUALISATION
    ======================================================== */

    await loadOvertimeRequests();

    renderOvertime();

}