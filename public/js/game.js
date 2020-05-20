
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
}

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

function playGame(socket){
    let me = {
        role : null,
        hand : []
    };
    
    let game = {
        players : [ ], // { #, name, credits }
        voters : [ ], // name
        phase : Phase.LOBBY,
        currentBet : 0
    };

    socket.on('welcome', (data) => {
        console.log(data);

        me = data.player;
        game = data.gameState;
    });

    socket.on('user-joined', (data) => {
        console.log(data);
    });

    socket.on('player-ready', (data) => {
        console.log(data);
    });

    socket.on('stand-by', (data) => {
        console.log(data);
    });

    socket.on('provide-hand', (data) => {
        console.log(data);
    });

    socket.on('player-picked-card', (data) => {
        console.log(data);
    });

    socket.on('players-finished-picking', (data) => {
        console.log(data);
    });

    socket.on('voter-voter', (data) => {
        console.log(data);
    });

    socket.on('voters-finished-voting', (data) => {
        console.log(data);
    });

    socket.on('user-left', (data) => {
        console.log(data);
    });
}

function init(){
    validateSession();
    const params = new URLSearchParams(document.location.search);
    const gameCode = params.get("gameCode");
    game = getGameByCode(gameCode);

    const socket = io('/');
    playGame(socket);

    socket.emit('join-game', {
        gameCode: gameCode,
        sessiontoken: localStorage.getItem('token')
    });
}

init();
