var mysql = require('mysql');
const restifyJsonSchemaValidationMiddleware = require('restify-json-schema-validation-middleware');
var pool  = mysql.createPool({
    connectionLimit : 100,
    host            : 'localhost',
    database        : 'standard'
});

const { v4: uuidv4 } = require('uuid');

var jwt = require("jsonwebtoken");


var genAccessToken = function(databaseRes) {
    return jwt.sign({
        isModerator: databaseRes.moderator == 1,
        isStudent: databaseRes.jahrgangsstufe != 0,
        userID: databaseRes.id
    }, secret, { expiresIn: '30m' });
};

module.exports = {
    pool,
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