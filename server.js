const express = require( 'express' );
const mongoose = require( 'mongoose' );
const cors = require('./middleware/cors');
const morgan = require( 'morgan' );
const bodyParser = require( 'body-parser' );
const { DATABASE_URL, PORT } = require( './config' );
const { Users } = require('./models/usersModel');
const { Games } = require('./models/gamesModel');

const app = express();
const jsonParser = bodyParser.json();

// Middleware
app.use(cors);
// app.use(express.static("public"));
app.use(morgan('dev'));

// USERS CRUD

app.get('/vote-rps/api/users', (req, res) => {
    Users
        .getAll()
        .then(allUsers => {
            return res.status(200).json(allUsers);
        })
        .catch(err => {
            res.statusMessage = "Something went wrong when retrieving Users.";
            return res.status(400).end();
        });
})

// Get User with UserName
app.get('/vote-rps/api/user/:userName', (req, res) => {
    let userName = req.params.userName;

    Users.getByName(userName)
        .then(result => {
            if(!result){
                res.statusMessage = `There is no recorded User with the 'name=${userName}'.`;
                return res.status(404).end();
            }

            return res.status(200).json(result);
        })
        .catch(err => {
            res.statusMessage = `Something went wrong when accessing the DB. Please try again later. ${err.errmsg}`;
            return res.status(500).end();
        });
})

// Create a New User with UserName
app.post('/vote-rps/api/user/:userName', jsonParser, (req, res) => {
    const userName = req.params.userName;

    Users
        .createUser(newUser)
        .then(createdUser => {
            return res.status(201).json(createdUser);
        })
        .catch( err => {
            res.statusMessage = "Something went wrong when creating new User.";
            return res.status(400).end();
        });
});

// GAMES CRUD

// Get Games Owned By User
app.get('/vote-rps/api/user/:userName/games', (req, res) => {
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
app.get('/vote-rps/api/game/:gameCode', (req, res) => {
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
app.post('/vote-rps/api/user/:userName/newGame', jsonParser, (req, res) => {
    const userName = req.params.userName;
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
app.patch('/vote-rps/api/game/:gameCode', jsonParser, (req, res) => {

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