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
            displayServerResponse(`Welcome back ${responseJSON.name}`);
        })
        .catch(err => {
            displayServerResponse(err.message);
            window.location.href = "/index.html";
        });   
}

function displayServerResponse(message){
    const response = document.querySelector('.response');

    response.innerHTML = `<div class="serverResponse"> ${message} </div>`;
}

function displayActiveGames(games){

    let gamesTable = document.querySelector('.active-games');

    gamesTable.innerHTML = "";

    games.forEach(game => {
        gamesTable.innerHTML += `
        <tr>
            <td class="tb_row">${game.owner.name}</td>
            <td class="tb_row">${game.players.length}/30</td>
            <td class="tb_row">
                <button class="join-game" id="${game.code}">
                    Join
                </button>
            </td>
        </tr>
        `
    });
}

function createGame(){
    let gameCode = "game-code";
    let url = '/vote-rps/api/game/newGame';
    let settings = {
        method : 'POST', 
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
            gameCode = responseJSON.code;
            joinGame(gameCode);
        })
        .catch(err => {
            displayServerResponse(err.message);
        });
}

function joinGame(gameCode){
    window.location.href = `/pages/game.html?gameCode=${gameCode}`;
}

function getActiveGames(){
    let url = '/vote-rps/api/games/active';

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
            displayActiveGames(responseJSON);
        })
        .catch(err => {
            displayServerResponse(err.message);
            throw new Error(err.message);
        });
}

function watchJoinForm(){
    let gamesTable = document.querySelector('.active-games');

    gamesTable.addEventListener('click', ( event ) => {
        event.preventDefault();

        if( event.target.matches('.join-game') ){
            gameCode = event.target.id;
            
            joinGame(gameCode);
        }
    });
}

function watchPlayGames(){
    let playGames = document.getElementById('play-games-section');

    playGames.addEventListener('click', (event) => {
        event.preventDefault();

        if(event.target.matches('#create-game-code')){
            createGame();
        }
        else if(event.target.matches('#join-game-code')){
            let gameCode = document.getElementById('joinGameCode').value;

            joinGame(gameCode);
        }
    })
}

function init(){
    validateSession();
    getActiveGames();
    watchJoinForm();
    watchPlayGames();
}

init();
