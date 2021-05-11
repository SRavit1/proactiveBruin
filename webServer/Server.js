var express = require("express");
const bodyParser = require("body-parser");
var mysql = require('mysql');
const app = express();

var knownIds = []

var con = mysql.createConnection({
  host: "18.224.63.160",
  user: "proactiveBruinUser",
  password: "bruin123",
  database: "proactiveBruinData",
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Successfully connected to mysql server!");
});

app.use(bodyParser.json({ extended: true }));


app.get('/', function (req, res) {
  res.end("GET request to server")
})

app.post('/sendData', function (req, res) {
	console.log("sendData request to server")
	console.log("timeTable is", req.body.timeTable)

	if (!(knownIds.includes(req.body.id))) {
		let createTableQuery = "CREATE TABLE IF NOT EXISTS " + req.body.id + " (hostname VARCHAR(255), time INT, date DATE);"
		
		console.log(createTableQuery)
		con.query(createTableQuery, (err, result) => {})
		
		knownIds.push(req.body.id)
	}

	for (hostname in req.body.timeTable) {
		let date = new Date()
		let dateString = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()

		let insertQuery = "INSERT INTO " + req.body.id + " (hostname, time, date) VALUES (\"" +
			hostname + "\", " + req.body.timeTable[hostname] + ", \"" + dateString + "\");"
		
		console.log(insertQuery);
		con.query(insertQuery, (err, result) => {})
	}
})

app.post('/requestData', function (req, res) {
	console.log("requestData request to server")

	let selectQuery = "SELECT * FROM " + req.body.id;
	console.log(selectQuery)
	con.query(selectQuery, (err, result) => {
		res.send(result)
		res.end()
	})
})

var PORT = 3000
app.listen(PORT, function() {
    console.log("Listening on port " + PORT)
});