var restify = require('restify');
var fs = require('fs');

var sanitizeHtml = require('sanitize-html');
var crypto = require('crypto');

var helper = require("./helpers");
var requests = require("./requests");

var https_options = {
	key: fs.readFileSync('/etc/letsencrypt/live/lehrerbewertung.org/privkey.pem'),
	certificate: fs.readFileSync('/etc/letsencrypt/live/lehrerbewertung.org/cert.pem')
};
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

	var pw = req.body.password;
	if(pw == ""){
		res.send(400, "Password not entered");
		return next(false);
	}
	var hash = crypto.createHash('sha256').update(pw).digest("hex");
	helper.checkAccountValidation(hash, pool, function(response){
		if(response == null){
			res.send(400, "Login failed or not signed in");
			return next(false);
		}
		req.loginResponse = response;
		req.isTeacher = (response.jahrgangsstufe == 0);
		req.isMod = (response.moderator == 1);
		req.nick = response.nick;
		req.userID = response.id;
		return next();
	});
});

server.post('/login', requests.login);
server.post('/search', requests.search);
server.post('/category', requests.category);
server.post('/create', requests.create);

server.listen(43253);