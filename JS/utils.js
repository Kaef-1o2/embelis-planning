/* ============================================================
   EMBELIS PLANNING - UTILITAIRES
============================================================ */


/* ============================================================
   SÉCURISATION TEXTE HTML
============================================================ */

function escapeHtml(text){

    if(
        text === null ||
        text === undefined
    ){
        return "";
    }

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

/* ============================================================
   FORMATAGE DATE
============================================================ */

function formatDate(date){

    return date.toLocaleDateString(
        "fr-FR",
        {
            day:"2-digit",
            month:"2-digit"
        }
    );

}

/* ============================================================
   FORMATAGE DATE FRANÇAISE
============================================================ */

function formatFrenchDate(
    date
){

    if(!date)
        return "";


    const parts =
        date.split("-");


    if(
        parts.length !== 3
    )
        return date;


    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
    );

}

/* ============================================================
   CONVERSION BASE64 URL → UINT8ARRAY
   Utilisée pour les notifications Push / VAPID
============================================================ */

function urlBase64ToUint8Array(
    base64String
){

    const padding =
        "=".repeat(
            (
                4 -
                base64String.length % 4
            ) % 4
        );


    const base64 =
        (
            base64String +
            padding
        )
        .replace(
            /-/g,
            "+"
        )
        .replace(
            /_/g,
            "/"
        );


    const rawData =
        window.atob(
            base64
        );


    return Uint8Array.from(
        [...rawData]
            .map(
                char =>
                    char.charCodeAt(0)
            )
    );

}