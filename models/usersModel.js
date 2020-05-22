const mongoose = require( 'mongoose' );

const UserSchema = mongoose.Schema({
    // Id
    name : {
        type : String,
        required : true,
        unique : true
    },
    password : {
        type : String,
        required : true
    },
    date : {
        type : Date,
        default : Date.now()
    }
});

const usersCollection = mongoose.model( 'User', UserSchema );

const Users = {
    createUser : function( newUser ){
        return usersCollection
                .create( newUser )
                .then( createdUser => {
                    return createdUser;
                })
                .catch( err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getAll : function(){
        return usersCollection
                .find()
                .then( allUsers => {
                    return allUsers;
                })
                .catch( err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getByName : function(name){
        return usersCollection
                .findOne({name : name})
                .then(res => {
                    return res;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    getSeveralByName : function(names){
        return usersCollection
                .find({name : {
                    $in: names
                }})
                .then(res => {
                    return res;
                })
                .catch(err => {
                    console.error(err);
                    throw new Error( err );
                });
    },
    updateUser : function(name, fields){
        return usersCollection  
                .findOneAndUpdate(
                    {name : name},
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
    deleteUser : function(name){
        return usersCollection
            .findOneAndDelete(
                {name : name}
            )
            .then(res => {
                return res;
            })
            .catch(err => {
                console.error(err);
                throw new Error( err );
            });
    }
}

module.exports = { Users };