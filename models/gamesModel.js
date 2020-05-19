const mongoose = require( 'mongoose' );
const uuid = require("uuid");
const Schema = mongoose.Schema;
const { PASSWORD_MASK } = require( '../config' );

const WinCondition = {
    FORFEIT : 0,
    NO_CREDITS : 1
}

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
    credits : {
        type : Number,
        required : true,
        default : 120
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
    winCondition : {
        type : Number,
        required : true,
        default : WinCondition.FORFEIT
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
                    return err;
                });
    },
    getAll : function(){
        return gamesCollection
                .find()
                .then( allGames => {
                    return allGames;
                })
                .catch( err => {
                    return err;
                });
    },
    getByCode : function(code){
        return gamesCollection
                .findOne({code : code})
                .then(res => {
                    return res;
                })
                .catch(err => {
                    return err;
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
                    return err;
                });
    },
    getOwnedBy : function(owner){
        return gamesCollection
                .find({owner : owner})
                .populate('owner')
                .then( userGames => {
                    return userGames;
                })
                .catch(err => {
                    return err;
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
                    return err;
                });
    }
}

module.exports = { Games, WinCondition, Status };