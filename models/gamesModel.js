const mongoose = require( 'mongoose' );
const uuid = require("uuid");
const Schema = mongoose.Schema;
const { PASSWORD_MASK } = require( '../config' );

const Status = {
    ONGOING : 0,
    FINISHED : 1
}

const GameSchema = mongoose.Schema({
    // Id
    code : {
        type : String,
        required : true,
        default : uuid.v4(),
        unique : true
    },
    owner : {
        type : Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },
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
    },
    date : {
        type : Date,
        default : Date.now()
    }
});

const gamesCollection = mongoose.model( 'Game', GameSchema );

const Games = {
    createGame : function( newGame ){
        console.log(newGame);
        return gamesCollection
                .create( newGame )
                .then( createdGame => {
                    return createdGame;
                })
                .catch( err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getAll : function(){
        return gamesCollection
                .find()
                .then( allGames => {
                    return allGames;
                })
                .catch( err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getByCode : function(code){
        return gamesCollection
                .findOne({code : code})
                .then(res => {
                    return res;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getActive : function(){
        return gamesCollection
                .find({status : Status.ONGOING})
                .populate('owner')
                .then(res => {
                    res.forEach(game => {
                        game.owner.password = PASSWORD_MASK
                    });

                    return res;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getOwnedBy : function(owner){
        return gamesCollection
                .find({owner : owner})
                .populate('owner', 'name')
                .populate('voter', 'name')
                .populate('players', 'name')
                .populate('voters', 'name')
                .populate('winner', 'name')
                .then( userGames => {
                    return userGames;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    updateGame : function(code, fields){
        return gamesCollection  
                .findOneAndUpdate(
                    {code : code},
                    fields,
                    {new : true}
                )
                .then(res => {
                    return res;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getByVoter : function(voter){
        return gamesCollection
                .find({
                    voters : voter
                })
                .populate('owner', 'name')
                .populate('voter', 'name')
                .then( userGames => {
                    return userGames;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getByPlayer : function(player){
        return gamesCollection
                .find({
                    players : player
                })
                .populate('owner', 'name')
                .populate('voter', 'name')
                .then( userGames => {
                    return userGames;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getByWinner : function(winner){
        return gamesCollection
                .findOne({
                    winner : player
                })
                .populate('owner', 'name')
                .populate('voter', 'name')
                .then( userGames => {
                    return userGames;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    }
}

module.exports = { Games, Status };