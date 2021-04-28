var mysql = require('mysql');
var conf = require('config');
const restifyJsonSchemaValidationMiddleware = require('restify-json-schema-validation-middleware');
var pool  = mysql.createPool(Object.assign({connectionLimit: 100}, conf.get("MYSQL")));

const { v4: uuidv4 } = require('uuid');

var jwt = require("jsonwebtoken");

//NEVER PUBLISH THIS TO GitHub NEVER
var secret = conf.get("TOKEN_SECRET");

var genAccessToken = function(databaseRes) {
    return jwt.sign({
        userID: databaseRes.id
    }, secret, { expiresIn: '30m' });
};

module.exports = {
    pool,
    checkAccessToken: function(accessToken, callback) {
        jwt.verify(accessToken, secret, function(err, decoded) {
            if(err){
                callback(null);
            }
            else {
                pool.query('select id, jahrgangsstufe, nick, moderator, pwhash from accounts where accounts.id = ?;', [decoded.userID], function (err, result, fields) {
                    if (err) throw err;
                    if(result.length === 1){
                        callback(result[0]);
                    }
                    else {
                        callback(null);
                    }
                });
            }
        });
    },
    checkAccountValidation: function(hash, callback){
        pool.query('select id, jahrgangsstufe, nick, moderator from accounts where pwhash=' + mysql.escape(hash) + ";", function (err, result, fields) {
            if (err) throw err;
            if(result.length === 1){
                callback(result[0]);
            }
            else {
                callback(null);
            }
        });
    },
    genAccessTokenFromHash: function(hash, callback) {
        this.checkAccountValidation(hash, function(res){
            if(res != null) {
                var accessToken = genAccessToken(res);
                uuid = uuidv4();
                
                pool.query('UPDATE accounts SET accounts.refreshToken = ? WHERE accounts.pwhash = ?;', [uuid, hash], function(err, result, fields) {  
                    if (err) throw err;                
                    var refreshToken = jwt.sign({
                        jti: uuid
                    }, secret, { expiresIn: '200d'});
                    callback(accessToken, refreshToken, res);
                });
            }
            else {
                callback(null);
            }
        })
    },
    genAccessTokenFromRefresh: function(refreshToken, callback) {
        jwt.verify(refreshToken, secret, function(err, decoded) {
            if(err) {
                callback(null);
            }
            else {
                jti = decoded.jti;
                pool.query('select id, jahrgangsstufe, nick, moderator from accounts where refreshToken = ?;', [jti], function (err, result, fields) {
                    if (err) throw err;
                    if(result.length === 1){
                        callback(genAccessToken(result[0]));
                    }
                    else {
                        callback(null);
                    }
                });
            }
        });        
    },
    isCreator: function(pwhash, reviewID, callback){
        pool.query('select reviews.id from reviews inner join accounts on reviews.creator_id = accounts.id where reviews.id = ? and pwhash = ?;', [reviewID, pwhash] , function (err, result, fields) {
            if (err) throw err;
            if(result.length === 1){
                callback(true);
            }
            else {
                callback(false);
            }
        });
    },
    isAnswerCreator: function(pwhash, answerID, callback){
        pool.query('select answers.id from answers inner join accounts on answers.creatorID = accounts.id where answers.id = ? and pwhash = ?;', [answerID, pwhash] , function (err, result, fields) {
            if (err) throw err;
            if(result.length === 1){
                callback(true);
            }
            else {
                callback(false);
            }
        });
    },
    deleteReview: function(reviewID){
        pool.query("DELETE FROM answers WHERE reviewID = ?;", [reviewID], function(err, result, fields){
            if(err){
                throw err;
            }
            pool.query("DELETE FROM reviews WHERE id = ?;", [reviewID], function(err, result, fields){
                if(err){
                    throw err;
                }
            });
        });        
    },
    deleteAnswer: function(answerID){
        pool.query("DELETE FROM answers WHERE id = ?;", [answerID], function(err, result, fields){
            if(err){
                throw err;
            }
        });
    },
    sendMessage: function(accountID, message, link){
        pool.query("INSERT INTO messages(accountID, message, link) VALUES(?, ?, ?);", [accountID, message, link], function(err, result, fields){
            if(err) throw err;
            
        });
    }
}