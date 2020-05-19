
let game = {};

function validateSession() {
    let url = '/vote-rps/api/validate-session';
    let settings = {
        method : 'GET', 
        headers : {
            sessiontoken : localStorage.getItem('token')
        }
    };

    fetch(url, settings)
        .then(response => {
            if(response.ok) {
                return response.json();
            }
            
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            // Session Validated
        })
        .catch(err => {
            window.location.href = "/index.html";
        });   
}

function getGameByCode(gameCode){
    let url = `/vote-rps/api/game/${gameCode}`;

    let settings = {
        method : 'GET',
        headers : {
            'Content-Type' : 'application/json'
        },
        headers : {
            sessiontoken : localStorage.getItem('token')
        }
    };

    fetch( url, settings )
        .then(response => {
            if(response.ok){
                return response.json();
            }
            
            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            console.log(responseJSON);
            return responseJSON;
        })
        .catch(err => {
            console.log(err);
            throw new Error(err.message);
        });
}

function init(){
    validateSession();
    const params = new URLSearchParams(document.location.search);
    const gameCode = params.get("gameCode");
    game = getGameByCode(gameCode);
}

init();
