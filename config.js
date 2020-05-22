
module.exports = {
    DATABASE_URL : process.env.DATABASE_URL || 'mongodb://localhost/vote-rpsdb',
    PORT : process.env.PORT || '8080',
    SECRET_TOKEN : process.env.SECRET_TOKEN || 'Its a secret, shhh',
    HASH_SALT : process.env.HASH_SALT || 1,
    PASSWORD_MASK : "Wouldn't you like to know, weather-boy.",

    // GAME VARIABLES
    GAME_VALUES : {
        INITIAL_PLAYER_CREDITS : process.env.GAME_INITIAL_PLAYER_CREDITS || 120,
        MAX_VOTERS : process.env.GAME_MAX_VOTERS || 20
    }
}
