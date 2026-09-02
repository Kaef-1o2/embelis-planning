/* ============================================================
   EMBELIS PLANNING
   MODULE SAMEDI VOLONTAIRE

   Gestion :
   - demandes de participation au samedi
   - validation et refus des demandes
   - annulation des participations
   - affichage des volontaires
   - calcul des heures du samedi
============================================================ */


/* ============================================================
   DATE DU PROCHAIN SAMEDI
============================================================ */

function getSaturdayDate(){

    /*
       Le module Samedi volontaire
       concerne toujours le prochain samedi
       disponible.

       Si le samedi de cette semaine
       est déjà passé, on passe automatiquement
       au samedi suivant.
    */

    const today =
        new Date();


    today.setHours(
        12,
        0,
        0,
        0
    );


    const day =
        today.getDay();


    let daysUntilSaturday =
        6 - day;


    /*
       Dimanche :
       le samedi vient de passer,
       on vise donc le samedi suivant.
    */

    if(
        daysUntilSaturday < 0
    ){

        daysUntilSaturday +=
            7;

    }


    const saturday =
        new Date(
            today
        );


    saturday.setDate(
        saturday.getDate() +
        daysUntilSaturday
    );


    return (
        saturday.getFullYear() +
        "-" +
        String(
            saturday.getMonth() + 1
        ).padStart(2,"0") +
        "-" +
        String(
            saturday.getDate()
        ).padStart(2,"0")
    );

}

/* ============================================================
   CHARGEMENT DES DEMANDES DU SAMEDI
============================================================ */

async function loadSaturdayRequests(){

    const { data, error } =
        await supabaseClient
            .from("saturday_requests")
            .select("*")
            .order("id");

    if(error) throw error;

    saturdayRequests = {};

    const currentSaturday =
        getSaturdayDate();

    (data || []).forEach(request => {

        if(
            request.saturday_date ===
            currentSaturday
        ){

            saturdayRequests[
                request.employee_id
            ] = {

                id:
                    request.id,

                status:
                    request.status,

                date:
                    request.saturday_date

            };

        }

    });

}

/* ============================================================
   SAMEDI
============================================================ */

function renderSaturday(){

    const container =
        document.getElementById(
            "volunteerGrid"
        );

const saturdayDateBadge =
    document.getElementById(
        "saturdayDateBadge"
    );


if(saturdayDateBadge){

    const saturdayDate =
        getSaturdayDate();


    const formattedSaturday =
        formatFrenchDate(
            saturdayDate
        );


    saturdayDateBadge.textContent =
        "Samedi " +
        formattedSaturday +
        " • 6h30–12h30";

}
   
    container.innerHTML =

        employees
    .filter(employee =>
        employee.active !== false &&
        (
            isAdmin() ||
            (
                currentEmployee &&
                employee.id === currentEmployee.id
            )
        )
    )
    .map(employee => {

            const request =
                saturdayRequests[
                    employee.id
                ];


            const status =
                request
                ?
                request.status
                :
                "none";


            let label =
                "Pas inscrit";

            let className =
                "pending";

            let actions = "";


            if(
    status === "requested"
){

    label =
        "Demande en attente";

    className =
        "requested";


    if(isAdmin()){

        actions = `

            <button
                class="small-btn accept"
                onclick="acceptSaturday(${employee.id})">

                Accepter

            </button>

            <button
                class="small-btn refuse"
                onclick="refuseSaturday(${employee.id})">

                Refuser

            </button>

        `;

    }

}
            else if(
    status === "accepted"
){

    label =
        "Accepté • 6 h";

    className =
        "accepted";


    if(isAdmin()){

        actions = `

            <button
                class="small-btn cancel"
                onclick="cancelSaturday(${employee.id})">

                Annuler

            </button>

        `;

    }

}
            else if(
                status === "refused"
            ){

                label =
                    "Refusé";

                className =
                    "refused";


                actions = `

                    <button
                        class="small-btn"
                        onclick="resetSaturday(${employee.id})">

                        Nouvelle demande

                    </button>

                `;

            }
            else if(
                status === "cancelled"
            ){

                label =
                    "Annulé";

                className =
                    "cancelled";


                actions = `

                    <button
                        class="small-btn"
                        onclick="resetSaturday(${employee.id})">

                        Nouvelle demande

                    </button>

                `;

            }
            else{

                actions = `

                    <button
                        class="small-btn"
                        onclick="makeRequest(${employee.id})">

                        Demander à travailler

                    </button>

                `;

            }


            return `

                <div class="volunteer">

                    <div class="volunteer-name">
                        ${escapeHtml(employee.name)}
                    </div>

                    <div class="volunteer-team">
                        ${escapeHtml(employee.team)}
                    </div>

                    <span class="status ${className}">
                        ${label}
                    </span>

                    <div class="volunteer-actions">
                        ${actions}
                    </div>

                </div>

            `;

        })
        .join("");


    const values =
        Object.values(
            saturdayRequests
        );


    const requested =
        values.filter(
            r =>
                r.status === "requested"
        ).length;


    const accepted =
        values.filter(
            r =>
                r.status === "accepted"
        ).length;


    document.getElementById(
        "requestCount"
    ).textContent =
        requested;


    document.getElementById(
        "acceptedCount"
    ).textContent =
        accepted;


    document.getElementById(
        "validatedHours"
    ).textContent =
        (accepted * 6) + " h";


    document.getElementById(
        "statSaturday"
    ).textContent =
        (accepted * 6) + " h";

}

/* ============================================================
   DEMANDE SAMEDI
============================================================ */

async function createSaturdayRequest(
    employeeId
){

    const saturdayDate =
        getSaturdayDate();


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
                "submit_saturday_request",
                {

                    p_employee_id:
                        employeeId,

                    p_saturday_date:
                        saturdayDate

                }
            );


    if(error){

        console.error(
            "Erreur création demande samedi :",
            error
        );


        alert(
            "Erreur lors de la demande.\n\n" +
            error.message
        );

        return;

    }


    console.log(
        "Demande samedi créée. Notification ID :",
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


        if(pushError){

            console.error(
                "Erreur Push demande samedi :",
                pushError
            );

        }
        else{

            console.log(
                "Push demande samedi :",
                pushResult
            );

        }

    }
    else{

        console.warn(
            "Aucun notificationId retourné pour la demande samedi."
        );

    }


    await loadSaturdayRequests();

    renderSaturday();

}

/* ============================================================
   MODIFICATION STATUT SAMEDI
============================================================ */

async function updateSaturdayStatus(
    employeeId,
    status
){

    /* ========================================================
       SECURITE FRONTEND
    ======================================================== */

    if(!isAdmin()){

        alert(
            "Vous n'avez pas les permissions pour modifier cette demande."
        );

        return;

    }


    /* ========================================================
       RECUPERATION DE LA DEMANDE
    ======================================================== */

    const request =
        saturdayRequests[
            employeeId
        ];


    if(!request){

        console.error(
            "Aucune demande samedi trouvée pour l'employé :",
            employeeId
        );

        return;

    }


    /* ========================================================
       MODIFICATION COTE SERVEUR
    ======================================================== */

    const {
        data: notificationId,
        error
    } =
        await supabaseClient
            .rpc(
                "review_saturday_request",
                {
                    p_request_id:
                        request.id,

                    p_status:
                        status
                }
            );


    if(error){

        console.error(
            "Erreur modification samedi :",
            error
        );

        alert(
            "Erreur lors de la modification de la demande.\n\n" +
            error.message
        );

        return;

    }


    console.log(
        "Statut samedi modifié :",
        status,
        "Notification ID :",
        notificationId
    );


    /* ========================================================
       PUSH VERS LE SALARIE
    ======================================================== */

    if(notificationId){

        const {
            data:{
                session
            },
            error:
                sessionError
        } =
            await supabaseClient
                .auth
                .getSession();


        if(sessionError){

            console.error(
                "Erreur récupération session Push :",
                sessionError
            );

        }
        else if(!session?.access_token){

            console.error(
                "Impossible d'envoyer le Push : session Supabase absente."
            );

        }
        else{

            const {
                data: pushResult,
                error: pushError
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

                            headers:{
                                Authorization:
                                    `Bearer ${session.access_token}`
                            }
                        }
                    );


            if(pushError){

                console.error(
                    "Erreur Push statut samedi :",
                    pushError
                );

            }
            else{

                console.log(
                    "Push statut samedi :",
                    pushResult
                );

            }

        }

    }
    else{

        console.warn(
            "Aucun notificationId retourné pour la modification samedi."
        );

    }


    /* ========================================================
       ACTUALISATION
    ======================================================== */

    await loadSaturdayRequests();

    renderSaturday();

}

/* ============================================================
   RACCOURCI DEMANDE SAMEDI
============================================================ */

function makeRequest(
    id
){

    createSaturdayRequest(
        id
    );

}

/* ============================================================
   ACCEPTATION SAMEDI
============================================================ */

async function acceptSaturday(
    employeeId
){

    await updateSaturdayStatus(
        employeeId,
        "accepted"
    );

}


/* ============================================================
   REFUS SAMEDI
============================================================ */

async function refuseSaturday(
    employeeId
){

    await updateSaturdayStatus(
        employeeId,
        "refused"
    );

}


/* ============================================================
   ANNULATION SAMEDI
============================================================ */

async function cancelSaturday(
    employeeId
){

    if(
        !confirm(
            "Annuler la participation de cet employé ?"
        )
    )
        return;


    await updateSaturdayStatus(
        employeeId,
        "cancelled"
    );

}


/* ============================================================
   NOUVELLE DEMANDE APRES REFUS / ANNULATION
============================================================ */

async function resetSaturday(
    employeeId
){

    console.log(
        "Nouvelle demande samedi pour employé :",
        employeeId
    );


    /*
       On repasse volontairement par la même fonction
       que pour une première demande.

       Ainsi toutes les demandes suivent le même circuit :
       - RPC Supabase
       - création notification
       - Push
       - rechargement interface
    */

    await createSaturdayRequest(
        employeeId
    );

}

/* ============================================================
   MODALE SAMEDI
============================================================ */

function openSaturdayModal(){

    const select =
        document.getElementById(
            "satEmployee"
        );


    const available =
        employees.filter(
            employee =>
                !saturdayRequests[
                    employee.id
                ] ||
                [
                    "cancelled",
                    "refused"
                ].includes(
                    saturdayRequests[
                        employee.id
                    ].status
                )
        );


    select.innerHTML =

        available
        .map(
            employee =>

                `<option value="${employee.id}">
                    ${escapeHtml(employee.name)}
                </option>`

        )
        .join("");


    if(
        available.length === 0
    ){

        alert(
            "Aucun employé disponible."
        );

        return;

    }


    openModal(
    "saturdayModal"
);

}


async function requestSaturday(){

    const employeeId =
        Number(
            document.getElementById(
                "satEmployee"
            ).value
        );


    if(employeeId){

        await createSaturdayRequest(
            employeeId
        );

    }


    closeModal(
        "saturdayModal"
    );

}