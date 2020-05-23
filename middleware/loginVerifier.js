const jwt = require('jsonwebtoken');
const { SECRET_TOKEN } = require('../config');

function validateSessionToken( req, res, next ){
    let token = req.headers.sessiontoken;
    console.log(req.headers);

    if(!token){
        res.statusMessage = "Token not provided, please log-in.";
        return res.status(409).end();
    }

    jwt.verify(token, SECRET_TOKEN, (err, decoded) => {
        if(err){
            res.statusMessage = "Your session has expired, please log-in.";
            return res.status(409).end();
        }

        req.user = {
            name : decoded.name
        }

        next();
    });
}

module.exports = validateSessionToken;