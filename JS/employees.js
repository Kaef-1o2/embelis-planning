/* ============================================================
   EMBELIS PLANNING
   MODULE EMPLOYES

   Gestion :
   - chargement des employés
   - affichage et tri des employés
   - mise en avant des employés avec une absence à traiter
   - ouverture de la fiche employé depuis sa carte
   - création et modification des employés
   - activation et désactivation des employés
   - suppression des employés
   - construction de l'historique métier d'un employé
   - affichage de la situation actuelle et à venir
   - affichage de l'historique complet d'un employé
   - affichage des congés programmés dans la fiche employé
   - mise en avant d'une absence ouverte depuis une notification
============================================================ */

async function loadEmployees(){

    const { data, error } =
        await supabaseClient
            .from("employees")
            .select(`
                id,
                name,
                role,
                active,
                team_id,
                phone,
                auth_user_id,
                app_role,
                teams (
                    id,
                    name
                )
            `)
            .order(
    "name",
    {
        ascending: true
    }
);

    if(error)
        throw error;


    employees =
        (data || []).map(employee => ({

            id:
                employee.id,

            name:
                employee.name,

            role:
                employee.role,

            phone:
                employee.phone,

            active:
                employee.active,

            team_id:
                employee.team_id,

            auth_user_id:
                employee.auth_user_id,

            app_role:
                employee.app_role,

            team:
                employee.teams
                ? employee.teams.name
                : ""

        }));

}

/* ============================================================
   DATE DU JOUR AU FORMAT SUPABASE
   Retourne la date locale sous la forme YYYY-MM-DD.
============================================================ */

function getTodayDateString(){

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


/* ============================================================
   ECART ENTRE DEUX DATES
   Retourne le nombre de jours entre deux dates YYYY-MM-DD.
============================================================ */

function getDaysBetweenDates(
    startDate,
    endDate
){

    const start =
        new Date(
            startDate +
            "T12:00:00"
        );


    const end =
        new Date(
            endDate +
            "T12:00:00"
        );


    const millisecondsPerDay =
        24 *
        60 *
        60 *
        1000;


    return Math.round(
        (
            end -
            start
        ) /
        millisecondsPerDay
    );

}


/* ============================================================
   SITUATIONS ACTUELLES ET A VENIR D'UN EMPLOYE

   Retourne toutes les informations importantes à afficher :
   - absence nécessitant une décision
   - absence / congé actuellement en cours
   - prochaine absence / prochain congé dans les 7 jours

   Plusieurs situations peuvent donc être affichées
   simultanément pour un même employé.
============================================================ */

function getEmployeeCurrentSituation(
    employeeId
){

    if(
        !Array.isArray(
            employeeUnavailability
        )
    ){

        return [];

    }


    const situations =
        [];


    const today =
        getTodayDateString();


    const employeeAbsences =
        employeeUnavailability
        .filter(
            absence =>
                Number(
                    absence.employee_id
                ) ===
                Number(
                    employeeId
                ) &&
                absence.status !==
                    "cancelled"
        );


    /* ========================================================
       ABSENCE A TRAITER
    ======================================================== */

    const pending =
        employeeAbsences.find(
            absence =>
                absence.source ===
                    "employee" &&
                (
                    absence.status ===
                        "reported" ||
                    absence.status ===
                        "acknowledged"
                )
        );


    if(pending){

        situations.push({

            type:
                "pending",

            className:
                "employee-situation-pending",

            icon:
                "⚠️",

            text:
                "Absence à traiter",

            absence:
                pending

        });

    }


    /* ========================================================
       SITUATION ACTUELLE
    ======================================================== */

    const current =
        employeeAbsences.find(
            absence =>
                absence.status ===
                    "approved" &&
                absence.start_date <=
                    today &&
                absence.end_date >=
                    today
        );


    if(current){

        let text =
            "Absent aujourd'hui";


        let icon =
            "🔴";


        let className =
            "employee-situation-absence";


        if(
            current.type ===
            "conge"
        ){

            text =
                "En congé";

            icon =
                "🟣";

            className =
                "employee-situation-leave";

        }
        else if(
            current.type ===
            "maladie"
        ){

            text =
                "Absent - maladie";

            icon =
                "🔵";

            className =
                "employee-situation-sick";

        }
        else if(
            current.type ===
            "indisponibilite"
        ){

            text =
                "Indisponible";

            icon =
                "🟠";

            className =
                "employee-situation-unavailable";

        }


        situations.push({

            type:
                current.type,

            className,

            icon,

            text,

            absence:
                current

        });

    }


    /* ========================================================
       PROCHAINE INDISPONIBILITE
    ======================================================== */

    const future =
        employeeAbsences
        .filter(
            absence =>
                absence.status ===
                    "approved" &&
                absence.start_date >
                    today
        )
        .sort(
            (
                absenceA,
                absenceB
            ) =>
                absenceA.start_date
                .localeCompare(
                    absenceB.start_date
                )
        )[0];


    if(future){

        const daysUntil =
            getDaysBetweenDates(
                today,
                future.start_date
            );


        /*
           Affichage uniquement lorsque l'événement
           commence dans les 7 prochains jours.
        */

        if(
            daysUntil >= 1 &&
            daysUntil <= 7
        ){

            let label =
                "Absence";


            let icon =
                "🔴";


            let className =
                "employee-situation-future";


            if(
                future.type ===
                "conge"
            ){

                label =
                    "Congé";

                icon =
                    "🟣";

            }
            else if(
                future.type ===
                "maladie"
            ){

                label =
                    "Maladie";

                icon =
                    "🔵";

            }
            else if(
                future.type ===
                    "indisponibilite"
            ){

                label =
                    "Indisponibilité";

                icon =
                    "🟠";

            }


            situations.push({

                type:
                    "future",

                className,

                icon,

                text:
                    daysUntil === 1
                    ? `${label} demain`
                    : `${label} dans ${daysUntil} jours`,

                absence:
                    future

            });

        }

    }


    return situations;

}


/* ============================================================
   HISTORIQUE UNIFIE D'UN EMPLOYE
   Fusionne absences, congés, heures supplémentaires et samedis
   dans une seule chronologie.
============================================================ */

function getEmployeeHistory(
    employeeId
){

    const history =
        [];


    /* ========================================================
       ABSENCES ET CONGES
    ======================================================== */

    if(
        Array.isArray(
            employeeUnavailability
        )
    ){

        employeeUnavailability
            .filter(
                absence =>
                    Number(
                        absence.employee_id
                    ) ===
                    Number(
                        employeeId
                    )
            )
            .forEach(
                absence => {

                    let icon =
                        "🔴";


                    let title =
                        "Absence";


                    if(
                        absence.type ===
                        "conge"
                    ){

                        icon =
                            "🟣";

                        title =
                            "Congé";

                    }
                    else if(
                        absence.type ===
                        "maladie"
                    ){

                        icon =
                            "🔵";

                        title =
                            "Maladie";

                    }
                    else if(
                        absence.type ===
                        "indisponibilite"
                    ){

                        icon =
                            "🟠";

                        title =
                            "Indisponibilité";

                    }


                    history.push({

                        category:
                            "unavailability",

                        id:
                            absence.id,

                        icon,

                        title,

                        date:
                            absence.start_date,

                        endDate:
                            absence.end_date,

                        status:
                            absence.status,

                        detail:
                            absence.reason ||
                            null

                    });

                }
            );

    }


    /* ========================================================
       HEURES SUPPLEMENTAIRES
    ======================================================== */

    if(
        Array.isArray(
            overtimeRequests
        )
    ){

        overtimeRequests
            .filter(
                request =>
                    Number(
                        request.employee_id
                    ) ===
                    Number(
                        employeeId
                    )
            )
            .forEach(
                request => {

                    const minutes =
                        Number(
                            request.overtime_minutes
                        ) || 0;


                    const hours =
                        Math.floor(
                            minutes / 60
                        );


                    const remainingMinutes =
                        minutes % 60;


                    let duration =
                        "";


                    if(hours){

                        duration +=
                            `${hours}h`;

                    }


                    if(remainingMinutes){

                        duration +=
                            `${remainingMinutes
                                .toString()
                                .padStart(
                                    2,
                                    "0"
                                )}`;

                    }


                    history.push({

                        category:
                            "overtime",

                        id:
                            request.id,

                        icon:
                            "⏱️",

                        title:
                            "Heures supplémentaires",

                        date:
                            request.work_date,

                        endDate:
                            null,

                        status:
                            request.status,

                        detail:
                            duration
                            ? `+${duration}`
                            : null

                    });

                }
            );

    }


    /* ========================================================
       SAMEDIS VOLONTAIRES
    ======================================================== */

    if(
        Array.isArray(
            saturdayHistory
        )
    ){

        saturdayHistory
            .filter(
                request =>
                    Number(
                        request.employee_id
                    ) ===
                    Number(
                        employeeId
                    )
            )
            .forEach(
                request => {

                    history.push({

                        category:
                            "saturday",

                        id:
                            request.id,

                        icon:
                            "☀️",

                        title:
                            "Samedi volontaire",

                        date:
                            request.saturday_date,

                        endDate:
                            null,

                        status:
                            request.status,

                        detail:
                            request.status ===
                                "accepted"
                            ? "6 h"
                            : null

                    });

                }
            );

    }


    /*
       Classement du plus récent au plus ancien.
    */

    return history.sort(
        (
            eventA,
            eventB
        ) =>
            (
                eventB.date ||
                ""
            ).localeCompare(
                eventA.date ||
                ""
            )
    );

}


/* ============================================================
   LIBELLE D'UN STATUT D'HISTORIQUE
   Uniformise les différents statuts métier.
============================================================ */

function getEmployeeHistoryStatusLabel(
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
            "Annulée",

        pending:
            "En attente",

        requested:
            "Demandé",

        accepted:
            "Validé",

        refused:
            "Refusé"

    };


    return (
        labels[status] ||
        status ||
        ""
    );

}

/* ============================================================
   OUVERTURE DE L'HISTORIQUE COMPLET D'UN EMPLOYE

   Affiche toute la chronologie métier de l'employé :
   - absences
   - congés
   - maladies / indisponibilités
   - heures supplémentaires
   - samedis volontaires

   Les événements sont classés du plus récent au plus ancien.
============================================================ */

function openEmployeeHistory(){

    if(
        editingEmployeeId === null
    ){

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


    const title =
        document.getElementById(
            "employeeHistoryModalTitle"
        );


    const container =
        document.getElementById(
            "employeeFullHistory"
        );


    if(title){

        title.textContent =
            "Historique — " +
            employee.name;

    }


    if(!container)
        return;


    const history =
        getEmployeeHistory(
            employee.id
        );


    if(!history.length){

        container.innerHTML = `

            <div class="employee-profile-empty">

                Aucun événement enregistré.

            </div>

        `;


        openModal(
            "employeeHistoryModal"
        );

        return;

    }


    container.innerHTML =
        history
        .map(
            event => {

                const start =
                    formatFrenchDate(
                        event.date
                    );


                let dateText =
                    start;


                if(
                    event.endDate &&
                    event.endDate !==
                        event.date
                ){

                    dateText +=
                        " → " +
                        formatFrenchDate(
                            event.endDate
                        );

                }


                return `

                    <div class="employee-full-history-item">

                        <div class="employee-full-history-icon">

                            ${event.icon}

                        </div>


                        <div class="employee-full-history-content">

                            <div class="employee-full-history-title">

                                ${escapeHtml(
                                    event.title
                                )}

                            </div>


                            <div class="employee-full-history-date">

                                ${escapeHtml(
                                    dateText
                                )}

                            </div>


                            ${
                                event.detail
                                ?
                                `
                                <div class="employee-full-history-detail">

                                    ${escapeHtml(
                                        event.detail
                                    )}

                                </div>
                                `
                                :
                                ""
                            }

                        </div>


                        <div class="employee-full-history-status">

                            ${escapeHtml(
                                getEmployeeHistoryStatusLabel(
                                    event.status
                                )
                            )}

                        </div>

                    </div>

                `;

            }
        )
        .join("");


    openModal(
        "employeeHistoryModal"
    );

}

/* ============================================================
   AFFICHAGE DES EMPLOYES
   Affiche les employés sous forme de cartes cliquables.

   Priorités :
   - les absences à traiter remontent en tête
   - le reste de la liste est classé alphabétiquement
   - un clic sur la carte ouvre la fiche employé
   - un clic sur le téléphone lance uniquement l'appel
============================================================ */

function renderEmployees(){

    const employeeGrid =
        document.getElementById(
            "employeeGrid"
        );


    if(!employeeGrid)
        return;


    /*
       Les absences à traiter passent en tête.
       Le reste de la liste reste alphabétique.
    */

    const sortedEmployees =
        [...employees]
        .sort(
            (
                employeeA,
                employeeB
            ) => {

                const pendingA =
                    getEmployeePendingAbsences(
                        employeeA.id
                    ).length > 0;


                const pendingB =
                    getEmployeePendingAbsences(
                        employeeB.id
                    ).length > 0;


                if(
                    pendingA !==
                    pendingB
                ){

                    return pendingA
                        ? -1
                        : 1;

                }


                return (
                    employeeA.name ||
                    ""
                ).localeCompare(
                    employeeB.name ||
                    "",
                    "fr",
                    {
                        sensitivity:
                            "base"
                    }
                );

            }
        );


    employeeGrid.innerHTML =
        sortedEmployees
        .map(
            employee => {

                const isActive =
                    employee.active !==
                    false;


                const pendingAbsences =
                    getEmployeePendingAbsences(
                        employee.id
                    );


                const hasPendingAbsence =
                    pendingAbsences.length >
                    0;


                const situations =
    getEmployeeCurrentSituation(
        employee.id
    );


                const phoneLink =
                    employee.phone
                    ?
                    employee.phone.replace(
                        /\s+/g,
                        ""
                    )
                    :
                    "";


                let situationHtml =
    "";


if(
    situations.length
){

    situationHtml =
        situations
        .map(
            situation => `

                <div
                    class="
                        employee-list-situation
                        ${situation.className}
                    "
                >

                    <span>
                        ${situation.icon}
                    </span>

                    <strong>
                        ${escapeHtml(
                            situation.text
                        )}
                    </strong>

                </div>

            `
        )
        .join("");

}


                return `

                    <div
                        class="
                            employee
                            employee-clickable
                            ${
                                hasPendingAbsence
                                ? "employee-attention"
                                : ""
                            }
                            ${
                                !isActive
                                ? "employee-inactive"
                                : ""
                            }
                        "
                        role="button"
                        tabindex="0"
                        onclick="
                            editEmployee(
                                ${employee.id}
                            )
                        "
                        onkeydown="
                            if(
                                event.key === 'Enter' ||
                                event.key === ' '
                            ){
                                event.preventDefault();

                                editEmployee(
                                    ${employee.id}
                                );
                            }
                        "
                    >

                        <div class="employee-card-header">

                            <div>

                                <div class="employee-name">

                                    ${escapeHtml(
                                        employee.name
                                    )}

                                </div>


                                <div class="employee-role">

                                    ${escapeHtml(
                                        employee.role ||
                                        "Poste non renseigné"
                                    )}

                                </div>

                            </div>


                            <div class="employee-open-indicator">
                                ›
                            </div>

                        </div>


                        <div class="employee-card-details">


                            <div class="employee-team">

                                👥

                                ${escapeHtml(
                                    employee.team ||
                                    "Aucune équipe"
                                )}

                            </div>


                            ${
                                employee.phone
                                ?
                                `
                                <div
                                    class="employee-phone"
                                    onclick="
                                        event.stopPropagation()
                                    "
                                >

                                    📞

                                    <a
                                        href="tel:${escapeHtml(
                                            phoneLink
                                        )}"
                                        onclick="
                                            event.stopPropagation()
                                        "
                                    >

                                        ${escapeHtml(
                                            employee.phone
                                        )}

                                    </a>

                                </div>
                                `
                                :
                                `
                                <div
                                    class="
                                        employee-phone
                                        employee-phone-empty
                                    "
                                >

                                    📞 Aucun numéro renseigné

                                </div>
                                `
                            }

                        </div>


                        ${
                            situationHtml
                        }


                        ${
                            !isActive
                            ?
                            `
                            <div class="employee-list-inactive">

                                Employé inactif

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
   DESACTIVER EMPLOYE
============================================================ */

async function deactivateEmployee(id){

    const employee =
        employees.find(
            employee =>
                employee.id === id
        );


    if(!employee)
        return;


    const confirmed =
        confirm(
            "Désactiver " +
            employee.name +
            " ?\n\n" +
            "L'employé ne sera plus considéré comme actif " +
            "mais ses données seront conservées."
        );


    if(!confirmed)
        return;


    const { error } =
        await supabaseClient
            .from("employees")
            .update({
                active: false
            })
            .eq(
                "id",
                id
            );


    if(error){

        console.error(
            "Erreur désactivation employé :",
            error
        );


        alert(
            "Erreur lors de la désactivation de l'employé."
        );

        return;

    }


    await loadEmployees();

    renderAll();

    restorePage();

}

/* ============================================================
   REACTIVER EMPLOYE
============================================================ */

async function reactivateEmployee(id){

    const employee =
        employees.find(
            employee =>
                employee.id === id
        );


    if(!employee)
        return;


    const confirmed =
        confirm(
            "Réactiver " +
            employee.name +
            " ?"
        );


    if(!confirmed)
        return;


    const { error } =
        await supabaseClient
            .from("employees")
            .update({
                active: true
            })
            .eq(
                "id",
                id
            );


    if(error){

        console.error(
            "Erreur réactivation employé :",
            error
        );


        alert(
            "Erreur lors de la réactivation de l'employé."
        );

        return;

    }


    await loadEmployees();

    renderAll();

    restorePage();

}

/* ============================================================
   AJOUT EMPLOYE
============================================================ */

function openEmployeeModal(){

    editingEmployeeId =
        null;


    document.getElementById(
        "employeeModalTitle"
    ).textContent =
        "Ajouter un employé";


    document.getElementById(
        "employeeName"
    ).value =
        "";


    document.getElementById(
        "employeeName"
    ).disabled =
        false;
   
    document.getElementById(
    "employeePhone"
   ).value =
    "";

    document.getElementById(
        "employeeRole"
    ).value =
        "Jardinier paysagiste";


    refreshTeamSelects();


    document.getElementById(
        "employeeTeam"
    ).value =
        teams[0]
        ?
        String(teams[0].id)
        :
        "";

   const deleteButton =
    document.getElementById(
        "deleteEmployeeButton"
    );

if(deleteButton){

    deleteButton.style.display =
        "none";

}

   const accessBox =
    document.getElementById(
        "employeeAccessBox"
    );

if(accessBox){

    accessBox.style.display =
        "none";

}
   
   /*
   Les informations métier détaillées
   ne concernent qu'un employé déjà créé.
*/

[
    "employeeSituationSection",
    "employeeAbsenceSection",
    "employeeHistorySection",
    "employeeManagementSection"
]
.forEach(
    id => {

        const element =
            document.getElementById(
                id
            );


        if(element){

            element.style.display =
                "none";

        }

    }
);


openModal(
    "employeeModal"
);

}

/* ============================================================
   ABSENCES A TRAITER D'UN EMPLOYE
   Retourne les signalements d'absence qui nécessitent encore
   une décision du responsable.

   Les statuts "reported" et "acknowledged" restent à traiter
   tant que l'absence n'a pas été validée ou refusée.
============================================================ */

function getEmployeePendingAbsences(
    employeeId
){

    /*
       Sécurité si les indisponibilités
       ne sont pas encore chargées.
    */

    if(
        !Array.isArray(
            employeeUnavailability
        )
    ){

        return [];

    }


    return employeeUnavailability
        .filter(
            absence => {

                const sameEmployee =
                    Number(
                        absence.employee_id
                    ) ===
                    Number(
                        employeeId
                    );


                const employeeRequest =
                    absence.source ===
                    "employee";


                const needsReview =
                    absence.status ===
                        "reported" ||
                    absence.status ===
                        "acknowledged";


                return (
                    sameEmployee &&
                    employeeRequest &&
                    needsReview
                );

            }
        )
        .sort(
            (
                absenceA,
                absenceB
            ) => {

                return (
                    absenceA.start_date ||
                    ""
                ).localeCompare(
                    absenceB.start_date ||
                    ""
                );

            }
        );

}

/* ============================================================
   MISE EN AVANT D'UNE ABSENCE DANS LA FICHE EMPLOYE

   Utilisée notamment lorsqu'une fiche employé est ouverte
   depuis une notification d'absence.
============================================================ */

function highlightEmployeeAbsence(
    absenceId
){

    const absenceCard =
        document.querySelector(
            `[data-absence-id="${Number(absenceId)}"]`
        );


    if(!absenceCard)
        return;


    absenceCard.classList.add(
        "employee-absence-highlight"
    );


    setTimeout(
        () => {

            absenceCard.scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "center"
                }
            );

        },
        100
    );


    setTimeout(
        () => {

            absenceCard.classList.remove(
                "employee-absence-highlight"
            );

        },
        3500
    );

}

/* ============================================================
   DONNEES METIER DE LA FICHE EMPLOYE
   Affiche la situation actuelle, les absences nécessitant une
   décision et les deux derniers événements de l'historique.
============================================================ */

function renderEmployeeProfileData(
    employeeId
){

    const situationContainer =
        document.getElementById(
            "employeeSituation"
        );


    const pendingContainer =
        document.getElementById(
            "employeePendingAbsences"
        );


    const historyContainer =
        document.getElementById(
            "employeeRecentHistory"
        );


    /* ========================================================
       SITUATION
    ======================================================== */

    const situations =
    getEmployeeCurrentSituation(
        employeeId
    );


    if(situationContainer){

    if(
        situations.length
    ){

        situationContainer.innerHTML =
            situations
            .map(
                situation => `

                    <div class="
                        employee-situation-badge
                        ${situation.className}
                    ">

                        <span>
                            ${situation.icon}
                        </span>

                        <strong>
                            ${escapeHtml(
                                situation.text
                            )}
                        </strong>

                    </div>

                `
            )
            .join("");

    }
    else{

        situationContainer.innerHTML = `

            <div class="employee-situation-normal">

                ✓ Disponible

            </div>

        `;

    }

}


    /* ========================================================
   ABSENCES ET CONGES
   Affiche :
   - les absences signalées qui nécessitent une décision
   - les congés programmés encore actifs
======================================================== */

const pendingAbsences =
    getEmployeePendingAbsences(
        employeeId
    );


const programmedLeaves =
    Array.isArray(
        employeeUnavailability
    )
    ?
    employeeUnavailability
        .filter(
            absence =>
                Number(
                    absence.employee_id
                ) ===
                Number(
                    employeeId
                ) &&

                absence.type ===
                    "conge" &&

                absence.source ===
                    "admin" &&

                absence.status ===
                    "approved" &&

                absence.end_date >=
                     getTodayDateString()

        )
        .sort(
            (
                leaveA,
                leaveB
            ) =>
                (
                    leaveA.start_date ||
                    ""
                ).localeCompare(
                    leaveB.start_date ||
                    ""
                )
        )
    :
    [];


if(pendingContainer){

    let absenceHtml =
        "";


    /* ====================================================
       ABSENCES A TRAITER
    ==================================================== */

    if(
        pendingAbsences.length
    ){

        absenceHtml +=
            pendingAbsences
            .map(
                absence => {

                    const start =
                        formatFrenchDate(
                            absence.start_date
                        );


                    const end =
                        formatFrenchDate(
                            absence.end_date
                        );


                    const dates =
                        absence.start_date ===
                            absence.end_date
                        ? start
                        : `${start} → ${end}`;


                    return `

                            <div
                               class="employee-absence-card"
                               data-absence-id="${absence.id}"
                               >

                            <div class="employee-absence-warning">

                                ⚠️ Absence à traiter

                            </div>


                            <div class="employee-absence-date">

                                ${escapeHtml(
                                    dates
                                )}

                            </div>


                            <div class="employee-absence-type">

                                ${escapeHtml(
                                    getAbsenceTypeLabel(
                                        absence.type
                                    )
                                )}

                            </div>


                            ${
                                absence.reason
                                ?
                                `
                                <div class="employee-absence-reason">

                                    ${escapeHtml(
                                        absence.reason
                                    )}

                                </div>
                                `
                                :
                                ""
                            }


                            <div class="employee-absence-actions">

                                <button
                                    type="button"
                                    class="btn secondary"
                                    onclick="
                                        reviewEmployeeAbsence(
                                            ${absence.id},
                                            'rejected'
                                        )
                                    "
                                >

                                    Refuser

                                </button>


                                <button
                                    type="button"
                                    class="btn primary"
                                    onclick="
                                        reviewEmployeeAbsence(
                                            ${absence.id},
                                            'approved'
                                        )
                                    "
                                >

                                    Valider

                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

    }


    /* ====================================================
       CONGES PROGRAMMES
    ==================================================== */

    if(
        programmedLeaves.length
    ){

        absenceHtml += `

            <div class="employee-programmed-leaves">

                <div class="employee-programmed-leaves-title">

                    Congés programmés

                </div>

        `;


        absenceHtml +=
            programmedLeaves
            .map(
                leave => {

                    const start =
                        formatFrenchDate(
                            leave.start_date
                        );


                    const end =
                        formatFrenchDate(
                            leave.end_date
                        );


                    const dates =
                        leave.start_date ===
                            leave.end_date
                        ? start
                        : `${start} → ${end}`;


                    return `

                        <div class="employee-leave-card">

                            <div class="employee-leave-main">

                                <div class="employee-leave-title">

                                    <span>
                                        🟣
                                    </span>

                                    <strong>
                                        Congé programmé
                                    </strong>

                                </div>


                                <div class="employee-leave-date">

                                    ${escapeHtml(
                                        dates
                                    )}

                                </div>


                                ${
                                    leave.reason
                                    ?
                                    `
                                    <div class="employee-leave-reason">

                                        ${escapeHtml(
                                            leave.reason
                                        )}

                                    </div>
                                    `
                                    :
                                    ""
                                }

                            </div>


                            <button
                                type="button"
                                class="
                                    btn
                                    secondary
                                    employee-cancel-leave-button
                                "
                                onclick="
                                    cancelEmployeeLeave(
                                        ${leave.id}
                                    )
                                "
                            >

                                Annuler le congé

                            </button>

                        </div>

                    `;

                }
            )
            .join("");


        absenceHtml += `

            </div>

        `;

    }


    /* ====================================================
       AUCUNE ABSENCE / AUCUN CONGE
    ==================================================== */

    if(
        !pendingAbsences.length &&
        !programmedLeaves.length
    ){

        absenceHtml = `

            <div class="employee-profile-empty">

                Aucune absence à traiter
                et aucun congé programmé.

            </div>

        `;

    }


    pendingContainer.innerHTML =
        absenceHtml;

}


    /* ========================================================
       HISTORIQUE RECENT
    ======================================================== */

    /*
   L'historique récent ne contient que
   les événements dont la période est terminée.

   Les événements actuels ou futurs restent
   dans la section Situation afin d'éviter
   d'afficher deux fois la même information.
*/

const today =
    getTodayDateString();


const recentHistory =
    getEmployeeHistory(
        employeeId
    )
    .filter(
        event => {

            /*
               Pour une absence ou un congé,
               on utilise la date de fin.

               Pour un événement ponctuel
               comme un samedi volontaire ou
               des heures supplémentaires,
               on utilise sa date.
            */

            const effectiveEndDate =
                event.endDate ||
                event.date;


            return (
                effectiveEndDate <
                today
            );

        }
    )
    .slice(
        0,
        2
    );


    if(historyContainer){

        if(!recentHistory.length){

            historyContainer.innerHTML = `

                <div class="employee-profile-empty">

                    Aucun événement enregistré.

                </div>

            `;

        }
        else{

            historyContainer.innerHTML =
                recentHistory
                .map(
                    event => {

                        const start =
                            formatFrenchDate(
                                event.date
                            );


                        let dateText =
                            start;


                        if(
                            event.endDate &&
                            event.endDate !==
                                event.date
                        ){

                            dateText +=
                                " → " +
                                formatFrenchDate(
                                    event.endDate
                                );

                        }


                        return `

                            <div class="employee-history-item">

                                <div class="employee-history-icon">

                                    ${event.icon}

                                </div>


                                <div class="employee-history-content">

                                    <div class="employee-history-title">

                                        ${escapeHtml(
                                            event.title
                                        )}

                                    </div>


                                    <div class="employee-history-meta">

                                        ${escapeHtml(
                                            dateText
                                        )}

                                        ${
                                            event.detail
                                            ?
                                            ` · ${escapeHtml(
                                                event.detail
                                            )}`
                                            :
                                            ""
                                        }

                                    </div>

                                </div>


                                <div class="employee-history-status">

                                    ${escapeHtml(
                                        getEmployeeHistoryStatusLabel(
                                            event.status
                                        )
                                    )}

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

        }

    }

}

/* ============================================================
   TRAITEMENT D'UNE ABSENCE DEPUIS LA FICHE EMPLOYE
   Valide ou refuse une absence puis actualise immédiatement
   la fiche et déclenche le Push destiné au salarié.
============================================================ */

async function reviewEmployeeAbsence(
    absenceId,
    status
){

    if(
        status !== "approved" &&
        status !== "rejected"
    ){

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
            "Impossible de traiter cette absence."
        );

        return;

    }


    /*
       La RPC retourne la notification créée
       pour le salarié.
    */

    if(notificationId){

        await sendAbsencePush(
            notificationId
        );

    }


    /*
       Recharge toutes les informations utilisées
       par la liste et la fiche.
    */

    await loadEmployeeUnavailability();

    await loadNotifications();


    /*
       Actualise la fiche actuellement ouverte.
    */

    renderEmployeeProfileData(
        editingEmployeeId
    );


    /*
       Actualise également la liste derrière la modale.

       Une fois l'absence traitée, le salarié reprend
       automatiquement sa position alphabétique normale.
    */

    renderEmployees();


    alert(
        status === "approved"
        ? "L'absence a été validée."
        : "L'absence a été refusée."
    );

}

/* ============================================================
   MODIFIER EMPLOYE
============================================================ */

function editEmployee(id){

    const employee =
        employees.find(
            e => e.id === id
        );

    if(!employee)
        return;


    editingEmployeeId =
        id;


    document.getElementById(
    "employeeModalTitle"
).textContent =
    "Fiche employé — " +
    employee.name;


    document.getElementById(
        "employeeName"
    ).value =
        employee.name;


    document.getElementById(
        "employeeName"
    ).disabled =
        true;


    document.getElementById(
        "employeeRole"
    ).value =
        employee.role;
   
    document.getElementById(
    "employeePhone"
    ).value =
    employee.phone || "";

    refreshTeamSelects();


    document.getElementById(
        "employeeTeam"
    ).value =
        String(
            employee.team_id || ""
        );

   const accessBox =
    document.getElementById(
        "employeeAccessBox"
    );


const accessStatus =
    document.getElementById(
        "employeeAccessStatus"
    );


const accessButton =
    document.getElementById(
        "employeeAccessButton"
    );


if(accessBox){

    accessBox.style.display =
        "flex";

}


if(
    employee.auth_user_id
){

    accessStatus.textContent =
    "Accès actif";


accessButton.textContent =
    "Supprimer l'accès";


accessButton.disabled =
    false;


accessButton.onclick =
    () =>
        deleteEmployeeAccess(
            employee.id
        );

}
else{

    accessStatus.textContent =
    "Aucun accès créé";


accessButton.textContent =
    "Créer l'accès";


accessButton.disabled =
    false;


accessButton.onclick =
    openEmployeeAccessModal;

}


    /* ========================================================
       BOUTON SUPPRIMER
    ======================================================== */

    let deleteButton =
        document.getElementById(
            "deleteEmployeeButton"
        );


    /*
       Si le bouton n'existe pas encore,
       on le crée automatiquement.
    */

    if(!deleteButton){

        deleteButton =
            document.createElement(
                "button"
            );

        deleteButton.id =
            "deleteEmployeeButton";

        deleteButton.type =
            "button";

        deleteButton.className =
            "btn secondary";

        deleteButton.style.color =
            "#b42318";

        deleteButton.style.borderColor =
            "#e5b8b5";

        deleteButton.textContent =
            "🗑️ Supprimer l'employé";


        deleteButton.onclick =
            deleteCurrentEmployee;


        /*
           On cherche la zone des boutons
           de la modale employé.
        */

        const modal =
            document.getElementById(
                "employeeModal"
            );


        const actions =
            modal
                ? modal.querySelector(
                    ".modal-actions"
                )
                : null;


        if(actions){

            actions.insertBefore(
                deleteButton,
                actions.firstChild
            );

        }

    }


    deleteButton.style.display =
        "block";

        /* ========================================================
   ACTIVATION / DESACTIVATION DEPUIS LA FICHE
======================================================== */

const activeButton =
    document.getElementById(
        "employeeActiveButton"
    );


if(activeButton){

    activeButton.style.display =
        "inline-flex";


    if(
        employee.active !==
        false
    ){

        activeButton.innerHTML =
    "⏸️ Désactiver l'employé";


        activeButton.onclick =
            () =>
                deactivateEmployee(
                    employee.id
                );

    }
    else{

        activeButton.innerHTML =
    "▶️ Réactiver l'employé";


        activeButton.onclick =
            () =>
                reactivateEmployee(
                    employee.id
                );

    }

}

        /* ========================================================
   SECTIONS DE LA FICHE EMPLOYE
   Affiche les informations métier uniquement lorsqu'un
   salarié existant est consulté.
======================================================== */

[
    "employeeSituationSection",
    "employeeAbsenceSection",
    "employeeHistorySection",
    "employeeManagementSection"
]
.forEach(
    id => {

        const element =
            document.getElementById(
                id
            );


        if(element){

            element.style.display =
                "";

        }

    }
);


/*
   Remplit la situation actuelle,
   les absences à traiter et
   les deux derniers événements.
*/

renderEmployeeProfileData(
    employee.id
);

    openModal(
    "employeeModal"
);

}



/* ============================================================
   SUPPRIMER EMPLOYE
============================================================ */

async function deleteCurrentEmployee(){

    if(
        editingEmployeeId === null
    )
        return;


    const employee =
        employees.find(
            e =>
                e.id ===
                editingEmployeeId
        );


    if(!employee)
        return;


    const confirmed =
        confirm(
            "Voulez-vous vraiment supprimer l'employé « " +
            employee.name +
            " » ?\n\n" +
            "Cette action est définitive."
        );


    if(!confirmed)
        return;


    try{

        /* ====================================================
           1. SUPPRESSION DES DEMANDES DU SAMEDI
        ==================================================== */

        const saturdayResult =
            await supabaseClient
                .from("saturday_requests")
                .delete()
                .eq(
                    "employee_id",
                    editingEmployeeId
                )
                .select();


        if(saturdayResult.error){

            console.error(
                "Erreur suppression samedi :",
                saturdayResult.error
            );

            alert(
                "Erreur Supabase lors de la suppression des demandes du samedi :\n\n" +
                saturdayResult.error.message
            );

            return;

        }


        /* ====================================================
           2. SUPPRESSION DE L'EMPLOYE
        ==================================================== */

        const employeeResult =
            await supabaseClient
                .from("employees")
                .delete()
                .eq(
                    "id",
                    editingEmployeeId
                )
                .select();


        if(employeeResult.error){

            console.error(
                "Erreur suppression employé :",
                employeeResult.error
            );

            alert(
                "Erreur Supabase lors de la suppression de l'employé :\n\n" +
                employeeResult.error.message
            );

            return;

        }


        /* ====================================================
           3. VERIFICATION
        ==================================================== */

        if(
            !employeeResult.data ||
            employeeResult.data.length === 0
        ){

            console.error(
                "Supabase n'a supprimé aucun employé."
            );

            alert(
                "Supabase n'a supprimé aucun employé.\n\n" +
                "L'employé existe bien, mais les permissions Supabase empêchent probablement sa suppression."
            );

            return;

        }


        /* ====================================================
           4. NETTOYAGE
        ==================================================== */

        editingEmployeeId =
            null;


        closeModal(
            "employeeModal"
        );


        /* ====================================================
           5. RECHARGEMENT
        ==================================================== */

        await loadEmployees();

        await loadSaturdayRequests();

        renderAll();

        restorePage();


        alert(
            "L'employé « " +
            employee.name +
            " » a bien été supprimé."
        );

    }
    catch(error){

        console.error(
            "Erreur suppression employé :",
            error
        );


        alert(
            "Une erreur est survenue :\n\n" +
            error.message
        );

    }

}

/* ============================================================
   SAUVEGARDER EMPLOYE
============================================================ */

async function saveEmployee(){

    const name =
        document.getElementById(
            "employeeName"
        ).value.trim();


    const role =
        document.getElementById(
            "employeeRole"
        ).value.trim();
   
    const phone =
    document.getElementById(
        "employeePhone"
       ).value.trim();

    const teamId =
        Number(
            document.getElementById(
                "employeeTeam"
            ).value
        ) || null;


    if(!name){

        alert(
            "Merci d'indiquer un nom."
        );

        return;

    }


    let error;


    if(editingEmployeeId !== null){

        const result =
            await supabaseClient
                .from("employees")
                .update({

    role,

    phone:
        phone || null,

    team_id:
        teamId

})
                .eq(
                    "id",
                    editingEmployeeId
                );

        error =
            result.error;

    }
    else{

        const result =
            await supabaseClient
                .from("employees")
               .insert({

    name,

    role:
        role ||
        "Jardinier paysagiste",

    phone:
        phone || null,

    team_id:
        teamId,

    active:
        true

})
        error =
            result.error;

    }


    if(error){

        console.error(error);

        alert(
            "Erreur lors de l'enregistrement de l'employé."
        );

        return;

    }


    closeModal(
        "employeeModal"
    );


    await loadEmployees();

    renderAll();

    restorePage();

}