/* ============================================================
   EMBELIS PLANNING - EMPLOYES
============================================================ */

/* ============================================================
   CHARGEMENT DES EMPLOYES
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
            .order("id");

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
   EMPLOYES
============================================================ */

function renderEmployees(){

    document.getElementById(
        "employeeGrid"
    ).innerHTML =

        employees
        .map(employee => {

            const isActive =
                employee.active !== false;


            const phoneLink =
                employee.phone
                ?
                employee.phone
                    .replace(
                        /\s+/g,
                        ""
                    )
                :
                "";


            return `

                <div class="employee">

                    <div class="employee-name">
                        ${escapeHtml(employee.name)}
                    </div>

                    <div class="employee-role">
                        ${escapeHtml(employee.role)}
                    </div>

                    <div class="employee-team">
                        ${escapeHtml(employee.team)}
                    </div>


                    ${
                        employee.phone
                        ?
                        `
                        <div class="employee-phone">

                            📞

                            <a
                                href="tel:${escapeHtml(phoneLink)}">

                                ${escapeHtml(employee.phone)}

                            </a>

                        </div>
                        `
                        :
                        `
                        <div class="employee-phone employee-phone-empty">

                            Aucun numéro renseigné

                        </div>
                        `
                    }


                    <span class="status ${
                        isActive
                        ? "present"
                        : "refused"
                    }">

                        ${
                            isActive
                            ? "Actif"
                            : "Inactif"
                        }

                    </span>

                    <div class="employee-actions">

                        <button
                            class="small-btn"
                            onclick="editEmployee(${employee.id})">

                            Modifier

                        </button>


                        ${
                            isActive
                            ?

                            `
                            <button
                                class="small-btn"
                                onclick="deactivateEmployee(${employee.id})">

                                🗑️ Désactiver

                            </button>
                            `

                            :

                            `
                            <button
                                class="small-btn"
                                onclick="reactivateEmployee(${employee.id})">

                                ↻ Réactiver

                            </button>
                            `
                        }

                    </div>

                </div>

            `;

        })
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
   
    openModal(
    "employeeModal"
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
        "Modifier l'employé";


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