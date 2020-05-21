const express = require( 'express' );
const mongoose = require( 'mongoose' );
const cors = require('./middleware/cors');
const validateSessionToken = require( './middleware/loginVerifier' );
const morgan = require( 'morgan' );
const bodyParser = require( 'body-parser' );
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { DATABASE_URL, PORT, SECRET_TOKEN, PASSWORD_MASK } = require( './config' );
const { Users } = require('./models/usersModel');
const { Games, Status } = require('./models/gamesModel');

const app = express();
const jsonParser = bodyParser.json();

// Middleware
app.use(cors);
app.use(express.static("public"));
app.use(morgan('dev'));

function MaskUserPassword(user){
    user.password = PASSWORD_MASK;
    return user;
}

function MaskUsersPasswords(users) {
    users.forEach(user => {
        user.password = PASSWORD_MASK;
    });

    return users;
}

// SESSION VALIDATION

app.get('/vote-rps/api/validate-session', validateSessionToken, (req, res) => {
    return res.status(200).json(req.user);
});

// USERS CRUD


app.get('/vote-rps/api/users', jsonParser, (req, res) => {
    const { names } = req.body;

    if(!names){
        Users
            .getAll()
            .then(allUsers => {
                allUsers = MaskUsersPasswords(allUsers);
                return res.status(200).json(allUsers);
            })
            .catch(err => {
                res.statusMessage = "Something went wrong when retrieving Users.";
                return res.status(400).end();
            });
    }

    Users
        .getSeveralByName(names)
        .then(allUsers => {
            allUsers = MaskUsersPasswords(allUsers);
            return res.status(200).json(allUsers);
        })
        .catch(err => {
            res.statusMessage = "Something went wrong when retrieving Users.";
            return res.status(400).end();
        });
});

// Get User with UserName
app.get('/vote-rps/api/user/:userName', validateSessionToken, (req, res) => {
    let userName = req.params.userName;

    Users.getByName(userName)
        .then(result => {
            if(!result){
                res.statusMessage = `There is no recorded User with the 'name=${userName}'.`;
                return res.status(404).end();
            }

            result = MaskUserPassword(result);
            return res.status(200).json(result);
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when accessing the DB. Please try again later. ${err.errmsg}`;
            return res.status(500).end();
        });
})

// Log-In User (get sessionToken)
app.post('/vote-rps/api/user/login', jsonParser, (req, res) => {
    const { userName, password } = req.body;

    if(!userName || !password){
        res.statusMessage = "Parameter missing in the body of the request.";
        return res.status(406).end();
    }

    Users
        .getByName(userName)
        .then(user => {
            if(!user){
                res.statusMessage = `User with 'name=${userName}' was not found.`;
                return res.status(404).end();
            }

            bcrypt.compare(password, user.password)
                .then(result => {
                    if(result){
                        const userData = {
                            name : user.name
                        };

                        jwt.sign(userData, SECRET_TOKEN, {expiresIn : '30m'}, (err, token) => {
                            if(err){
                                res.statusMessage = err.message;
                                return res.status( 400 ).end();
                            }

                            return res.status(200).json({token});
                        });
                    }
                    else{
                        res.statusMessage = "Wrong credentials provided";
                        return res.status(409).end();
                    }
                })
                .catch( err => {
                    res.statusMessage = err.message;
                    return res.status( 400 ).end();
                });
        })
        .catch( err => {
            res.statusMessage = err.message;
            return res.status( 400 ).end();
        });
})

// Create a New User with UserName
app.post('/vote-rps/api/user/signup', jsonParser, (req, res) => {
    const { userName, password } = req.body;

    if(!userName || !password){
        res.statusMessage = "Parameter missing in the body of the request.";
        return res.status(406).end();
    }

    bcrypt.hash(password, 10)
        .then(hashedPass => {
            const newUser = {
                name : userName,
                password : hashedPass
            };

            Users
                .createUser(newUser)
                .then(createdUser => {
                    createdUser.password = null;
                    createdUser = MaskUserPassword(createdUser);
                    return res.status(201).json(createdUser);
                })
                .catch( err => {
                    res.statusMessage = `Something went wrong when creating new User. DB Message: ${err}`;
                    return res.status(400).end();
                });
        })
        .catch( err => {
            res.statusMessage = "Something went wrong when hashing new User pass.";
            return res.status(400).end();
        });
});

app.delete('/vote-rps/api/user/:name', validateSessionToken, (req, res) => {
    const userToDelete = req.params.name;
    const user = req.user;

    if(userToDelete != user.name){
        res.statusMessage = `You 'user=${user.name} do not have the permissions to delete User with 'userName=${userToDelete}'.`;
        return res.status(401).end();
    }

    Users
        .deleteUser(userToDelete)
        .then(response => {
            return res.status(200).json(response);
        })
        .catch(err => {
            res.message = err.message;
            return res.status(400).end();
        });
})

// GAMES CRUD

// Get Games Owned By User
app.get('/vote-rps/api/user/:userName/games', validateSessionToken, (req, res) => {
    const userName = req.params.userName;
    
    // Get User
    Users
        .getByName(userName)
        .then(user => {
            // Get Games Owned By User
            Games
                .getOwnedBy(user)
                .then(result => {
                    return res.status(200).json(result);
                })
                .catch(err => {
                    res.statusMessage = `Something went wrong when fetching games for Owner 'name=${userName}'.`;
                    return res.status(400).end();
                });
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when fetching User 'name=${userName}'.`;
            return res.status(400).end();
        });
});

// Get Active Games
app.get('/vote-rps/api/games/active', validateSessionToken, (req, res) => {
    Games
        .getActive()
        .then(result => {
            return res.status(200).json(result);
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when fetching active games. Err=${err.message}`;
            return res.status(400).end();
        })
})

// Get Game By Code
app.get('/vote-rps/api/game/:gameCode', validateSessionToken, (req, res) => {
    const gameCode = req.params.gameCode;

    Games
        .getByCode(gameCode)
        .then(result => {
            return res.status(200).json(result);
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when fetching Game 'code=${gameCode}'.`;
            return res.status(400).end();
        })
})

// Create a New Game Owned By User
app.post('/vote-rps/api/game/newGame', [jsonParser, validateSessionToken], (req, res) => {
    const userName = req.user.name;

    // Get User
    Users
        .getByName(userName)
        .then(user => {
            // Create Game for User
            Games
                .createGame({
                    owner: user
                })
                .then(result => {
                    return res.status(201).json(result);
                })
                .catch(err => {
                    res.statusMessage = `Something went wrong when creating new game for Owner 'name=${userName}'.`;
                    return res.status(400).end();
                });
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when fetching User 'name=${userName}'.`;
            return res.status(400).end();
        });
});

// TODO: Update Existing Game
app.patch('/vote-rps/api/game/:gameCode', [jsonParser, validateSessionToken], (req, res) => {

    /*
    players : [ userNames ],
    voters : [ userNames ],
    winner : userName,
    status : Number (Enum Status),
    winCondition : Number (Enum Status)
    */
   
});

const server = app.listen(PORT, '0.0.0.0', () =>{
    console.log( `This server is running on port ${PORT}` );

    new Promise( ( resolve, reject ) => {

        const settings = {
            useNewUrlParser: true, 
            useUnifiedTopology: true, 
            useCreateIndex: true
        };
        mongoose.connect( DATABASE_URL, settings, ( err ) => {
            if( err ){
                return reject( err );
            }
            else{
                console.log( "Database connected successfully." );
                return resolve();
            }
        })
    })
    .catch( err => {
        console.log( err );
    });
});

// === PLAY GAME ===
const Phase = {
    LOBBY : 0,
    BETTING : 1,
    VOTING : 2,
    DRAWING : 3,
    RESOLUTION : 4,
    FINISHED : 5
};

const Card = {
    ROCK : 0,
    PAPER : 1,
    SCISSORS : 2
};

const Compare = {
    0 : {
        weakTo: 1,
        strongTo: 2
    }, // Rock
    1 : {
        weakTo: 2, 
        strongTo: 0
    }, // Paper
    2: {
        weakTo: 0,
        strongTo: 1
    } // Scissors
};

const INITIAL_CREDITS = 120;
let games = new Object();
let whois = new Object();
const io = require('socket.io')(server);

function captureGameSnapshot(gameCode, game){
    /*
    // Id
    players : [{
        type : Schema.Types.ObjectId,
        ref : 'User'
    }],
    voters : [{
        type : Schema.Types.ObjectId,
        ref : 'User'
    }],
    winner : {
        type : Schema.Types.ObjectId,
        ref : 'User'
    },
    status : {
        type : Number,
        required : true,
        default : Status.ONGOING
    }
    */
    Users
        .getSeveralByName(Object.keys(game.players))
        .then(players => {
            Users
                .getSeveralByName(Object.keys(game.voters))
                .then(voters => {
                    Users
                        .getByName(game.winner)
                        .then(winner => {
                            let status = Status.ONGOING;
                            if(game.phase == Phase.FINISHED){
                                status = Status.FINISHED;
                            }

                            Games
                                .updateGame(gameCode, {
                                    players,
                                    voters,
                                    winner,
                                    status
                                })
                                .then(updatedGame => {
                                    console.log(`Captured Snapshot of Game 'game=${gameCode}'`);
                                })
                                .catch(err => {
                                    console.log(`Something went wrong when Capturing Snapshot of Game 'game=${gameCode}'.`);
                                    throw new Error(`Something went wrong when Capturing Snapshot of Game 'game=${gameCode}'.`);
                                });
                        })
                        .catch(err => {
                            console.log(`Something went wrong when Retrieving User 'user=${game.winner}'.`);
                            throw new Error(`Something went wrong when Retrieving User 'user=${game.winner}'.`);
                        });
                })
                .catch(err => {
                    console.log(`Something went wrong when Retrieving Users 'users=${game.players}'.`);
                    throw new Error(`Something went wrong when Retrieving Users 'users=${game.players}'.`);
                });
        })
        .catch(err => {
            console.log(`Something went wrong when Retrieving Users 'user=${game.players}'.`);
            throw new Error(`Something went wrong when Retrieving Users 'user=${game.players}'.`);
        });
}

function getPlayersState(players){
    let cleanPlayers = [{}, {}];
    
    Object.keys(players).forEach(player => {
        cleanPlayers[players[player].number - 1] = {
            number : players[player].number,
            name : players[player].name,
            credits : players[player].credits,
            selection : players[player].selection,
            isReady : players[player].isReady
        }
    });

    return cleanPlayers;
}

function getPlayersSelections(players){
    let selections = [{}, {}];
    
    Object.keys(players).forEach(player => {
        selections[players[player].number - 1] = {
            number : players[player].number,
            name : players[player].name,
            selection : players[player].selection
        }
    });

    return selections;
}

function getVotersState(voters){
    let cleanVoters = [ ];
    
    Object.keys(voters).forEach(voter => {
        cleanVoters.push({
            name : voters[voter].name,
            voted : voters[voter].voted
        });
    });

    return cleanVoters;
}

function arePlayersFinished(players){
    let allSelected = true;
    Object.keys(players).forEach(player => {
        console.log(`${player} - Selection: ${players[player].selection}`);
        if(players[player].selection == null){
            allSelected = false;
        }
    });

    return allSelected;
}

function areVotersFinished(voters){
    let allVoted = true;
    Object.keys(voters).forEach(voter => {
        console.log(`${voter} voted? ${voters[voter].voted}`);
        if(!voters[voter].voted){
            allVoted = false;
        }
    });

    console.log(`All Voted: ${allVoted}`);
    return allVoted;
}

function fillDeck(card_deck){
    let possibleCards = [Card.ROCK, Card.PAPER, Card.SCISSORS];

    while(card_deck.length < 30){
        card_deck.push(possibleCards[Math.floor(Math.random() * 3)]);
    }

    return card_deck;
}

function shuffleDeck(card_deck){
    return card_deck.sort(() => Math.random() - 0.5);;
}

function drawPlayerCards(gameCode){
    // Draw Player Cards
    let card_it = 0;
    Object.keys(games[gameCode].players).forEach(player => {
        games[gameCode].players[player].hand = [];
        for(let it = 0; it < 3; it++){
            games[gameCode].players[player].hand.push(games[gameCode].card_deck[card_it]);
            card_it++;
        }
        console.log(games[gameCode].players[player].hand);
    });

    // Provide Players of their Cards
    Object.keys(games[gameCode].players).forEach(player => {
        io.to(games[gameCode].players[player].socket.id).emit('provide-hand', {
            user : {
                hand : games[gameCode].players[player].hand
            }
        });
    });
}

function evaluateDeck(gameCode){
    allVoted = areVotersFinished(games[gameCode].voters);

    if(allVoted){
        // Change Phase of Game
        games[gameCode].phase = Phase.DRAWING;

        // Fill and Shuffle Decks
        games[gameCode].card_deck = fillDeck(games[gameCode].card_deck);
        games[gameCode].card_deck = shuffleDeck(games[gameCode].card_deck);

        drawPlayerCards(gameCode);
        Object.keys(games[gameCode].voters).forEach(voter => {
            games[gameCode].voters[voter].voted = false;
        });
    }

    /*
        Update All Players
    */
    if(allVoted){
        io.to(gameCode).emit('voters-finished-voting', {
            user : {
                waiting : false
            },
            gameState : {
                phase : games[gameCode].phase
            }
        });
    }
    else{
        io.to(gameCode).emit('voter-voted', {
            gameState : {
                voters : getVotersState(games[gameCode].voters)
            }
        })
    }
}

async function getUserFromToken(token){
    return jwt.verify(token, SECRET_TOKEN, async (err, decoded) => {
        if(err){
            return null;
        }

        return {
            name : decoded.name
        };
    });
}

// NOTE - Emit Private Message:
// io.to(socketId).emit('event', { message });

// Play Game
io.on('connection', (socket) => {
    let socketId = socket.id;

    /*
        Join Game
        {
            sessiontoken
        }
    */
    socket.on('join-game', async (data) => {
        console.log(`${socket.id} - join-game`);
        console.log(data);

        let user = null;
        let gameCode = data.gameCode;
        try {
            user = await getUserFromToken(data.sessiontoken);
            console.log(user);
        }
        catch{
            socket.error("Something went wrong when fetching your user.");
        }

        if(!user){
            return;
        }

        // Add Socket to list of know users
        whois[socketId] = {
            user,
            gameCode
        };

        // If game does not exists, create it
        if(games[gameCode] == null){
            games[gameCode] = {
                players : { }, // name : { #, name, credits, hand, selection, isReady, socket }
                voters : { }, // name : { name, voted, socket }
                phase : Phase.LOBBY,
                currentBet : 0,
                card_deck : [],
                winner : null
            }
        }

        // Add Users to game in FIFO basis (First Players, then Voters)
        // Welcome Player Again
        if(games[gameCode].players[user.name] != null){
            games[gameCode].players[user.name].socket = socket;

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `player${games[gameCode].players[user.name].number}`
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players),
                    voters : getVotersState(games[gameCode].voters)
                }
            });

            socket.emit('welcome', {
                player : {
                    role : `player${games[gameCode].players[user.name].number}`,
                    hand : games[gameCode].players[user.name].hand
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players), // { #, name, credits }
                    voters : getVotersState(games[gameCode].voters), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                }
            });
        }
        // Try to Add as a Player
        else if(Object.keys(games[gameCode].players).length < 2){
            games[gameCode].players[user.name] = {
                number : Object.keys(games[gameCode].players).length + 1,
                name : user.name,
                credits : INITIAL_CREDITS, // Default amount
                hand : [],
                selection : null,
                isReady : false,
                socket : socket
            };

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `player${games[gameCode].players[user.name].number}`
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players),
                    voters : getVotersState(games[gameCode].voters)
                }
            });

            socket.emit('welcome', {
                player : {
                    role : `player${games[gameCode].players[user.name].number}`,
                    hand : games[gameCode].players[user.name].hand
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players), // { #, name, credits }
                    voters : getVotersState(games[gameCode].voters), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                }
            });
        }
        // Welcome Voter Again
        else if(games[gameCode].voters[user.name] != null){
            games[gameCode].voters[user.name].socket = socket;

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `player${games[gameCode].players[user.name].number}`
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players),
                    voters : getVotersState(games[gameCode].voters)
                }
            });

            socket.emit('welcome', {
                player : {
                    role : 'Voter',
                    hand : [Card.ROCK, Card.PAPER, Card.SCISSORS]
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players), // { #, name, credits }
                    voters : getVotersState(games[gameCode].voters), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                }
            });
        }
        // Try to Add as a Voter
        else if(Object.keys(games[gameCode].voters).length < 30){
            games[gameCode].voters[user.name] = {
                name : user.name,
                voted : false,
                socket : socket
            };

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : 'Voter'
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players),
                    voters : getVotersState(games[gameCode].voters)
                }
            });

            socket.emit('welcome', {
                player : {
                    role : 'Voter',
                    hand : [Card.ROCK, Card.PAPER, Card.SCISSORS]
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players), // { #, name, credits }
                    voters : getVotersState(games[gameCode].voters), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                }
            });
        }
        // Reject User
        else {
            socket.error(`Rejected. No more spaces in game ${gameCode}.`);
        }

        // Join Game Room
        socket.join(gameCode);

        // Display Game Status
        console.log(games[gameCode]);
    });

    /*
        Player - Ready
        {
            ...
        }
    */
    socket.on('ready', () => {
        console.log(`${socket.id} - ready`);
        console.log(whois[socketId]);

        /*
            Validate Socket is part of a game
        */
        if(!whois[socketId]){
           socket.emit('not-joined');
           return;
        }

        /*
            Variable Declaration
        */
        const user = whois[socketId].user;
        const gameCode = whois[socketId].gameCode;
        let usersReady = true;
        
        /*
            Validate User can partake in action.
        */
        if(!games[gameCode].players[user.name]){
            return;
        }
        if(games[gameCode].phase != Phase.LOBBY && games[gameCode].phase != Phase.BETTING && games[gameCode].phase != Phase.RESOLUTION){
            return;
        }

        /*
            Game Logic
        */
        if(games[gameCode].players[user.name].isReady){
            games[gameCode].players[user.name].isReady = false;
        }
        else{
            games[gameCode].players[user.name].isReady = true;
        }

        if(Object.keys(games[gameCode].players).length < 2){
            usersReady = false;
        }
        
        Object.keys(games[gameCode].players).forEach(player => {
            if(!games[gameCode].players[player].isReady) usersReady = false;
        });


        // RAGE-QUIT SCENARIO
        if(games[gameCode].phase == Phase.RESOLUTION){
            // If the Winner has all the Money, end the game
            if(games[gameCode].players[games[gameCode].winner].credits >= (INITIAL_CREDITS*2)){
                games[gameCode].phase = Phase.FINISHED;

                // TODO: STORE GAME IN DB
                captureGameSnapshot(gameCode, games[gameCode]);
            }
        }

        if(usersReady){
            if(games[gameCode].phase == Phase.LOBBY){
                games[gameCode].phase = Phase.BETTING;
            }
            else if(games[gameCode].phase == Phase.BETTING){
                games[gameCode].phase = Phase.VOTING;

                // Evaluate if there are no Voters
                evaluateDeck(gameCode);
            }
            else if(games[gameCode].phase == Phase.RESOLUTION){
                // If Draw, pick again
                if(games[gameCode].winner === "Draw"){
                    let areThereMoreCards = false;
                    Object.keys(games[gameCode].players).forEach(player => {
                        games[gameCode].players[player].selection = null;
                        games[gameCode].winner = null;
                        if(games[gameCode].players[player].hand.length > 0){
                            areThereMoreCards = true;
                        }
                    });

                    if(areThereMoreCards){
                        games[gameCode].phase = Phase.DRAWING;
                    }
                    else{
                        games[gameCode].phase = Phase.BETTING;
                    }
                }
                // If the Winner has all the Money, end the game
                else if(games[gameCode].players[games[gameCode].winner].credits >= (INITIAL_CREDITS*2)){
                    games[gameCode].phase = Phase.FINISHED;

                    // TODO: STORE GAME IN DB
                    captureGameSnapshot(gameCode, games[gameCode]);
                }
                // Continue the Game
                else {
                    games[gameCode].phase = Phase.BETTING;

                    Object.keys(games[gameCode].players).forEach(player => {
                        games[gameCode].players[player].hand = [];
                        games[gameCode].players[player].selection = null;
                        games[gameCode].card_deck = [];
                        games[gameCode].winner = null;
                    });
                }
            }

            Object.keys(games[gameCode].players).forEach(player => {
                games[gameCode].players[player].isReady = false;
            });
        }

        console.log(games[gameCode]);

        /*
            Update All Players
        */
        io.in(gameCode).emit('player-ready', {
            gameState : {
                phase : games[gameCode].phase,
                players : getPlayersState(games[gameCode].players),
                winner : games[gameCode].winner
            }
        });
    });

    /*
        Player - Propose Bet
        {
            credits : Number
        }
    */
    socket.on('propose-bet', (data) => {
        console.log(`${socket.id} - propose-bet`);
        console.log(data);

        /*
            Validate Socket is part of a game
        */
        if(!whois[socketId]){
           socket.emit('not-joined');
           return;
        }

        /*
            Variable Declaration
        */
        let bet = data.credits;
        const user = whois[socketId].user;
        const gameCode = whois[socketId].gameCode;
        
        /*
            Validate User can partake in action.
        */
        if(!games[gameCode].players[user.name]){
            return;
        }
        if(games[gameCode].phase != Phase.BETTING){
            return;
        }

        /*
            Game Logic
        */
        if(games[gameCode].players[user.name].credits < bet){
            bet = games[gameCode].players[user.name].credits;
        }
        if(bet <= 0){
            bet = 1;
        }
        games[gameCode].currentBet = Math.trunc(bet);

        /*
            Update All Players
        */
        io.in(gameCode).emit('bet-update', {
            gameState : {
                currentBet : games[gameCode].currentBet
            }
        });
    });

    /*
        Player - Retire
        {
            ...
        }
    */
    socket.on('retire', (data) => {
        console.log(`${socket.id} - retire`);
        console.log(data);

        /*
            Validate Socket is part of a game
        */
        if(!whois[socketId]){
           socket.emit('not-joined');
           return;
        }

        /*
            Variable Declaration
        */
        const user = whois[socketId].user;
        const gameCode = whois[socketId].gameCode;
        
        /*
            Validate User can partake in action.
        */
        if(!games[gameCode].players[user.name]){
            return;
        }

        /*
            Game Logic
        */
        games[gameCode].phase = Phase.FINISHED;
        Object.keys(games[gameCode].players).forEach(player => {
            if(player != user.name){
                games[gameCode].winner = player;
            }
        });

        // TODO: STORE GAME IN DB
        captureGameSnapshot(gameCode, games[gameCode]);

        /*
            Update All Players
        */
        io.to(gameCode).emit('player-ready', {
            gameState : {
                phase : games[gameCode].phase,
                players : getPlayersState(games[gameCode].players),
                winner : games[gameCode].winner
            }
        });
    });

    /*
        Player - Pick Card
        {
            cardIdx : Index of Card in Hand
        }
    */
    socket.on('pick-card', (data) => {
        console.log(`${socket.id} - pick-card`);
        console.log(data);

        /*
            Validate Socket is part of a game
        */
        if(!whois[socketId]){
           socket.emit('not-joined');
           return;
        }

        /*
            Variable Declaration
        */
        const user = whois[socketId].user;
        const gameCode = whois[socketId].gameCode;
        const cardIdx = data.cardIdx;
        
        let players = Object.keys(games[gameCode].players);
        let finishedSelecting = false;
        
        /*
            Validate User can partake in action.
        */
       console.log(`Condition 1: ${games[gameCode].players[user.name].name}`);
       console.log(`Condition 2: ${games[gameCode].players[user.name].selection}`);
       console.log(`Condition 3: ${games[gameCode].phase}`);
        if(!games[gameCode].players[user.name]){
            return;
        }
        if(games[gameCode].players[user.name].selection != null){
            return;
        }
        if(cardIdx > games[gameCode].players[user.name].hand.length || cardIdx < 0){
            return;
        }
        if(games[gameCode].phase != Phase.DRAWING){
            return;
        }

        /*
            Game Logic
        */
        console.log(`My Hand: ${games[gameCode].players[user.name].hand}`);
        games[gameCode].players[user.name].selection = games[gameCode].players[user.name].hand[cardIdx];
        games[gameCode].players[user.name].hand.splice(cardIdx, 1);

        finishedSelecting = arePlayersFinished(games[gameCode].players);

        /*
            Update Game State
        */
        console.log(`finishedSelecting: ${finishedSelecting}`);
        if(finishedSelecting){
            games[gameCode].phase = Phase.RESOLUTION;

            if (Compare[games[gameCode].players[players[0]].selection].strongTo === games[gameCode].players[players[1]].selection) {
                games[gameCode].winner = players[0];

                games[gameCode].players[players[0]].credits += games[gameCode].currentBet;
                games[gameCode].players[players[1]].credits -= games[gameCode].currentBet;
            }
            else if (Compare[games[gameCode].players[players[0]].selection].weakTo === games[gameCode].players[players[1]].selection) {
                games[gameCode].winner = players[1];

                games[gameCode].players[players[1]].credits += games[gameCode].currentBet;
                games[gameCode].players[players[0]].credits -= games[gameCode].currentBet;
            }
            else {
                games[gameCode].winner = 'Draw';
            }


            console.log(`Winner: ${games[gameCode].winner}`);
        }

        /*
            Update All Players
        */
        
        socket.to(gameCode).emit('player-picked-card', {
            gameState : {
                players : getPlayersState(games[gameCode].players)
            }
        });

        io.to(socketId).emit('player-picked-card', {
            user : {
                hand : games[gameCode].players[user.name].hand,
                waiting : true
            },
            gameState : {
                players : getPlayersState(games[gameCode].players)
            }
        })

        if(finishedSelecting){
            io.to(gameCode).emit('players-finished-picking', {
                user : {
                    waiting : false
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players),
                    phase : games[gameCode].phase,
                    winner : games[gameCode].winner
                },
                playersSelections : getPlayersSelections(games[gameCode].players)
            });
        }

        console.log(games[gameCode]);
    });

    /*
        Voter - vote
        {
            cardIdx : Index of Card in Hand
        }
    */
    socket.on('vote', (data) => {
        console.log(`${socket.id} - vote`);
        console.log(data);

        /*
            Validate Socket is part of a game
        */
        if(!whois[socketId]){
           socket.emit('not-joined');
           return;
        }

        /*
            Variable Declaration
        */
        const user = whois[socketId].user;
        const gameCode = whois[socketId].gameCode;
        const cardIdx = data.cardIdx;

        let allVoted = false;
        
        /*
            Validate User can partake in action.
        */
        if(!games[gameCode].voters[user.name]){
            return;
        }
        if(games[gameCode].voters[user.name].voted){
            return;
        }
        if(cardIdx > 3 || cardIdx < 0){
            return;
        }
        if(games[gameCode].phase != Phase.VOTING){
            return;
        }

        /*
            Game Logic
        */
        switch(cardIdx){
            case 0:
                games[gameCode].card_deck.push(Card.ROCK);
                break;

            case 1:
                games[gameCode].card_deck.push(Card.PAPER);
                break;
            
            case 2:
                games[gameCode].card_deck.push(Card.SCISSORS);
                break;
        }

        games[gameCode].voters[user.name].voted = true;
        
        evaluateDeck(gameCode);

        io.to(socketId).emit('voter-voted', {
            user : {
                waiting : true
            },
            gameState : {
                voters : getVotersState(games[gameCode].voters)
            }
        });
    });

    /*
        Handle User Disconnection
    */
    socket.on('disconnect', () => {
        if(!games || !whois[socketId] || !games[whois[socketId].gameCode]){
            return;
        }

        let dc_user = whois[socketId].user;
        let dc_gameCode = whois[socketId].gameCode;

        console.log(`DISCONNECTED - ${whois[socketId]}`);

        // Handle Player Disconnect
        if(games[dc_gameCode].players[dc_user.name] != null){
            /*
                Continue Game - Server will wait for user reconnection
            */
        }

        // Handle Voter Disconnect
        if(games[dc_gameCode].voters[dc_user.name] != null){
            delete games[dc_gameCode].voters[dc_user.name];
            
            if(games[dc_gameCode].phase === Phase.VOTING){
                evaluateDeck(dc_gameCode);
            }
        }
        
        io.to(dc_gameCode).emit('user-left', {
            who : dc_user,
            message: `${dc_user.name} disconnected.`,
            gameState : {
                players : getPlayersState(games[dc_gameCode].players), // { #, name, credits }
                voters : getVotersState(games[dc_gameCode].voters), // name
            }
        });

        delete whois[socketId];
    });
});
