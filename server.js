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
    const { credits } = req.body;

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

app.listen( PORT, () =>{
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