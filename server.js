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
const { Games } = require('./models/gamesModel');

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


app.get('/vote-rps/api/users', (req, res) => {
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
    let { credits } = req.body;

    if(!credits){
        credits = 120;
    }

    // Get User
    Users
        .getByName(userName)
        .then(user => {
            // Create Game for User
            Games
                .createGame({
                    credits: credits,
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

const server = app.listen( PORT, () =>{
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
    WINNER : 5
};

const Card = {
    ROCK : 0,
    PAPER : 1,
    SCISSORS : 2
}

let games = new Object();
let whois = new Object();
const io = require('socket.io')(server);

function getPlayersState(players){
    let cleanPlayers = [ ];
    
    Object.keys(players).forEach(player => {
        cleanPlayers.push({
            number : players[player].number,
            name : players[player].name,
            credits : players[player].credits
        });
    });

    return cleanPlayers;
}

function getVotersState(voters){
    let cleanVoters = [ ];
    
    Object.keys(voters).forEach(voter => {
        cleanVoters.push(voters[voter].name);
    });

    return cleanVoters;
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

        // Add Socket to list of know users
        whois[socketId] = {
            user,
            gameCode
        };

        // If game does not exists, create it
        if(games[gameCode] == null){
            games[gameCode] = {
                players : { }, // name : { #, name, credits, hand, socket }
                voters : { }, // name : { name, voted, socket }
                phase : Phase.LOBBY,
                currentBet : 0,
                card_deck : []
            }
        }

        // Add Users to game in FIFO basis (First Players, then Voters)
        // Welcome Player Again
        if(games[gameCode].players[user.name] != null){
            games[gameCode].players[user.name].socket = socket;

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `Player ${games[gameCode].players[user.name].number}`
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players),
                    voters : getVotersState(games[gameCode].voters)
                }
            });

            socket.emit('welcome', {
                player : {
                    role : `Player ${games[gameCode].players[user.name].number}`,
                    hand : games[gameCode].players[user.name].hand
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players), // { #, name, credits }
                    voters : getVotersState(games[gameCode].voters), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet
                }
            });
        }
        // Try to Add as a Player
        else if(Object.keys(games[gameCode].players).length < 2){
            games[gameCode].players[user.name] = {
                number : Object.keys(games[gameCode].players).length + 1,
                name : user.name,
                credits : 120, // Default amount
                hand : [],
                socket : socket
            };

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `Player ${games[gameCode].players[user.name].number}`
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players),
                    voters : getVotersState(games[gameCode].voters)
                }
            });

            socket.emit('welcome', {
                player : {
                    role : `Player ${games[gameCode].players[user.name].number}`,
                    hand : games[gameCode].players[user.name].hand
                },
                gameState : {
                    players : getPlayersState(games[gameCode].players), // { #, name, credits }
                    voters : getVotersState(games[gameCode].voters), // name
                    phase : games[gameCode].phase,
                    currentBet : games[gameCode].currentBet
                }
            });
        }
        // Welcome Voter Again
        else if(games[gameCode].voters[user.name] != null){
            games[gameCode].voters[user.name].socket = socket;

            socket.to(gameCode).emit('user-joined', {
                user : {
                    name : user.name,
                    role : `Player ${games[gameCode].players[user.name].number}`
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
                    currentBet : games[gameCode].currentBet
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
                    role : `Player ${games[gameCode].players[user.name].number}`
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
                    currentBet : games[gameCode].currentBet
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
            sessiontoken
        }
    */
    socket.on('ready', async (data) => {
        console.log(data);
        let user = null;
        try {
            user = await getUserFromToken(data.sessiontoken);
            console.log(user);
        }
        catch{
            socket.error("Something went wrong when fetching your user.");
        }
        /*
            Event Logic
        */
    });

    /*
        Player - Propose Bet
        {
            credits : Number,
            sessiontoken
        }
    */
    socket.on('propose-bet', async (data) => {
        console.log(data);
        let user = null;
        try {
            user = await getUserFromToken(data.sessiontoken);
            console.log(user);
        }
        catch{
            socket.error("Something went wrong when fetching your user.");
        }
        /*
            Event Logic
        */
    });

    /*
        Player - Retire
        {
            sessiontoken
        }
    */
    socket.on('retire', async (data) => {
        console.log(data);
        let user = null;
        try {
            user = await getUserFromToken(data.sessiontoken);
            console.log(user);
        }
        catch{
            socket.error("Something went wrong when fetching your user.");
        }
        /*
            Event Logic
        */
    });

    /*
        Player - Pick Card
        {
            card : Card
            sessiontoken
        }
    */
    socket.on('pick-card', async (data) => {
        console.log(data);
        let user = null;
        try {
            user = await getUserFromToken(data.sessiontoken);
            console.log(user);
        }
        catch{
            socket.error("Something went wrong when fetching your user.");
        }
        /*
            Event Logic
        */
    });

    /*
        Voter - vote
        {
            card : Card
            sessiontoken
        }
    */
    socket.on('vote', async (data) => {
        console.log(data);
        let user = null;
        try {
            user = await getUserFromToken(data.sessiontoken);
            console.log(user);
        }
        catch{
            socket.error("Something went wrong when fetching your user.");
        }
        /*
            Event Logic
        */
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

        // Handle Player Disconnect
        if(games[dc_gameCode].players[dc_user.name] != null){
            /*
                TODO
                Continue Game or Declare Winner?
            */
        }

        // Handle Voter Disconnect
        if(games[dc_gameCode].voters[dc_user.name] != null){
            // TODO: Verify Game is not waiting on user vote.

            delete games[dc_gameCode].voters[dc_user.name];
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
