/* ============================================================
   EMBELIS PLANNING
   MODULE EQUIPES

   Gestion :
   - chargement des équipes
   - affichage des équipes
   - création et modification des équipes
   - suppression des équipes
   - sélecteurs d'équipes
============================================================ */

/* ============================================================
   CHARGEMENT DES EQUIPES
============================================================ */

async function loadTeams(){

    const { data, error } =
        await supabaseClient
            .from("teams")
            .select("*")
            .order("id");

    if(error) throw error;

    teams = data || [];

}

/* ============================================================
   EQUIPES
============================================================ */

function renderTeams(){

    document.getElementById(
        "teamList"
    ).innerHTML =

        teams.map(team => {

            const members =
    employees.filter(
        employee =>
            employee.team_id === team.id &&
            employee.active !== false
    );


            return `

                <div class="team-card">

                    <h3>
                        ${escapeHtml(team.name)}
                    </h3>

                    <div class="small">

                        ${members.length}
                        employé(s)

                    </div>

                    <p>

                        ${
                            members.length
                            ?
                            members
                            .map(
                                e =>
                                    escapeHtml(e.name)
                            )
                            .join(" • ")
                            :
                            "Aucun employé affecté"
                        }

                    </p>

<div class="team-actions">

    <button
        class="small-btn"
        onclick="editTeam(${team.id})">

        ✏️ Modifier

    </button>


    <button
        class="small-btn"
        onclick="deleteTeam(${team.id})">

        🗑️ Supprimer

    </button>

</div>

                </div>

            `;

        })
        .join("");

}

   /* ============================================================
   MODIFIER EQUIPE
============================================================ */

function editTeam(id){

    const team =
        teams.find(
            team =>
                team.id === id
        );


    if(!team){

        alert(
            "Équipe introuvable."
        );

        return;

    }


    const newName =
        prompt(
            "Nouveau nom de l'équipe :",
            team.name
        );


    if(newName === null)
        return;


    const name =
        newName.trim();


    if(!name){

        alert(
            "Le nom de l'équipe ne peut pas être vide."
        );

        return;

    }


    if(name === team.name){

        return;

    }


    updateTeamName(
        id,
        name
    );

}

/* ============================================================
   SUPPRIMER EQUIPE
============================================================ */

async function deleteTeam(id){

    const team =
        teams.find(
            t => t.id === id
        );

    if(!team)
        return;


    /* Vérifier les employés actifs */

    const activeEmployees =
        employees.filter(
            employee =>
                employee.team_id === id &&
                employee.active !== false
        );


    if(activeEmployees.length > 0){

        alert(
            "Impossible de supprimer l'équipe « " +
            team.name +
            " ».\n\n" +
            activeEmployees.length +
            " employé(s) actif(s) sont encore affecté(s) à cette équipe.\n\n" +
            "Veuillez d'abord les affecter à une autre équipe."
        );

        return;

    }


    /* Vérifier les chantiers */

    const { data: teamJobs, error: jobsError } =
        await supabaseClient
            .from("jobs")
            .select("id, name")
            .eq(
                "team_id",
                id
            );


    if(jobsError){

        console.error(
            "Erreur recherche chantiers :",
            jobsError
        );

        alert(
            "Impossible de vérifier les chantiers.\n\n" +
            jobsError.message
        );

        return;

    }


    /* Confirmation */

    let message =
        "Supprimer définitivement l'équipe « " +
        team.name +
        " » ?\n\n";


    if(teamJobs && teamJobs.length > 0){

        message +=
            "Attention : " +
            teamJobs.length +
            " chantier(s) sont encore associés à cette équipe.\n\n" +

            "Ils seront conservés mais désaffectés de l'équipe.\n\n";

    }


    message +=
        "Les employés seront conservés.";


    if(!confirm(message))
        return;


    /* Désaffecter les employés inactifs */

    const { error: employeeError } =
        await supabaseClient
            .from("employees")
            .update({
                team_id: null
            })
            .eq(
                "team_id",
                id
            );


    if(employeeError){

        console.error(
            "Erreur détachement employés :",
            employeeError
        );

        alert(
            "Impossible de détacher les employés.\n\n" +
            employeeError.message
        );

        return;

    }


    /* Désaffecter les chantiers */

    if(
        teamJobs &&
        teamJobs.length > 0
    ){

        const { error: jobError } =
            await supabaseClient
                .from("jobs")
                .update({
                    team_id: null
                })
                .eq(
                    "team_id",
                    id
                );


        if(jobError){

            console.error(
                "Erreur désaffectation chantiers :",
                jobError
            );

            alert(
                "Impossible de désaffecter les chantiers.\n\n" +
                jobError.message
            );

            return;

        }

    }


    /* Supprimer l'équipe */

    const { data: deletedTeam, error: deleteError } =
        await supabaseClient
            .from("teams")
            .delete()
            .eq(
                "id",
                id
            )
            .select();


    if(deleteError){

        console.error(
            "Erreur suppression équipe :",
            deleteError
        );

        alert(
            "Supabase n'a pas pu supprimer cette équipe.\n\n" +
            deleteError.message
        );

        return;

    }


    /* Vérifier la suppression */

    if(
        !deletedTeam ||
        deletedTeam.length === 0
    ){

        alert(
            "Supabase n'a supprimé aucune équipe.\n\n" +
            "Les permissions Supabase empêchent probablement la suppression."
        );

        return;

    }


    /* Rechargement */

    await loadTeams();

    await loadEmployees();

    await loadJobs();

    renderAll();

    restorePage();


    alert(
        "L'équipe « " +
        team.name +
        " » a bien été supprimée."
    );

}


/* ============================================================
   ENREGISTRER NOM EQUIPE
============================================================ */

async function updateTeamName(id, name){

    console.log("Modification équipe :", id, name);

    const { data, error } =
        await supabaseClient
            .from("teams")
            .update({
                name: name
            })
            .eq("id", id)
            .select();


    if(error){

        console.error(
            "Erreur Supabase modification équipe :",
            error
        );

        alert(
            "Erreur Supabase :\n\n" +
            "Code : " + error.code +
            "\nMessage : " + error.message
        );

        return;

    }


    console.log(
        "Équipe modifiée :",
        data
    );


    if(!data || data.length === 0){

        alert(
            "Supabase n'a modifié aucune équipe.\n\n" +
            "L'équipe existe peut-être, mais les permissions Supabase empêchent sa modification."
        );

        return;

    }


    alert(
        "Équipe modifiée avec succès !"
    );


    await loadTeams();

    await loadEmployees();

    await loadJobs();

    renderAll();

    restorePage();

}

/* ============================================================
   CREER EQUIPE
============================================================ */

function openTeamModal(){

    document.getElementById(
        "teamName"
    ).value =
        "";


    openModal(
    "teamModal"
);

}


async function createTeam(){

    const name =
        document.getElementById(
            "teamName"
        ).value.trim();


    if(!name){

        alert(
            "Merci d'indiquer le nom de l'équipe."
        );

        return;

    }


    const { error } =
        await supabaseClient
            .from("teams")
            .insert({
                name
            });


    if(error){

        console.error(error);

        if(
            error.code === "23505"
        ){

            alert(
                "Cette équipe existe déjà."
            );

        }
        else{

            alert(
                "Erreur lors de la création de l'équipe."
            );

        }

        return;

    }


    closeModal(
        "teamModal"
    );


    await loadTeams();

    await loadEmployees();

    renderAll();

    restorePage();

}

/* ============================================================
   SELECTS EQUIPES
============================================================ */

function refreshTeamSelects(){

    const jobTeam =
        document.getElementById(
            "jobTeam"
        );

    const employeeTeam =
        document.getElementById(
            "employeeTeam"
        );

    if(!jobTeam || !employeeTeam)
        return;

    const options =
        teams.map(
            team =>

                `<option value="${team.id}">
                    ${team.name}
                </option>`

        ).join("");

    jobTeam.innerHTML =
        options;

    employeeTeam.innerHTML =
        options;

}