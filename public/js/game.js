
const Phase = {
    LOBBY : 0,
    BETTING : 1,
    VOTING : 2,
    DRAWING : 3,
    RESOLUTION : 4,
    WINNER : 5
};

const Card = {
    ROCK : 0,
    PAPER : 1,
    SCISSORS : 2
};

const CardImg = {
    0 : "../img/rock_hand.png",
    1 : "../img/paper_hand.png",
    2 : "../img/scissors_hand.png"
};

const IntToCard = {
    0 : 'ROCK',
    1 : 'PAPER',
    2 : 'SCISSORS'
};

const GameScreen = {
    LOBBY : 0,
    BETTING : 1,
    SELECTION : 2,
    STANDBY : 3,
    RESOLUTION : 4,
    WINNER : 5
};

// STATUS VARIABLES

let me = {
    role : null,
    hand : [],
    waiting : false
};

let gameState = {
    players : [ ], // { #, name, credits, selection, isReady }
    voters : [ ], // { name, voted }
    phase : Phase.LOBBY,
    currentBet : 0,
    winner : null
};

let latestSelections = [
    {}, // Player 1 - Selection
    {}  // Player 2 - Selection
]

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

async function getGameByCode(gameCode){
    let url = `/vote-rps/api/game/${gameCode}`;

    let settings = {
        method : 'GET',
        headers : {
            'Content-Type' : 'application/json',
            sessiontoken : localStorage.getItem('token')
        }
    };

    return fetch( url, settings )
        .then(response => {
            if(response.ok){
                return response.json();
            }

            throw new Error(response.statusText);
        })
        .then(responseJSON => {
            return responseJSON;
        })
        .catch(err => {
            alert(`Game with 'code=${gameCode}' does not exist.`);
            window.location.href = "/pages/home.html";
        });
}

function lobbyEventListeners(socket){
    let lobby = document.getElementById("game-section-players-lobby");

    lobby.addEventListener('click', (event) => {
        event.preventDefault();

        if(event.target.id == `${me.role}-ready-lobby`){
            socket.emit('ready', {});
        }
    });
}

function bettingEventListeners(socket){
    let lobby = document.getElementById("game-section-players-betting");

    lobby.addEventListener('click', (event) => {
        event.preventDefault();

        if(event.target.id == `${me.role}-ready-betting`){
            socket.emit('ready', {});
        }
        else if(event.target.id == 'make-bet-button'){
            let credits = document.getElementById('player-bet').value;
            if(!credits){
                return;
            }

            socket.emit('propose-bet', {
                credits
            });
        }
        else if(event.target.id == `${me.role}-retire-betting`){
            socket.emit('retire', {});
        }
    });
}

function selectionEventListeners(socket){
    let cards = document.getElementById("game-section-cards-selection");

    cards.addEventListener('click', (event) => {
        event.preventDefault();

        for(let it = 0; it < 3; it++){
            if(event.target.id === `card-${it}`){
                if(me.role === 'Voter'){
                    socket.emit('vote', {
                        cardIdx : it
                    });
                }
                else{
                    socket.emit('pick-card', {
                        cardIdx : it
                    });
                }
            }
        }
    })
}

function resolutionEventListeners(socket){
    let lobby = document.getElementById("game-section-players-resolution");

    lobby.addEventListener('click', (event) => {
        event.preventDefault();

        if(event.target.id == `${me.role}-ready-resolution`){
            socket.emit('ready', {});
        }
    });
}

function winnerEventListeners(socket){
    let lobby = document.getElementById("game-section-data-winner");

    lobby.addEventListener('click', (event) => {
        event.preventDefault();

        if(event.target.id == 'go-home-button'){
            socket.disconnect();
            window.location.href = "/pages/home.html";
        }
    });
}

function changeActiveScreen(whichScreen){
    let screens = document.getElementsByClassName('game-section');
    for(let it = 0; it < screens.length; it++){
        screens[it].style.display = "none";
    }

    switch(whichScreen){
        case GameScreen.LOBBY:
            screens.lobby.style.display = ""; // This works for some reason (?)
            break;
        
        case GameScreen.BETTING:
            screens.betting.style.display = ""; // This works for some reason (?)
            break;
        
        case GameScreen.SELECTION:
            screens.selection.style.display = ""; // This works for some reason (?)
            break;
        
        case GameScreen.STANDBY:
            screens.standBy.style.display = ""; // This works for some reason (?)
            break;
        
        case GameScreen.RESOLUTION:
            screens.resolution.style.display = ""; // This works for some reason (?)
            break;
    
        case GameScreen.WINNER:
            screens.winner.style.display = ""; // This works for some reason (?)
            break;
    }
}

function updateGameCode(gameCode){
    let gameHeader = document.getElementById("game-gameCode");

    gameHeader.innerHTML = gameCode;
}

function updateLobby(){
    /*
        Display Relevant Info
    */
    let playerElem = null;
    for(let it = 0; it < gameState.players.length; it++){
        playerElem = document.getElementById(`game-section-players-name-player${it + 1}-lobby`);

        if(gameState.players[it].name != undefined){
            playerElem.innerHTML = gameState.players[it].name;
        }
        else{
            playerElem.innerHTML = " - - - ";
        }

        playerElem = document.getElementById(`player${it + 1}-ready-lobby`);
        if(gameState.players[it].isReady){
            playerElem.style.background = "green";
        }
        else{
            playerElem.style.background = "red";
        }
    }

    let voters = document.getElementById("game-section-voters-list-lobby")
    voters.innerHTML = "";
    gameState.voters.forEach(voter => {
        voters.innerHTML += `
        <div class="voters-list-voter">
            ${voter.name}
        </div>
        `;
    });
}

function updateBetting(){
    /*
        DISPLAY RELEVANT INFO
    */

    let playerElem = null;
    for(let it = 0; it < gameState.players.length; it++){
        playerElem = document.getElementById(`game-section-players-name-player${it + 1}-betting`);

        if(gameState.players[it].name != undefined){
            playerElem.innerHTML = gameState.players[it].name;
        }
        else{
            playerElem.innerHTML = " - - - ";
        }

        playerElem = document.getElementById(`player${it + 1}-ready-betting`);
        if(gameState.players[it].isReady){
            playerElem.style.background = "green";
        }
        else{
            playerElem.style.background = "red";
        }

        playerElem = document.getElementById(`game-section-players-credits-player${it + 1}-betting`);
        if(gameState.players[it].credits != undefined){
            playerElem.innerHTML = `CREDITS: ${gameState.players[it].credits}`;
        }
        else{
            playerElem.innerHTML = 'CREDITS: ###';
        }
    }

    let voters = document.getElementById("game-section-voters-list-betting")
    voters.innerHTML = "";
    gameState.voters.forEach(voter => {
        voters.innerHTML += `
        <div class="voters-list-voter">
            ${voter.name}
        </div>
        `;
    });

    let currentBet = document.getElementById('game-section-currentBet-betting');
    currentBet.innerHTML = gameState.currentBet;
}

function updateSelection(){
    /*
        DISPLAY RELEVANT INFO
    */
    let displayCards = document.getElementById('game-section-cards-selection');
    displayCards.innerHTML = "";

    let it = 0;
    me.hand.forEach(card => {
        displayCards.innerHTML += `
        <img class="card-img" class="card" id="card-${it}" src="${CardImg[card]}" alt="${IntToCard[card]}"/>
        `
        it++;
    });
}

function updateStandBy(){
    /*
        DISPLAY RELEVANT INFO
    */
    let waitingFor = document.getElementById("game-section-waitingFor-standBy");
    waitingFor.innerHTML = "";

    if(gameState.phase === Phase.VOTING){
        gameState.voters.forEach(voter => {
            if(!voter.voted){
                waitingFor.innerHTML += `
                <div class="user-list-waitingFor">
                    ${voter.name}
                </div>`;
            }
        });
    }
    else if(gameState.phase === Phase.DRAWING){
        gameState.players.forEach(player => {
            if(player.selection == null){
                waitingFor.innerHTML += `
                <div class="user-list-waitingFor">
                    ${player.name}
                </div>`;
            }
        });
    }
}

function updateResolution(){
    /*
        DISPLAY RELEVANT INFO
    */

    let playerElem = null;
    for(let it = 0; it < gameState.players.length; it++){
        playerElem = document.getElementById(`game-section-players-name-player${it + 1}-resolution`);

        if(gameState.players[it].name != undefined){
            playerElem.innerHTML = gameState.players[it].name;
        }
        else{
            playerElem.innerHTML = " - - - ";
        }

        playerElem = document.getElementById(`player${it + 1}-ready-resolution`);
        if(gameState.players[it].isReady){
            playerElem.style.background = "green";
        }
        else{
            playerElem.style.background = "red";
        }

        playerElem = document.getElementById(`game-section-players-credits-player${it + 1}-resolution`);
        if(gameState.players[it].credits != undefined){
            playerElem.innerHTML = `CREDITS: ${gameState.players[it].credits}`;
        }
        else{
            playerElem.innerHTML = 'CREDITS: ###';
        }

        playerElem = document.getElementById(`player${it + 1}-selection-resolution`);
        if(latestSelections[it].selection != undefined){
            playerElem.innerHTML = `
            <img class="card-img" class="card" id="card-${it}" src="${CardImg[latestSelections[it].selection]}" alt="${IntToCard[latestSelections[it].selection]}"/>
            `
        }
        else{
            playerElem.innerHTML = 'SELECTION';
        }
    }

    let voters = document.getElementById("game-section-voters-list-resolution");
    voters.innerHTML = "";
    gameState.voters.forEach(voter => {
        voters.innerHTML += `
        <div class="voters-list-voter">
            ${voter.name}
        </div>
        `;
    });
    
    let winner = document.getElementById("game-section-winner-resolution");
    winner.innerHTML = gameState.winner;
}

function updateWinner(){
    let winner = document.getElementById("game-section-winner-winner");
    winner.innerHTML = gameState.winner;
}

function updateScreen(){

    // LOBBY PHASE
    if(gameState.phase === Phase.LOBBY){
        /*
            Change Active Screen
        */
        changeActiveScreen(GameScreen.LOBBY);

        updateLobby();
    }

    // BETTING PHASE
    if(gameState.phase === Phase.BETTING){
        /*
            Change Active Screen
        */
        changeActiveScreen(GameScreen.BETTING);

        updateBetting();
    }

    // VOTING PHASE
    if(gameState.phase === Phase.VOTING){
        /*
            Change Active Screen
        */
        if(me.role == 'Voter' && !me.waiting){
            changeActiveScreen(GameScreen.SELECTION);

            updateSelection();
        }
        else{
            changeActiveScreen(GameScreen.STANDBY);

            updateStandBy();
        }
    }

    // DRAWING PHASE
    if(gameState.phase === Phase.DRAWING){
        /*
            Change Active Screen
        */
        if(me.role == 'Voter' || me.waiting){
            changeActiveScreen(GameScreen.STANDBY);

            updateStandBy();
        }
        else{
            changeActiveScreen(GameScreen.SELECTION);

            updateSelection();
        }
    }

    // RESOLUTION PHASE
    if(gameState.phase === Phase.RESOLUTION){
        /*
            Change Active Screen
        */
        changeActiveScreen(GameScreen.RESOLUTION);

        updateResolution();
    }

    // WINNER PHASE
    if(gameState.phase === Phase.WINNER){
        /*
            CHANGE ACTIVE SCREEN
        */
        changeActiveScreen(GameScreen.WINNER);

        updateWinner();
    }
}

function playGame(socket){
    socket.on('welcome', (data) => {
        console.log('welcome');
        console.log(data);

        me = data.player;
        gameState = data.gameState;
        latestSelections = data.playersSelections;

        updateScreen();
    });

    socket.on('user-joined', (data) => {
        console.log('user-joined');
        console.log(data);

        /*
            Update Game State
        */
        gameState.players = data.gameState.players;
        gameState.voters = data.gameState.voters;

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('bet-update', (data) => {
        console.log('bet-update');
        console.log(data);

        /*
            Update Game State
        */
        gameState.players = data.gameState.players;
        gameState.currentBet = data.gameState.currentBet;

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('player-ready', (data) => {
        console.log('player-ready');
        console.log(data);

        /*
            Update Game State
        */
        gameState.phase = data.gameState.phase;
        gameState.players = data.gameState.players;
        gameState.winner = data.gameState.winner;

        /*
            Make UI Changesplayer-
        */
        updateScreen();
    });

    socket.on('provide-hand', (data) => {
        console.log('provide-hand');
        console.log(data);

        /*
            Update Game State
        */
        me.hand = data.user.hand;

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('player-picked-card', (data) => {
        console.log('player-picked-card');
        console.log(data);

        /*
            Update Game State
        */
        gameState.players = data.gameState.players;

        if(data.user != null){
            if(data.user.hand != null){
                me.hand = data.user.hand;
            }
            if(data.user.waiting != null){
                me.waiting = data.user.waiting;
            }
        }

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('players-finished-picking', (data) => {
        console.log('player-finished-picking');
        console.log(data);

        /*
            Update Game State
        */
        me.waiting = data.user.waiting;
        gameState.players = data.gameState.players;
        gameState.phase = data.gameState.phase;
        gameState.winner = data.gameState.winner;

        latestSelections = data.playersSelections;

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('voter-voted', (data) => {
        console.log('voter-voted');
        console.log(data);

        /*
            Update Game State
        */
        gameState.voters = data.gameState.voters;

        if(data.user != null){
            if(data.user.waiting != null){
                me.waiting = data.user.waiting;
            }
        }

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('voters-finished-voting', (data) => {
        console.log('voters-finished-voting');
        console.log(data);

        /*
            Update Game State
        */
        me.waiting = data.user.waiting;
        gameState.phase = data.gameState.phase;

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('user-left', (data) => {
        console.log('user-left');
        console.log(data);

        /*
            Update Game State
        */
        gameState.players = data.gameState.players;
        gameState.voters = data.gameState.voters;

        /*
            Make UI Changes
        */
        updateScreen();
    });

    socket.on('not-joined', () => {
        alert('You are not part of this game. Please join by reloading the page.');
    });
}

function init(){
    changeActiveScreen(null);
    validateSession();
    const params = new URLSearchParams(document.location.search);
    const gameCode = params.get("gameCode");
    updateGameCode(gameCode);

    getGameByCode(gameCode)
        .then(game => {
            if(!game){
                // GAME NOT FOUND
                throw new Error(`Game 'code=${game.code}' not found.\n Returning Home.`);
            }

            if(game.status == 1){
                // GAME IS FINISHED
                throw new Error(`Game 'code=${game.code}' is aleady finished.\n Returning Home.`);
            }

            const socket = io('/');
            playGame(socket);
            lobbyEventListeners(socket);
            bettingEventListeners(socket);
            selectionEventListeners(socket);
            resolutionEventListeners(socket);
            winnerEventListeners(socket);
        
            socket.emit('join-game', {
                gameCode: game.code,
                sessiontoken: localStorage.getItem('token')
            });
        })
        .catch(err => {
            alert(err.message);
            window.location.href = "/pages/home.html";
        });
}

init();
