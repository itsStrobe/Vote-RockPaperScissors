const express = require( 'express' );
const mongoose = require( 'mongoose' );
const cors = require('./middleware/cors');
const validateSessionToken = require( './middleware/loginVerifier' );
const morgan = require( 'morgan' );
const bodyParser = require( 'body-parser' );
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const uuid = require("uuid");
const { DATABASE_URL, PORT, SECRET_TOKEN, PASSWORD_MASK } = require( './config' );
const { Users } = require('./models/usersModel');
const { Games, Status } = require('./models/gamesModel');
const {Phase, Card, Compare, Player, Voter, Game} = require('./classes/game');

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
                    res.statusMessage = `Username '${userName}' is already taken.`;
                    return res.status(400).end();
                });
        })
        .catch( err => {
            res.statusMessage = "Something went wrong when hashing new User pass.";
            return res.status(400).end();
        });
});

// Edit User Name
app.patch('/vote-rps/api/user/newUserName', [jsonParser, validateSessionToken], (req, res) => {
    console.log(req.body);
    const { newUserName, password } = req.body;

    Users
        .getByName(req.user.name)
        .then(user => {
            if(!user){
                res.statusMessage = `User with 'name=${req.user.name}' was not found.`;
                return res.status(404).end();
            }

            bcrypt.compare(password, user.password)
                .then(result => {
                    if(result){
                        Users
                            .updateUser(user.name, {
                                name : newUserName
                            })
                            .then(resp => {
                                const userData = {
                                    name : resp.name
                                };
                                jwt.sign(userData, SECRET_TOKEN, {expiresIn : '30m'}, (err, token) => {
                                    if(err){
                                        res.statusMessage = err.message;
                                        return res.status( 400 ).end();
                                    }

                                    // Send 201 Status with new session token.
                                    return res.status(201).json({
                                        token
                                    });
                                });
                            })
                            .catch(err => {
                                res.statusMessage = `Username '${newUserName}' is already taken.`;
                                return res.status(400).end();
                            })
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
});

// Edit User Password
app.patch('/vote-rps/api/user/newPassword', [jsonParser, validateSessionToken], (req, res) => {
    const { newPassword, newPasswordConfirmation, password } = req.body;

    if(!newPassword || !newPasswordConfirmation || !password){
        res.statusMessage = "Please provide ALL required fields - [newPassword, newPasswordConfirmation, password]";
        return res.status(400).end();
    }

    if(newPassword != newPasswordConfirmation) {
        res.statusMessage = "Passwords do not Match";
        return res.status(400).end();
    }

    Users
        .getByName(req.user.name)
        .then(user => {
            if(!user){
                res.statusMessage = `User with 'name=${req.user.name}' was not found.`;
                return res.status(404).end();
            }
            bcrypt
                .compare(password, user.password)
                .then(result => {
                    if(result){
                        bcrypt.hash(newPassword, 10)
                            .then(hashedPass => {
                                Users
                                    .updateUser(user.name, {
                                        password : hashedPass
                                    })
                                    .then(resp => {
                                        const userData = {
                                            name : resp.name
                                        };
                                        jwt.sign(userData, SECRET_TOKEN, {expiresIn : '30m'}, (err, token) => {
                                            if(err){
                                                res.statusMessage = err;
                                                return res.status(400).end();
                                            }

                                            // Send 201 Status with new session token.
                                            return res.status(201).json({
                                                token
                                            });
                                        });
                                    })
                                    .catch(err => {
                                        console.error(err);
                                        res.statusMessage = `Could not update User 'name=${user.name}' password.`;
                                        return res.status(400).end();
                                    })
                            })
                            .catch( err => {
                                console.error(err);
                                res.statusMessage = `Something went wrong when hashing User 'name=${user.name}' new password.`;
                                return res.status(400).end();
                            });
                    }
                    else{
                        res.statusMessage = "Wrong credentials provided";
                        return res.status(409).end();
                    }
                })
                .catch( err => {
                    console.error(err);
                    res.statusMessage = err.message;
                    return res.status( 400 ).end();
                });
        })
        .catch( err => {
            console.error(err);
            res.statusMessage = err.message;
            return res.status( 400 ).end();
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
});

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
            let activeGames = [];

            result.forEach(game => {
                let currentVoters = [];
                if(games[game.code]){
                    currentVoters = games[game.code].getVotersState();
                }

                activeGames.push({
                    _id : game._id,
                    code : game.code,
                    players : game.players,
                    voters : game.voters,
                    status : game.status,
                    owner : game.owner,
                    currentVoters
                });
            });

            return res.status(200).json(activeGames);
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when fetching active games. Err=${err.message}`;
            return res.status(400).end();
        })
});

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
});

// Get Games By Any Param
app.get('/vote-rps/api/games', validateSessionToken, (req, res) => {
    console.log(req.query);
    const { owner, player, winner, voter, code } = req.query;

    if(owner){
        // Get User
        Users
        .getByName(owner)
        .then(user => {
            // Get Games Owned By User
            Games
                .getOwnedBy(user)
                .then(resp => {
                    return res.status(200).json(resp);
                })
                .catch(err => {
                    console.error(err);
                    res.statusMessage = `Something went wrong when fetching games owned by '${owner}'. Please try again later.`;
                    return res.status(400).end();
                });
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when fetching User 'name=${owner}'.`;
            return res.status(400).end();
        });
    }
    else if(player){
        // Get User
        Users
        .getByName(player)
        .then(user => {
            // Get Games Played By User
            Games
                .getByPlayer(user)
                .then(resp => {
                    return res.status(200).json(resp);
                })
                .catch(err => {
                    console.error(err);
                    res.statusMessage = `Something went wrong when fetching games with Player '${player}'. Please try again later.`;
                    return res.status(200).json(resp);
                });
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when fetching User 'name=${player}'.`;
            return res.status(400).end();
        });
    }
    else if(winner){
        // Get User
        Users
            .getByName(winner)
            .then(user => {
                // Get Games Winned By User
                console.log("getByName not failing");
                console.log(user);
                Games
                    .getByWinner(user)
                    .then(resp => {
                        return res.status(200).json(resp);
                    })
                    .catch(err => {
                        console.error(err);
                        res.statusMessage = `Something went wrong when fetching games with Winner '${winner}'. Please try again later.`;
                        return res.status(200).json(resp);
                    });
            })
            .catch(err => {
                res.statusMessage = `Something went wrong when fetching User 'name=${winner}'.`;
                return res.status(400).end();
            });
    }
    else if(voter){
        // Get User
        Users
            .getByName(voter)
            .then(user => {
                // Get Games Voted By User
                Games
                    .getByVoter(user)
                    .then(resp => {
                        return res.status(200).json(resp);
                    })
                    .catch(err => {
                        console.error(err);
                        res.statusMessage = `Something went wrong when fetching games with Voter '${voter}'. Please try again later.`;
                        return res.status(200).json(resp);
                    });
            })
            .catch(err => {
                res.statusMessage = `Something went wrong when fetching User 'name=${voter}'.`;
                return res.status(400).end();
            });
    }
    else if(code){
        Games
            .getByCode(code)
            .then(resp => {
                return res.status(200).json(resp);
            })
            .catch(err => {
                console.error(err);
                res.statusMessage = `Something went wrong when fetching game with Code '${code}'. Please try again later.`;
                return res.status(200).json(resp);
            });
    }
    else {
        res.statusMessage = "Please Submit a Valid Query - [owner, player, winner, voter, code]."
        return res.status(400).end();
    }
});

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
                    code : uuid.v4(),
                    owner: user
                })
                .then(result => {
                    console.log(`Created New Game - 'code=${result.code}'`);
                    return res.status(201).json(result);
                })
                .catch(err => {
                    console.log(err);
                    res.statusMessage = `Something went wrong when creating new game for Owner 'name=${userName}'.`;
                    return res.status(400).end();
                });
        })
        .catch(err => {
            console.log(err);
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
            useCreateIndex: true,
            useFindAndModify: false
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

let games = new Object();
let whois = new Object();
const io = require('socket.io')(server);

function captureGameSnapshot(game){
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
                                .updateGame(game.code, {
                                    players,
                                    voters,
                                    winner,
                                    status
                                })
                                .then(updatedGame => {
                                    console.log(`Captured Snapshot of Game 'game=${game.code}'`);
                                })
                                .catch(err => {
                                    console.log(`Something went wrong when Capturing Snapshot of Game 'game=${game.code}'.`);
                                    throw new Error(`Something went wrong when Capturing Snapshot of Game 'game=${game.code}'.`);
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

async function isGameActive(gameCode){
    return await Games
        .getByCode(gameCode)
        .then(resp => {
            if(resp.status == Status.ONGOING){
                return true;
            }
            
            return false;
        })
        .catch(err => {
            console.error(err.message);
            return false;
        })
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

        // Validate Game Exists and is Ongoing
        try {
            if(!(await isGameActive(gameCode))){
                socket.emit('game-inactive', {});
                socket.disconnect();
                return;
            }
        }
        catch(err){
            console.error(err);
            socket.emit('game-inactive', {});
            return;
        }

        // Add Socket to list of know users
        whois[socketId] = {
            user,
            gameCode
        };

        // If game does not exists, create it
        if(games[gameCode] == null){
            games[gameCode] = new Game(gameCode);
        }

        // Add Users to game in FIFO basis (First Players, then Voters)
        // Welcome Player Again
        if(games[gameCode].isPlayer(user.name)){
            games[gameCode].players[user.name].socket = socket;

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `player${games[gameCode].players[user.name].number}`
                },
                gameState : {
                    players : games[gameCode].getPlayersState(),
                    voters : games[gameCode].getVotersState()
                }
            });

            socket.emit('welcome', {
                player : {
                    role : `player${games[gameCode].players[user.name].number}`,
                    hand : games[gameCode].players[user.name].hand
                },
                gameState : {
                    players : games[gameCode].getPlayersState(), // { #, name, credits }
                    voters : games[gameCode].getVotersState(), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                },
                playersSelections : games[gameCode].getPlayersSelections()
            });
        }
        // Try to Add as a Player
        else if(games[gameCode].addPlayer(user.name, socket)){

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `player${games[gameCode].players[user.name].number}`
                },
                gameState : {
                    players : games[gameCode].getPlayersState(),
                    voters : games[gameCode].getVotersState()
                }
            });

            socket.emit('welcome', {
                player : {
                    role : `player${games[gameCode].players[user.name].number}`,
                    hand : games[gameCode].players[user.name].hand
                },
                gameState : {
                    players : games[gameCode].getPlayersState(), // { #, name, credits }
                    voters : games[gameCode].getVotersState(), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                },
                playersSelections : games[gameCode].getPlayersSelections()
            });
        }
        // Welcome Voter Again
        else if(games[gameCode].isVoter(user.name)){
            games[gameCode].voters[user.name].socket = socket;

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role :  'Voter'
                },
                gameState : {
                    players : games[gameCode].getPlayersState(),
                    voters : games[gameCode].getVotersState()
                }
            });

            socket.emit('welcome', {
                player : {
                    role : 'Voter',
                    hand : [Card.ROCK, Card.PAPER, Card.SCISSORS]
                },
                gameState : {
                    players : games[gameCode].getPlayersState(), // { #, name, credits }
                    voters : games[gameCode].getVotersState(), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                },
                playersSelections : games[gameCode].getPlayersSelections()
            });
        }
        // Try to Add as a Voter
        else if(games[gameCode].addVoter(user.name, socket)){
            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : 'Voter'
                },
                gameState : {
                    players : games[gameCode].getPlayersState(),
                    voters : games[gameCode].getVotersState()
                }
            });

            socket.emit('welcome', {
                player : {
                    role : 'Voter',
                    hand : [Card.ROCK, Card.PAPER, Card.SCISSORS]
                },
                gameState : {
                    players : games[gameCode].getPlayersState(), // { #, name, credits }
                    voters : games[gameCode].getVotersState(), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet,
                    winner : games[gameCode].winner
                },
                playersSelections : games[gameCode].getPlayersSelections()
            });
        }
        // Reject User
        else {
            socket.error(`Rejected. No more spaces in game ${gameCode}.`);
        }

        // Join Game Room
        socket.join(gameCode);
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
        
        /*
            Validate User can partake in action.
        */
        if(!games[gameCode].isPlayer(user.name)){
            return;
        }
        if(games[gameCode].phase != Phase.LOBBY && games[gameCode].phase != Phase.BETTING && games[gameCode].phase != Phase.RESOLUTION){
            return;
        }

        /*
            Game Logic
        */
        games[gameCode].playerReadyAction(user.name);


        // RAGE-QUIT SCENARIO
        if(games[gameCode].isThereAWinner()){
            captureGameSnapshot(games[gameCode]);
        }

        if(games[gameCode].arePlayersReady()){
            switch(games[gameCode].updatePhaseOnPlayersReady()){
                case Phase.DRAWING:
                    io.to(gameCode).emit('voters-finished-voting', {
                        user : {
                            waiting : false
                        },
                        gameState : {
                            phase : games[gameCode].phase
                        }
                    });
    
                    Object.keys(games[gameCode].players).forEach(player => {
                        io.to(games[gameCode].players[player].socket.id).emit('provide-hand', {
                            user : {
                                hand : games[gameCode].players[player].hand
                            }
                        });
                    });
                    break;
                case Phase.FINISHED:
                    captureGameSnapshot(games[gameCode]);
                    break;
                case Phase.BETTING:
                case Phase.VOTING:
                    break;
                
            }
        }

        /*
            Update All Players
        */
        io.in(gameCode).emit('player-ready', {
            gameState : {
                phase : games[gameCode].phase,
                players : games[gameCode].getPlayersState(),
                winner : games[gameCode].winner
            }
        });

        /*
            IF GAME IS FINISHED, END IT.
        */
        if(games[gameCode].phase == Phase.FINISHED){
            delete games[gameCode];
        }
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
        if(!games[gameCode].isPlayer(user.name)){
            return;
        }
        if(games[gameCode].phase != Phase.BETTING){
            return;
        }

        /*
            Game Logic
        */
        games[gameCode].proposeBet(user.name, bet);

        /*
            Update All Players
        */
        io.in(gameCode).emit('bet-update', {
            gameState : {
                players : games[gameCode].getPlayersState(),
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
        games[gameCode].playerRetire(user.name);
        captureGameSnapshot(games[gameCode]);

        /*
            Update All Players
        */
        io.to(gameCode).emit('player-ready', {
            gameState : {
                phase : games[gameCode].phase,
                players : games[gameCode].getPlayersState(),
                winner : games[gameCode].winner
            }
        });

        /*
            IF GAME IS FINISHED, END IT.
        */
        if(games[gameCode].phase == Phase.FINISHED){
            delete games[gameCode];
        }
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
        
        /*
            Validate User can partake in action.
        */
        if(!games[gameCode].isPlayer(user.name)){
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
        games[gameCode].makeCardSelection(user.name, cardIdx);

        if(games[gameCode].arePlayersFinished()){
            games[gameCode].revealCards();
        }

        /*
            Update All Players
        */
        
        socket.to(gameCode).emit('player-picked-card', {
            gameState : {
                players : games[gameCode].getPlayersState()
            }
        });

        io.to(socketId).emit('player-picked-card', {
            user : {
                hand : games[gameCode].players[user.name].hand,
                waiting : true
            },
            gameState : {
                players : games[gameCode].getPlayersState()
            }
        })

        if(games[gameCode].arePlayersFinished()){
            io.to(gameCode).emit('players-finished-picking', {
                user : {
                    waiting : false
                },
                gameState : {
                    players : games[gameCode].getPlayersState(),
                    phase : games[gameCode].phase,
                    winner : games[gameCode].winner
                },
                playersSelections : games[gameCode].getPlayersSelections()
            });
        }
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
        
        /*
            Validate User can partake in action.
        */
        if(!games[gameCode].isVoter(user.name)){
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
        games[gameCode].makeVote(user.name, cardIdx);
        
        if(games[gameCode].areVotersFinished()){
            games[gameCode].onVotersFinished();

            io.to(gameCode).emit('voters-finished-voting', {
                user : {
                    waiting : false
                },
                gameState : {
                    phase : games[gameCode].phase
                }
            });

            Object.keys(games[gameCode].players).forEach(player => {
                io.to(games[gameCode].players[player].socket.id).emit('provide-hand', {
                    user : {
                        hand : games[gameCode].players[player].hand
                    }
                });
            });
        }
        else{
            io.to(socketId).emit('voter-voted', {
                user : {
                    waiting : true
                },
                gameState : {
                    voters : games[gameCode].getVotersState()
                }
            });
        }
    });

    /*
        Handle User Disconnection
    */
    socket.on('disconnect', () => {
        console.log(`${socketId} - disconnect`);

        if(!games || !whois[socketId] || !games[whois[socketId].gameCode]){
            return;
        }

        let dc_user = whois[socketId].user;
        let dc_gameCode = whois[socketId].gameCode;

        console.log(`DISCONNECTED - ${whois[socketId].user.name}`);

        // Handle Player Disconnect
        if(games[dc_gameCode].players[dc_user.name] != null){
            /*
                Continue Game - Server will wait for user reconnection
            */
        }

        // Handle Voter Disconnect
        if(games[dc_gameCode].removeVoter()){            
            if(games[dc_gameCode].phase === Phase.VOTING){
                if(games[dc_gameCode].areVotersFinished()){
                    games[dc_gameCode].onVotersFinished();

                    io.to(gameCode).emit('voters-finished-voting', {
                        user : {
                            waiting : false
                        },
                        gameState : {
                            phase : games[gameCode].phase
                        }
                    });

                    Object.keys(games[gameCode].players).forEach(player => {
                        io.to(games[gameCode].players[player].socket.id).emit('provide-hand', {
                            user : {
                                hand : games[gameCode].players[player].hand
                            }
                        });
                    });
                }
            }
        }
        
        io.to(dc_gameCode).emit('user-left', {
            who : dc_user,
            message: `${dc_user.name} disconnected.`,
            gameState : {
                players : games[dc_gameCode].getPlayersState(), // { #, name, credits }
                voters : games[dc_gameCode].getVotersState(), // name
            }
        });

        delete whois[socketId];
    });
});
