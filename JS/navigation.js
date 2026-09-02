/* ============================================================
   EMBELIS PLANNING - NAVIGATION
============================================================ */

/* ============================================================
   NAVIGATION
============================================================ */

document
    .querySelectorAll(
        ".menu-button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function(){

                const page =
                    this.dataset.page;


                saveCurrentPage(
                    page
                );


                document
                    .querySelectorAll(
                        ".menu-button"
                    )
                    .forEach(
                        b =>
                            b.classList.remove(
                                "active"
                            )
                    );


                this.classList.add(
                    "active"
                );


                document
                    .querySelectorAll(
                        ".page"
                    )
                    .forEach(
                        p =>
                            p.classList.remove(
                                "active"
                            )
                    );


                const target =
                    document.getElementById(
                        "page-" + page
                    );


                if(target)
                    target.classList.add(
                        "active"
                    );


                document.getElementById(
                    "topTitle"
                ).textContent =

                    this.querySelector(
                        ".menu-text"
                    ).textContent;

            }
        );

    });

    /* ============================================================
   NAVIGATION MOBILE
============================================================ */

function openMobilePage(
    page,
    clickedButton
){

    currentPage =
        page;


    localStorage.setItem(
        "embelis_current_page",
        currentPage
    );


    const desktopButton =
        document.querySelector(
            `.menu-button[data-page="${page}"]`
        );


    if(desktopButton){

        desktopButton.click();

    }


    document
        .querySelectorAll(
            ".mobile-nav-button"
        )
        .forEach(
            button =>
                button.classList.remove(
                    "active"
                )
        );


    if(clickedButton){

        clickedButton.classList.add(
            "active"
        );

    }

}

/* ============================================================
   MEMORISATION PAGE
============================================================ */

function saveCurrentPage(page){

    currentPage = page;

    localStorage.setItem(
        "embelis_current_page",
        page
    );

}


function restorePage(){

    const button =
        document.querySelector(
            `.menu-button[data-page="${currentPage}"]`
        );

    if(button){

        button.click();

    }
    else{

        const planningButton =
            document.querySelector(
                '.menu-button[data-page="planning"]'
            );

        if(planningButton)
            planningButton.click();

    }

}
