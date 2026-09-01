/* ============================================================
   EMBELIS PLANNING - PLANNING
============================================================ */

/* ============================================================
   DATES
============================================================ */

function mondayOfWeek(offset = 0){

    const date = new Date();

    const day =
        date.getDay() || 7;

    date.setHours(
        12,
        0,
        0,
        0
    );

    date.setDate(
        date.getDate()
        - day
        + 1
        + offset * 7
    );

    return date;

}

/* ============================================================
   SEMAINE
============================================================ */

function changeWeek(amount){

    weekOffset +=
        amount;


    renderPlanning();

}


function goToday(){
    weekOffset = 0;
    renderPlanning();
}

/* ============================================================
   CHANTIERS
============================================================ */

async function loadJobs(){

    /*
       Admin :
       travaille sur le brouillon.

       Employé :
       voit uniquement le planning publié.
    */

    const sourceTable =
        isAdmin()
        ? "jobs"
        : "published_jobs";


    console.log(
        "Planning chargé depuis :",
        sourceTable
    );


    const { data, error } =
        await supabaseClient
            .from(sourceTable)
            .select(`
                id,
                name,
                type,
                team_id,
                day,
                time,
                note,
                job_date
            `)
            .order("id");


    if(error){

        console.error(
            "Erreur chargement planning :",
            error
        );

        throw error;

    }


    jobs =
        (data || [])
        .map(job => ({

            id:
                job.id,

            name:
                job.name,

            type:
                job.type,

            team_id:
                job.team_id,

            /*
               On récupère le nom d'équipe
               depuis le tableau teams déjà chargé.
            */

            team:
                (
                    teams.find(
                        team =>
                            team.id ===
                            job.team_id
                    )
                    ?.name
                ) || "",

            day:
                Number(
                    job.day
                ),

            time:
                job.time,

            note:
                job.note,

            job_date:
                job.job_date

        }));

}

/* ============================================================
   CHANTIER - NOUVEAU
============================================================ */

function openNewJob(){

   if(!isAdmin()){

    alert(
        "Vous n'avez pas les permissions pour créer un chantier."
    );

    return;

}
   
    editingJobId =
        null;


    document.getElementById(
        "jobModalTitle"
    ).textContent =
        "Nouveau chantier";


    document.getElementById(
        "jobName"
    ).value =
        "";


    document.getElementById(
        "jobType"
    ).value =
        "entretien";


    refreshTeamSelects();


    document.getElementById(
        "jobDay"
    ).value =
        "1";


    document.getElementById(
        "jobTime"
    ).value =
        "6h30–14h30";


    document.getElementById(
        "jobNote"
    ).value =
        "";


    document.getElementById(
        "deleteJobButton"
    ).style.display =
        "none";


    openModal(
    "jobModal"
);


    updateSmartPlanning();

}


/* ============================================================
   HORAIRE AUTOMATIQUE
============================================================ */

document
    .getElementById("jobDay")
    .addEventListener(
        "change",
        function(){

            document.getElementById(
                "jobTime"
            ).value =
                this.value === "5"
                ?
                "6h30–13h30"
                :
                "6h30–14h30";


            updateSmartPlanning();

        }
    );


/* ============================================================
   MODIFIER CHANTIER
============================================================ */

function editJob(id){
   if(!isAdmin()){

    alert(
        "Vous n'avez pas les permissions pour modifier un chantier."
    );

    return;

}

    const job =
        jobs.find(
            j => j.id === id
        );

    if(!job)
        return;


    editingJobId =
        id;


    document.getElementById(
        "jobModalTitle"
    ).textContent =
        "Modifier / déplacer le chantier";


    document.getElementById(
        "jobName"
    ).value =
        job.name;


    document.getElementById(
        "jobType"
    ).value =
        job.type;


    refreshTeamSelects();


    document.getElementById(
        "jobTeam"
    ).value =
        String(job.team_id);


    document.getElementById(
        "jobDay"
    ).value =
        job.day;


    document.getElementById(
        "jobTime"
    ).value =
        job.time;


    document.getElementById(
        "jobNote"
    ).value =
        job.note || "";


    document.getElementById(
        "deleteJobButton"
    ).style.display =
        "block";


    openModal(
    "jobModal"
);


    updateSmartPlanning();

}


/* ============================================================
   SAUVEGARDER CHANTIER
============================================================ */

async function saveJob(){

    const name =
        document.getElementById(
            "jobName"
        ).value.trim();


    if(!name){

        alert(
            "Merci d'indiquer le nom du chantier."
        );

        return;

    }


    const teamId =
        Number(
            document.getElementById(
                "jobTeam"
            ).value
        );


    const day =
        Number(
            document.getElementById(
                "jobDay"
            ).value
        );


    let time =
        document.getElementById(
            "jobTime"
        ).value;


    if(day === 5){

        time =
            "6h30–13h30";

    }


    const monday =
        mondayOfWeek(
            weekOffset
        );


    const jobDate =
        new Date(monday);


    jobDate.setDate(
        jobDate.getDate()
        + day
        - 1
    );


    const data = {

        name,

        type:
            document.getElementById(
                "jobType"
            ).value,

        team_id:
            teamId || null,

        day,

        time,

        note:
            document.getElementById(
                "jobNote"
            ).value,

        job_date:
            jobDate
            .toISOString()
            .split("T")[0]

    };


    let error;


    if(
        editingJobId === null
    ){

        const result =
            await supabaseClient
                .from("jobs")
                .insert(data);

        error =
            result.error;

    }
    else{

        const result =
            await supabaseClient
                .from("jobs")
                .update(data)
                .eq(
                    "id",
                    editingJobId
                );

        error =
            result.error;

    }


    if(error){

        console.error(error);

        alert(
            "Erreur lors de l'enregistrement du chantier."
        );

        return;

    }


    closeModal(
    "jobModal"
);


showPlanningChanged();


await loadJobs();


renderPlanning();

}


/* ============================================================
   SUPPRIMER CHANTIER
============================================================ */

async function deleteCurrentJob(){

    if(
        editingJobId === null
    )
        return;


    if(
        !confirm(
            "Supprimer ce chantier ?"
        )
    )
        return;


    const { error } =
        await supabaseClient
            .from("jobs")
            .delete()
            .eq(
                "id",
                editingJobId
            );


    if(error){

        console.error(error);

        alert(
            "Erreur lors de la suppression."
        );

        return;

    }


    closeModal(
        "jobModal"
    );


    showPlanningChanged();


await loadJobs();


renderPlanning();

}

/* ============================================================
   PLANNING
============================================================ */

function renderPlanning(){

    const monday =
        mondayOfWeek(
            weekOffset
        );


    document.getElementById(
        "weekLabel"
    ).textContent =
        "Semaine du " +
        formatDate(
            monday
        );


    let html = `

        <div class="cell day-header">
            Équipe
        </div>

    `;


    /* ========================================================
       EN-TÊTES DES JOURS
    ======================================================== */

    days.forEach(
        (day,index) => {

            const date =
                new Date(
                    monday
                );


            date.setDate(
                date.getDate() +
                index
            );


            const hours =
                index === 4
                ? "6h30–13h30"
                : "6h30–14h30";


            html += `

                <div class="cell day-header">

                    ${day}

                    <div class="day-date">

                        ${
                            formatDate(
                                date
                            )
                        }

                    </div>

                    <div class="day-hours">

                        ${hours}

                    </div>

                </div>

            `;

        }
    );


    /* ========================================================
       ÉQUIPES
    ======================================================== */

    teams.forEach(
        team => {


            const members =
                employees.filter(
                    employee =>
                        employee.team_id ===
                            team.id &&
                        employee.active !==
                            false
                );


            html += `

                <div class="cell team-cell">

                    <div class="team-name">

                        ${
                            escapeHtml(
                                team.name
                            )
                        }

                    </div>


                    <div class="team-members">

                        ${
                            members.length
                            ?
                            members
                                .map(
                                    employee =>
                                        escapeHtml(
                                            employee.name
                                        )
                                )
                                .join(" • ")
                            :
                            "Aucun salarié"
                        }

                    </div>

                </div>

            `;


            /* =================================================
               JOURS DE LA SEMAINE
            ================================================= */

            for(
                let day = 1;
                day <= 5;
                day++
            ){

                const currentDate =
                    new Date(
                        monday
                    );


                currentDate.setDate(
                    currentDate.getDate() +
                    day -
                    1
                );


                const currentDateString =
                    currentDate.getFullYear() +
                    "-" +
                    String(
                        currentDate.getMonth() + 1
                    ).padStart(
                        2,
                        "0"
                    ) +
                    "-" +
                    String(
                        currentDate.getDate()
                    ).padStart(
                        2,
                        "0"
                    );


                html += `

    <div
        class="
            cell
            team-cell
            ${
                isAdmin()
                ? "planning-add-cell"
                : ""
            }
        "

        ${
            isAdmin()
            ?
            `
                onclick="
                    openNewJobFromPlanningCell(
                        event,
                        ${team.id},
                        ${day}
                    )
                "

                title="Cliquer pour ajouter un chantier"
            `
            :
            ""
        }>

`;


                /* =============================================
                   CHANTIERS DE L'ÉQUIPE POUR CE JOUR
                ============================================= */

                const teamJobs =
                    jobs
                        .filter(
                            job =>
                                job.team_id ===
                                    team.id &&
                                job.job_date ===
                                    currentDateString
                        )
                        .sort(
                            (a,b) => {


                                const getStartMinutes =
                                    time => {

                                        if(!time)
                                            return 9999;


                                        const match =
                                            time.match(
                                                /^(\d{1,2})h(?:(\d{2}))?/
                                            );


                                        if(!match)
                                            return 9999;


                                        const hours =
                                            Number(
                                                match[1]
                                            );


                                        const minutes =
                                            match[2]
                                            ? Number(
                                                match[2]
                                            )
                                            : 0;


                                        return (
                                            hours * 60 +
                                            minutes
                                        );

                                    };


                                return (
                                    getStartMinutes(
                                        a.time
                                    ) -
                                    getStartMinutes(
                                        b.time
                                    )
                                );

                            }
                        );


                /* =============================================
                   AFFICHAGE DES CHANTIERS
                ============================================= */

                teamJobs.forEach(
                    job => {


                        /*
                           Recherche un changement récent.

                           Important :
                           on ne dépend plus de is_read.

                           Même si l'employé clique sur
                           "Voir" dans la notification,
                           Nouveau / Modifié reste affiché
                           pendant 24 heures.
                        */

                        const recentChange =
                            recentPlanningChanges.find(
                                change =>
                                    Number(
                                        change.id
                                    ) ===
                                    Number(
                                        job.id
                                    )
                            );


                        const hasRecentChange =
                            Boolean(
                                recentChange
                            );


                        const changeTitle =
                            recentChange
                            ? recentChange.title
                            : "";


                        const isNewJob =
                            changeTitle ===
                            "Nouveau chantier au planning";


                        html += `

                            <div
                                class="
                                    job
                                    ${job.type}
                                    ${
                                        hasRecentChange
                                        ? (
                                            isNewJob
                                            ? "job-new"
                                            : "job-modified"
                                        )
                                        : ""
                                    }
                                "
                                onclick="
                                    editJob(
                                        ${job.id}
                                    )
                                ">


                                ${
                                    hasRecentChange
                                    ?
                                    `

                                        <div
                                            class="${
                                                isNewJob
                                                ? "job-new-badge"
                                                : "job-change-badge"
                                            }">

                                            ${
                                                isNewJob
                                                ? "✦ Nouveau"
                                                : "⚠ Modifié"
                                            }

                                        </div>

                                    `
                                    :
                                    ""
                                }


                                <div class="job-title">

                                    ${
                                        escapeHtml(
                                            job.name
                                        )
                                    }

                                </div>


                                <div class="job-time">

                                    ${
                                        escapeHtml(
                                            job.time
                                        )
                                    }

                                </div>


                                ${
                                    job.note
                                    ?
                                    `

                                        <div class="job-note">

                                            ${
                                                escapeHtml(
                                                    job.note
                                                )
                                            }

                                        </div>

                                    `
                                    :
                                    ""
                                }


                            </div>

                        `;

                    }
                );


                html += `

                    </div>

                `;

            }

        }
    );


    /* ========================================================
       INJECTION DU PLANNING DESKTOP
    ======================================================== */

    const planningGrid =
        document.getElementById(
            "planningGrid"
        );


    if(planningGrid){

        planningGrid.innerHTML =
            html;

    }


    /* ========================================================
       STATISTIQUES
    ======================================================== */

    const statEmployees =
        document.getElementById(
            "statEmployees"
        );


    if(statEmployees){

        statEmployees.textContent =
            employees.length;

    }


    const statTeams =
        document.getElementById(
            "statTeams"
        );


    if(statTeams){

        statTeams.textContent =
            teams.length;

    }


    const statJobs =
        document.getElementById(
            "statJobs"
        );


    if(statJobs){

        statJobs.textContent =
            jobs.length;

    }


    /* ========================================================
       PLANNING MOBILE
    ======================================================== */

    if(
        window.innerWidth <= 768
    ){

        setMobilePlanningView(
            mobilePlanningView
        );

    }

}

 /* ============================================================
   NOUVEAU CHANTIER DEPUIS UNE CASE DU PLANNING PC
============================================================ */

function openNewJobFromPlanningCell(
    event,
    teamId,
    day
){

    /*
       Fonction disponible uniquement
       sur la version PC.
    */

    if(
        window.innerWidth <= 768
    ){

        return;

    }


    /*
       Réservé à l'administrateur.
    */

    if(!isAdmin()){

        return;

    }


    /*
       Si on clique sur un chantier existant,
       on laisse editJob() fonctionner.

       Cela évite d'ouvrir en même temps
       "Modifier chantier"
       et "Nouveau chantier".
    */

    if(
        event.target.closest(
            ".job"
        )
    ){

        return;

    }


    /*
       Ouvre la modale normale.
    */

    openNewJob();


    /*
       Force l'équipe correspondant
       à la ligne sur laquelle on a cliqué.
    */

    document.getElementById(
        "jobTeam"
    ).value =
        String(
            teamId
        );


    /*
       Force le jour correspondant
       à la colonne.
    */

    document.getElementById(
        "jobDay"
    ).value =
        String(
            day
        );


    /*
       Horaire automatique.
    */

    document.getElementById(
        "jobTime"
    ).value =
        day === 5
        ? "6h30–13h30"
        : "6h30–14h30";


    /*
       Affiche quand même la recommandation
       du planning intelligent,
       sans remplacer l'équipe sélectionnée.
    */

    const recommendation =
        recommendTeam(
            day
        );


    if(recommendation){

        showSmartRecommendation(
            recommendation
        );

    }
}

/* ============================================================
   PLANNING INTELLIGENT
============================================================ */

/*
   Première logique :

   1. On regarde combien de chantiers chaque équipe
      possède le jour choisi.

   2. On regarde combien de salariés sont dans l'équipe.

   3. On favorise :
      - les équipes avec moins de chantiers
      - les équipes avec davantage de salariés
      - les équipes totalement libres

   4. On explique la recommandation.
*/

function getTeamWorkload(
    teamId,
    day
){

    return jobs.filter(
        job =>
            job.team_id === teamId &&
            Number(job.day) === Number(day)
    ).length;

}


function getTeamMembers(
    teamId
){

    return employees.filter(
        employee =>
            employee.team_id === teamId &&
            employee.active !== false
    );

}


function recommendTeam(day){

    if(!teams.length)
        return null;


    const evaluations =
        teams.map(team => {

            const workload =
                getTeamWorkload(
                    team.id,
                    day
                );

            const members =
                getTeamMembers(
                    team.id
                ).length;


            /*
               Score :

               moins de chantiers = mieux
               plus de salariés = mieux
            */

            const score =
                (workload * 10)
                - members;


            return {

                team,

                workload,

                members,

                score

            };

        });


    evaluations.sort(
        (a,b) =>
            a.score - b.score
    );


    return evaluations[0];

}


function updateSmartPlanning(){

    const day =
        Number(
            document.getElementById(
                "jobDay"
            ).value
        );

    const recommendation =
        recommendTeam(day);

    const select =
        document.getElementById(
            "jobTeam"
        );


    if(
        !recommendation ||
        !select
    )
        return;


    /*
       On ne force pas le choix lors
       d'une modification.
    */

    if(
        editingJobId === null
    ){

        select.value =
            String(
                recommendation.team.id
            );

    }


    showSmartRecommendation(
        recommendation
    );

}


function showSmartRecommendation(
    recommendation
){

    let box =
        document.getElementById(
            "smartPlanningBox"
        );


    if(!box){

        box =
            document.createElement(
                "div"
            );

        box.id =
            "smartPlanningBox";

        box.style.marginTop =
            "8px";

        box.style.padding =
            "10px 12px";

        box.style.borderRadius =
            "9px";

        box.style.background =
            "#edf5e9";

        box.style.border =
            "1px solid #d3e5ca";

        box.style.fontSize =
            "11px";


        const select =
            document.getElementById(
                "jobTeam"
            );

        select.parentElement
            .appendChild(box);

    }


    if(!recommendation){

        box.innerHTML =
            "🧠 Aucune équipe disponible.";

        return;

    }


    let message =
        `
        🧠 <b>Planning intelligent</b><br>
        Équipe recommandée :
        <b>${escapeHtml(recommendation.team.name)}</b>
        <br>
        ${recommendation.workload}
        chantier(s) prévu(s) ce jour
        •
        ${recommendation.members}
        salarié(s)
        `;


    if(
        recommendation.workload === 0
    ){

        message +=
            `<br>
            <span style="color:#3f6d2c">
                ✓ Équipe actuellement libre ce jour.
            </span>`;

    }
    else if(
        recommendation.workload === 1
    ){

        message +=
            `<br>
            <span style="color:#80651a">
                ⚠ 1 chantier déjà prévu.
            </span>`;

    }
    else{

        message +=
            `<br>
            <span style="color:#a32c25">
                ⚠ Équipe fortement chargée ce jour.
            </span>`;

    }


    box.innerHTML =
        message;

}

   /* ============================================================
   PLANNING INTELLIGENT MOBILE
============================================================ */

function toggleSmartPlanningMobile(){

    if(
        window.innerWidth > 768
    )
        return;


    const panel =
        document.getElementById(
            "smartPanel"
        );


    if(!panel)
        return;


    panel.classList.toggle(
        "open"
    );

}

 /* ============================================================
   MODE D'AFFICHAGE PLANNING MOBILE
============================================================ */

function setMobilePlanningView(
    view,
    clickedButton = null
){

    mobilePlanningView =
        view;


    localStorage.setItem(
        "embelis_mobile_planning_view",
        view
    );


    const summary =
        document.getElementById(
            "mobilePlanningSummary"
        );


    const full =
        document.getElementById(
            "mobilePlanningFull"
        );


    if(summary){

        summary.style.display =
            view === "summary"
            ? "block"
            : "none";

    }


    if(full){

        full.style.display =
            view === "full"
            ? "block"
            : "none";

    }


    document
        .querySelectorAll(
            ".mobile-planning-view-button"
        )
        .forEach(
            button =>
                button.classList.toggle(
                    "active",
                    button.dataset.view === view
                )
        );


    if(
        view === "summary"
    ){

        renderMobilePlanningSummary();

    }
    else{

        renderMobilePlanningFull();

    }

}

   /* ============================================================
   JOUR SELECTIONNE - PLANNING MOBILE
============================================================ */

function selectMobilePlanningDay(
    day
){

    mobileSelectedDay =
        Number(day);



    renderMobilePlanningSummary();

}

/* ============================================================
   PLANNING MOBILE - MA SEMAINE
============================================================ */

function renderMobilePlanningSummary(){

    const container =
        document.getElementById(
            "mobilePlanningSummary"
        );


    if(!container)
        return;


    const monday =
        mondayOfWeek(
            weekOffset
        );


    /* ========================================================
       BARRE DES JOURS
    ======================================================== */

    let daysHtml =
        "";


    days.forEach(
        (dayName,index) => {

            const dayNumber =
                index + 1;


            const date =
                new Date(
                    monday
                );


            date.setDate(
                date.getDate() +
                index
            );


            daysHtml += `

                <button
                    class="
                        mobile-day-button
                        ${
                            mobileSelectedDay ===
                            dayNumber
                            ? "active"
                            : ""
                        }
                    "
                    onclick="
                        selectMobilePlanningDay(
                            ${dayNumber}
                        )
                    ">

                    <span class="mobile-day-name">

                        ${
                            dayName
                                .substring(0,3)
                        }

                    </span>

                    <strong>

                        ${
                            date.getDate()
                        }

                    </strong>

                </button>

            `;

        }
    );


    /* ========================================================
       DATE SELECTIONNEE
    ======================================================== */

    const selectedDate =
        new Date(
            monday
        );


    selectedDate.setDate(
        selectedDate.getDate() +
        mobileSelectedDay -
        1
    );


    const selectedDateString =
        selectedDate.getFullYear() +
        "-" +
        String(
            selectedDate.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            selectedDate.getDate()
        ).padStart(
            2,
            "0"
        );


    /* ========================================================
       CHANTIERS DU JOUR
    ======================================================== */

    const dayJobs =
        jobs
            .filter(
                job =>
                    job.job_date ===
                    selectedDateString
            )
            .sort(
                (a,b) => {

                    const timeToMinutes =
                        time => {

                            if(!time)
                                return 9999;


                            const match =
                                time.match(
                                    /^(\d{1,2})h(?:(\d{2}))?/
                                );


                            if(!match)
                                return 9999;


                            return (
                                Number(
                                    match[1]
                                ) * 60
                                +
                                Number(
                                    match[2] || 0
                                )
                            );

                        };


                    return (
                        timeToMinutes(
                            a.time
                        )
                        -
                        timeToMinutes(
                            b.time
                        )
                    );

                }
            );


    /* ========================================================
       CARTES CHANTIERS
    ======================================================== */

    let jobsHtml =
        "";


    if(
        dayJobs.length === 0
    ){

        jobsHtml = `

            <div class="mobile-empty-day">

                <div class="mobile-empty-icon">
                    🌿
                </div>

                <strong>
                    Aucun chantier
                </strong>

                <span>
                    Rien de prévu pour cette journée.
                </span>

            </div>

        `;

    }
    else{

        dayJobs.forEach(
            job => {

                const team =
                    teams.find(
                        team =>
                            team.id ===
                            job.team_id
                    );


                const teamMembers =
                    employees
                        .filter(
                            employee =>
                                employee.team_id === job.team_id &&
                                employee.active !== false
                        )
                        .map(
                            employee =>
                                employee.name
                        )
                        .join(" - ");


                const jobTypeClass =
                    String(
                        job.type || ""
                    )
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                    .replace(
                        /\s+/g,
                        "-"
                    );


                /* =============================================
                   CHANGEMENT RECENT - 24 HEURES
                ============================================= */

                const recentChange =
                    recentPlanningChanges.find(
                        change =>
                            Number(
                                change.id
                            ) ===
                            Number(
                                job.id
                            )
                    );


                const hasRecentChange =
                    Boolean(
                        recentChange
                    );


                const changeTitle =
                    recentChange
                    ? recentChange.title
                    : "";


                const isNewJob =
                    changeTitle ===
                    "Nouveau chantier au planning";


                const changeClass =
                    hasRecentChange
                    ? (
                        isNewJob
                        ? "mobile-job-new"
                        : "mobile-job-modified"
                    )
                    : "";


                const changeBadge =
                    hasRecentChange
                    ?
                    `

                        <div
                            class="
                                mobile-change-badge
                                ${
                                    isNewJob
                                    ? "new"
                                    : "modified"
                                }
                            ">

                            ${
                                isNewJob
                                ? "✦ Nouveau"
                                : "⚠ Modifié"
                            }

                        </div>

                    `
                    :
                    "";


                jobsHtml += `

                    <div
                        class="
                            mobile-job-card
                            ${jobTypeClass}
                            ${changeClass}
                        ">

                        ${changeBadge}


                        <div class="mobile-job-time">

                            ${
                                escapeHtml(
                                    job.time || "—"
                                )
                            }

                        </div>


                        <div class="mobile-job-content">

                            <div class="mobile-job-top">

                                <strong class="mobile-job-name">

                                    ${
                                        escapeHtml(
                                            job.name
                                        )
                                    }

                                </strong>


                                <span class="mobile-job-team">

                                    ${
                                        escapeHtml(
                                            team
                                            ? team.name
                                            : "Sans équipe"
                                        )
                                    }

                                </span>

                            </div>


                            <div class="mobile-job-type">

                                ${
                                    escapeHtml(
                                        job.type || ""
                                    )
                                }

                            </div>


                            ${
                                job.note
                                ?
                                `

                                    <div class="mobile-job-note">

                                        ${
                                            escapeHtml(
                                                job.note
                                            )
                                        }

                                    </div>

                                `
                                :
                                ""
                            }


                            ${
                                hasRecentChange &&
                                teamMembers
                                ?
                                `

                                    <div class="mobile-job-members">

                                        <span class="mobile-job-members-icon">
                                            👥
                                        </span>

                                        <span>

                                            ${
                                                escapeHtml(
                                                    teamMembers
                                                )
                                            }

                                        </span>

                                    </div>

                                `
                                :
                                ""
                            }

                        </div>

                    </div>

                `;

            }
        );

    }


    /* ========================================================
       RENDU FINAL
    ======================================================== */

    container.innerHTML = `

        <div class="mobile-week-navigation">

            <button
                onclick="
                    changeWeek(-1);
                    renderMobilePlanningSummary();
                ">

                ‹

            </button>


            <div>

                <span>
                    Semaine du
                </span>

                <strong>

                    ${
                        formatDate(
                            monday
                        )
                    }

                </strong>

            </div>


            <button
                onclick="
                    changeWeek(1);
                    renderMobilePlanningSummary();
                ">

                ›

            </button>

        </div>


        <div class="mobile-days-strip">

            ${daysHtml}

        </div>


        <div class="mobile-day-jobs">

            ${jobsHtml}

        </div>

    `;

}

/* ============================================================
   PLANNING MOBILE - VUE COMPLETE PAR EQUIPE
============================================================ */

function renderMobilePlanningFull(){

    const container =
        document.getElementById(
            "mobilePlanningFull"
        );


    if(!container)
        return;


    const monday =
        mondayOfWeek(
            weekOffset
        );


    let teamsHtml =
        "";


    teams.forEach(
        team => {

            let daysHtml =
                "";


            days.forEach(
                (dayName,index) => {

                    const date =
                        new Date(
                            monday
                        );


                    date.setDate(
                        date.getDate() +
                        index
                    );


                    const dateString =
                        date.getFullYear() +
                        "-" +
                        String(
                            date.getMonth() + 1
                        ).padStart(2,"0") +
                        "-" +
                        String(
                            date.getDate()
                        ).padStart(2,"0");


                    const teamJobs =
                        jobs
                            .filter(
                                job =>
                                    job.team_id === team.id &&
                                    job.job_date === dateString
                            )
                            .sort(
                                (a,b) =>
                                    String(
                                        a.time || ""
                                    ).localeCompare(
                                        String(
                                            b.time || ""
                                        )
                                    )
                            );


                    let jobsHtml =
                        "";


                    if(
                        teamJobs.length === 0
                    ){

                        jobsHtml = `

                            <div class="mobile-team-day-empty">

                                —

                            </div>

                        `;

                    }
                    else{

                        teamJobs.forEach(
    job => {


        const jobTypeClass =
            String(
                job.type || ""
            )
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /\s+/g,
                "-"
            );


        const recentChange =
            recentPlanningChanges.find(
                change =>
                    Number(
                        change.id
                    ) ===
                    Number(
                        job.id
                    )
            );


        const hasRecentChange =
            Boolean(
                recentChange
            );


        const changeTitle =
            recentChange
            ? recentChange.title
            : "";


        const isNewJob =
            changeTitle ===
            "Nouveau chantier au planning";


        const changeClass =
            hasRecentChange
            ? (
                isNewJob
                ? "mobile-team-job-new"
                : "mobile-team-job-modified"
            )
            : "";


        const changeBadge =
            hasRecentChange
            ?
            `
                <div
                    class="
                        mobile-team-change-badge
                        ${
                            isNewJob
                            ? "new"
                            : "modified"
                        }
                    ">

                    ${
                        isNewJob
                        ? "✦ Nouveau"
                        : "⚠ Modifié"
                    }

                </div>
            `
            :
            "";


        jobsHtml += `

                                    <div
    class="
        mobile-team-job
        ${jobTypeClass}
        ${changeClass}
    "
                                        onclick="
                                            editJob(
                                                ${job.id}
                                            )
                                        ">

                                        ${changeBadge}

                                        <div class="mobile-team-job-time">

                                            ${
                                                escapeHtml(
                                                    job.time || "—"
                                                )
                                            }

                                        </div>


                                        <div class="mobile-team-job-name">

                                            ${
                                                escapeHtml(
                                                    job.name || "Chantier"
                                                )
                                            }

                                        </div>


                                        ${
                                            job.type
                                            ?
                                            `
                                                <div class="mobile-team-job-type">

                                                    ${
                                                        escapeHtml(
                                                            job.type
                                                        )
                                                    }

                                                </div>
                                            `
                                            :
                                            ""
                                        }

                                    </div>

                                `;

                            }
                        );

                    }


                    daysHtml += `

                        <div class="mobile-team-day">

                            <div class="mobile-team-day-header">

                                <span>

                                    ${
                                        dayName
                                            .substring(0,3)
                                    }

                                </span>

                                <strong>

                                    ${
                                        date.getDate()
                                    }

                                </strong>

                            </div>


                            <div class="mobile-team-day-content">

                                ${jobsHtml}

                            </div>

                        </div>

                    `;

                }
            );


            teamsHtml += `

                <section class="mobile-team-planning">

                    <div class="mobile-team-title">

                        <div>

                            <strong>
                                ${
                                    escapeHtml(
                                        team.name
                                    )
                                }
                            </strong>

                            <span>
                                Planning de l'équipe
                            </span>

                        </div>

                    </div>


                    <div class="mobile-team-scroll">

                        <div class="mobile-team-grid">

                            ${daysHtml}

                        </div>

                    </div>

                </section>

            `;

        }
    );


    container.innerHTML = `

        <div class="mobile-full-week-navigation">

            <button
                onclick="
                    changeWeek(-1);
                    renderMobilePlanningFull();
                ">

                ‹

            </button>


            <div>

                <span>
                    Planning complet
                </span>

                <strong>

                    Semaine du
                    ${
                        formatDate(
                            monday
                        )
                    }

                </strong>

            </div>


            <button
                onclick="
                    changeWeek(1);
                    renderMobilePlanningFull();
                ">

                ›

            </button>

        </div>


        <div class="mobile-full-hint">

            ← Faites glisser chaque équipe pour voir toute la semaine →

        </div>


        <div class="mobile-teams-list">

            ${teamsHtml}

        </div>

    `;

}

/* ============================================================
   PUBLICATION
============================================================ */

function showPlanningChanged(){

    document.getElementById(
        "publishBox"
    ).classList.add(
        "visible"
    );

}

/* ============================================================
   PUBLICATION DU PLANNING
============================================================ */

async function publishPlanning(){

    const confirmed =
        confirm(
            "Publier les modifications du planning ?\n\n" +
            "Les employés concernés verront le nouveau planning " +
            "et recevront leurs notifications."
        );


    if(!confirmed)
        return;


    const {
        data,
        error
    } =
        await supabaseClient
            .rpc(
                "publish_planning"
            );

         if(
    data?.publication_id
){

    const {
    data: sessionData
} =
    await supabaseClient
        .auth
        .getSession();


const accessToken =
    sessionData
        ?.session
        ?.access_token;


const {
    data:
        pushResult,
    error:
        pushError
} =
    await supabaseClient
        .functions
        .invoke(
            "send-publication-push",
            {
                body:{
                    publication_id:
                        data.publication_id
                },

                headers:{
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );


    if(pushError){

        console.error(
            "Erreur Push publication :",
            pushError
        );

    }
    else{

        console.log(
            "Push publication :",
            pushResult
        );

    }

}


    if(error){

    console.error(
        "ERREUR PUBLICATION COMPLETE :",
        JSON.stringify(
            error,
            null,
            2
        )
    );


    alert(
        "Erreur publication planning\n\n" +
        "Code : " +
        (error.code || "inconnu") +
        "\n\nMessage : " +
        (error.message || "inconnu") +
        "\n\nDétails : " +
        (error.details || "aucun") +
        "\n\nHint : " +
        (error.hint || "aucun")
    );

    return;

}


    console.log(
        "Résultat publication :",
        data
    );


    document.getElementById(
        "publishBox"
    ).classList.remove(
        "visible"
    );


    alert(
        "Planning publié.\n\n" +
        "Chantiers modifiés : " +
        (data?.modified || 0) +
        "\nNouveaux chantiers : " +
        (data?.added || 0) +
        "\nChantiers retirés : " +
        (data?.deleted || 0)
    );

}
