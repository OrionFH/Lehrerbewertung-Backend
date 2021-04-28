var restify = require('restify');
var errs = require('restify-errors');
var fs = require('fs');

var sanitizeHtml = require('sanitize-html');
var crypto = require('crypto');

var helper = require("./helpers");
var requests = require("./requests");

var Validator = require('jsonschema').Validator;
var v = new Validator();

const validator = require( 'restify-json-schema-validation-middleware' )();

var https_options = {
	key: fs.readFileSync('/usr/local/psa/var/modules/letsencrypt/etc/live/lehrerbewertung.org/privkey.pem'),
	certificate: fs.readFileSync('/usr/local/psa/var/modules/letsencrypt/etc/live/lehrerbewertung.org/cert.pem')
};
//TODO: pass options for deploy here
var server = restify.createServer(https_options);
server.use(restify.plugins.bodyParser());

function setAccessControl(res){
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', 'https://lehrerbewertung.org');

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
   res.setHeader('Access-Control-Allow-Credentials', true);
}

server.opts('/', function(req, res, next){
	setAccessControl(res);
	res.send(200, "", {'Content-Type': 'text/html'});
	return next();
});

server.use(function(req, res, next) {
	setAccessControl(res);


	//HTML sanitization
	for (var key in req.body) {
		if (req.body.hasOwnProperty(key)) {
			req.body[key] = sanitizeHtml(req.body[key]);
		}
	}

	if(req.body == undefined) {
		return next(new errs.BadRequestError("Login failed"));
	}

	if(!(req.getPath() == "/login" || req.getPath() == "/refreshAccess")){

		if(!req.body.hasOwnProperty("token")){
			return next(new errs.BadRequestError("Invalid access token"));
		}

		var token = req.body.token;

		//var hash = crypto.createHash('sha256').update(pw).digest("hex");
		helper.checkAccessToken(token, function(response) {
			if(response == null){
    	        return next(new errs.BadRequestError("Invalid access token"));
			}
			req.isTeacher = (response.jahrgangsstufe == 0);
			req.isMod = (response.moderator == 1);
			req.nick = response.nick;
			req.userID = response.id;
			req.hash = response.hash;
			return next();
		});
	}
	else {
		return next();
	}
});

var validationJSON = {
	login: {
		"properties": {
			"password": {"type": "string"}
		},
		"required": ["password"]
	},
	refreshAccess: {
		"properties": {
			"refreshToken": {"type": "string"}
		},
		"required": ["refreshToken"]
	},
	search: {
		"properties": {
			"token": {"type": "string"},
			"searchItem": {"type": "string"}
		},
		"required": ["token", "searchItem"]
	},
	category: {
		"properties": {
			"token": {"type": "string"},
			"category": {"type": "string"}
		},
		"required": ["token", "category"]
	},
	create: {
		"properties": {
			"token": {"type": "string"},
			"grademap": {"type": "string"},
			"review": {"type": "string"},
			"name": {"type": "string"}
		},
		"required": ["token", "grademap", "review", "name"]
	},
	reviews: {
		"properties": {
			"token": {"type": "string"},
			"name": {"type": "string"}
		},
		"required": ["token", "name"]
	},
	review: {
		"properties": {
			"token": {"type": "string"},
			"reviewID": {"type": "string"}
		},
		"required": ["token", "reviewID"]
	},
	reviewsNotReviewed: {
		"properties": {
			"token": {"type": "string"},
		},
		"required": ["token"]
	},
	setReviewed: {
		"properties": {
			"token": {"type": "string"},
			"reviewID": {"type": "string"}
		},
		"required": ["token", "reviewID"]
	},
	isMod: {
		"properties": {
			"token": {"type": "string"}
		},
		"required": ["token"]
	},
	isCreator: {
		"properties": {
			"token": {"type": "string"},
			"reviewID": {"type": "string"}
		},
		"required": ["token", "reviewID"]
	},
	delete: {
		"properties": {
			"token": {"type": "string"},
			"reviewID": {"type": "string"}
		},
		"required": ["token", "reviewID"]
	},
	nick: {
		"properties": {
			"token": {"type": "string"},
			"nick": {"type": "string"}
		},
		"required": ["token", "nick"]
	},
	addAnswer: {
		"properties": {
			"token": {"type": "string"},
			"answer": {"type": "string"},
			"reviewID": {"type": "string"}
		},
		"required": ["token", "answer", "reviewID"]
	},
	getAnswers: {
		"properties": {
			"token": {"type": "string"},
			"reviewID": {"type": "string"}
		},
		"required": ["token", "reviewID"]
	},
	deleteAnswer: {
		"properties": {
			"token": {"type": "string"},
			"answerID": {"type": "string"}
		},
		"required": ["token", "answerID"]
	},
	getRandomReview: {
		"properties": {
			"token": {"type": "string"}
		},
		"required": ["token"]
	},
	createAccount: {
		"properties": {
			"token": {"type": "string"},
			"jahrgang": {"type": "string"},
			"vorname": {"type": "string"},
			"nachname": {"type": "string"}
		},
		"required": ["token", "jahrgang", "vorname", "nachname"]
	},
	top20: {
		"properties": {
			"token": {"type": "string"}
		},
		"required": ["token"]
	},
	getMessageCount : {
		"properties": {
			"token": {"type": "string"}
		},
		"required": ["token"]
	},
	getMessages : {
		"properties": {
			"token": {"type": "string"}
		},
		"required": ["token"]
	},
	messageRead : {
		"properties": {
			"token": {"type": "string"},
			"messageID": {"type": "string"}
		},
		"required": ["token", "messageID"]
	}
}

server.post('/login', validator.body(validationJSON.login), requests.login);
server.post('/refreshAccess', validator.body(validationJSON.refreshAccess), requests.refreshAccess);
server.post('/search', validator.body(validationJSON.search), requests.search);
server.post('/category', validator.body(validationJSON.category), requests.category);
server.post('/create', validator.body(validationJSON.create), requests.create);
server.post('/reviews', validator.body(validationJSON.reviews), requests.reviews);
server.post('/review', validator.body(validationJSON.review), requests.review);
server.post('/reviewsNotReviewed', validator.body(validationJSON.reviewsNotReviewed), requests.reviewsNotReviewed);
server.post('/setReviewed', validator.body(validationJSON.setReviewed), requests.setReviewed);
server.post('/isMod', validator.body(validationJSON.isMod), requests.isMod);
server.post('/isCreator', validator.body(validationJSON.isCreator), requests.isCreator);
server.post('/delete', validator.body(validationJSON.delete), requests.delete);
server.post('/nick', validator.body(validationJSON.nick), requests.nick);
server.post('/addAnswer', validator.body(validationJSON.addAnswer), requests.addAnswer);
server.post('/getAnswers', validator.body(validationJSON.getAnswers), requests.getAnswers);
server.post('/deleteAnswer', validator.body(validationJSON.deleteAnswer), requests.deleteAnswer);
server.post('/getRandomReview', validator.body(validationJSON.getRandomReview), requests.getRandomReview);
server.post('/createAccount', validator.body(validationJSON.createAccount), requests.createAccount);
server.post('/top20', validator.body(validationJSON.top20), requests.top20);
server.post('/getMessageCount', validator.body(validationJSON.getMessageCount), requests.getMessageCount);
server.post('/getMessages', validator.body(validationJSON.getMessages), requests.getMessages);
server.post('/messageRead', validator.body(validationJSON.messageRead), requests.messageRead);

server.on('restifyError', function (req, res, err, cb) {
	err.toString = function toString() {
	  return err.body.code + ": " + err.body.message;
	};

	err.toJSON = err.toString;
  
	return cb();
  });

server.listen(43253);
