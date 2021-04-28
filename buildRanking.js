var mysql = require('mysql');
var conf = require('config');

var con = mysql.createConnection(conf.get("MYSQL"));

con.connect(function(err) {
	if (err) throw err;
});

class Database {
	constructor(_con) {
        this.con = _con;
    }
    query( sql, args ) {
        return new Promise( ( resolve, reject ) => {
            this.con.query( sql, args, ( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( [rows, args] );
            } );
        } );
    }
}
var database = new Database(con);

var rankMap = [];

con.query('SELECT id FROM teachers;', async function (err, res, fields) {
	if (err) throw err;
	
	var promises = [];
	for(var i = 0; i < res.length; i++){
		var teacherID = res[i].id;
		var promise = database.query('SELECT grademap, teacher FROM reviews WHERE teacher = ? AND reviews.reviewed = 1;', [teacherID]);
		promises.push(promise);
		promise.then(([rows, args]) => {
			if (err) throw err;

			var average = 0;
			for(var x = 0; x < rows.length; x++){
				var grademap = JSON.parse(rows[x].grademap.replace(/;/g, ","));
				var firstAverage = 0;
				for(var y = 0; y < grademap.length; y++){
					firstAverage += parseInt(grademap[y][1]);
				}
				firstAverage /= grademap.length;
				average += firstAverage;
			}
			average /= rows.length;
			if(isNaN(average)) average = 0;
			if(rows.length >= 3){
				rankMap.push([args[0], average, rows.length]);
			}
		});
	}
	const array = await Promise.all(promises);

	con.query('TRUNCATE TABLE ranking;', function (err, res, fields) {
		if (err) throw err;
		con.query('INSERT INTO ranking(teacherID, rating, ratingCount) VALUES ?;', [rankMap] , function (err, res, fields) {
			if (err) throw err;
			con.end((err) => {});
		});
	});
});
