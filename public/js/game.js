
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

function lobbyEventListeners(socket){
    let lobby = document.getElementById("game-section-players-lobby");

    lobby.addEventListener('click', (event) => {
        event.preventDefault();

        console.log(event.target);
        if(event.target.id == `${me.role}-ready-lobby`){
            socket.emit('ready', {});
        }
    });
}

function bettingEventListeners(socket){
    let lobby = document.getElementById("game-section-players-betting");

    lobby.addEventListener('click', (event) => {
        event.preventDefault();

        console.log(event.target);
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

        console.log(event.target);
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

        console.log(event.target);
        if(event.target.id == `${me.role}-ready-resolution`){
            socket.emit('ready', {});
        }
    });
}

function changeActiveScreen(whichScreen){
    let screens = document.getElementsByClassName('game-section');
    for(let it = 0; it < screens.length; it++){
        screens[it].style.display = "none";
    }

    console.log(screens);

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
        <section class="card" id="card-${it}">
            <h1>${IntToCard[card]}</h1>
        </section>
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
                waitingFor.innerHTML += `${voter.name} - `;
            }
        });
    }
    else if(gameState.phase === Phase.DRAWING){
        gameState.players.forEach(player => {
            if(player.selection == null){
                waitingFor.innerHTML += `${player.name}`;
            }
        });
    }
}

function updateResolution(params){
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
        if(params[it].selection != undefined){
            playerElem.innerHTML = IntToCard[params[it].selection];
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

function updateScreen(params){
    console.log("Update Screen");
    console.log(me);
    console.log(gameState);
    console.log(params);

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

        updateResolution(params);
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
        console.log(data);

        me = data.player;
        gameState = data.gameState;

        updateScreen(null);
    });

    socket.on('user-joined', (data) => {
        console.log(data);

        /*
            Update Game State
        */
        gameState.players = data.gameState.players;
        gameState.voters = data.gameState.voters;

        /*
            Make UI Changes
        */
        updateScreen(null);
    });

    socket.on('bet-update', (data) => {
        console.log(data);

        /*
            Update Game State
        */
        gameState.currentBet = data.gameState.currentBet;

        /*
            Make UI Changes
        */
        updateScreen(null);
    });

    socket.on('player-ready', (data) => {
        console.log(data);

        /*
            Update Game State
        */
        gameState.phase = data.gameState.phase;
        gameState.players = data.gameState.players;
        gameState.winner = data.gameState.winner;

        /*
            Make UI Changes
        */
        updateScreen(null);
    });

    socket.on('provide-hand', (data) => {
        console.log(data);

        /*
            Update Game State
        */
        me.hand = data.user.hand;

        /*
            Make UI Changes
        */
        updateScreen(null);
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
        updateScreen(null);
    });

    socket.on('players-finished-picking', (data) => {
        console.log(data);

        /*
            Update Game State
        */
        me.waiting = data.user.waiting;
        gameState.players = data.gameState.players;
        gameState.phase = data.gameState.phase;
        gameState.winner = data.gameState.winner;

        let playersSelections = data.playersSelections;

        /*
            Make UI Changes
        */
        updateScreen(playersSelections);
    });

    socket.on('voter-voted', (data) => {
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
        updateScreen(null);
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
        updateScreen(null);
    });

    socket.on('not-joined', () => {
        alert('You are not part of this game. Please join by reloading the page.');
    });
}

function init(){
    validateSession();
    const params = new URLSearchParams(document.location.search);
    const gameCode = params.get("gameCode");
    updateGameCode(gameCode);
    let game = getGameByCode(gameCode);

    const socket = io('/');
    playGame(socket);
    lobbyEventListeners(socket);
    bettingEventListeners(socket);
    selectionEventListeners(socket);
    resolutionEventListeners(socket);

    socket.emit('join-game', {
        gameCode: gameCode,
        sessiontoken: localStorage.getItem('token')
    });
}

init();
