var express = require("express");
const bodyParser = require("body-parser");
var sync_mysql = require('sync-mysql')
var utils = require('./utils.js');
const app = express();


var knownIds = []

var sync_con = new sync_mysql({
  host: "18.224.63.160",
  user: "proactiveBruinUser",
  password: "bruin123",
  database: "proactiveBruinData",
})
console.log("Successfully connected to mysql server!");

app.use(bodyParser.json({ extended: true }));

function updateDatabase(req, res) {
	for (hostname in req.body.timeTable) {
		let dateString = utils.getCurrDateString() //needed to compare with duplicates not on same day

		let selectQuery = "SELECT * FROM " + req.body.id + " WHERE hostname=\"" + hostname + "\"" + " AND date=\"" + dateString + "\";"; //if on different day, it is counted again
		console.log(selectQuery);


		var selectQueryRes = sync_con.query(selectQuery)

		if (selectQueryRes.length > 0) {
			let updatedTime = selectQueryRes[0]["time"] + req.body.timeTable[hostname];
			let updateQuery = "UPDATE " + req.body.id + " SET time=" + updatedTime + " WHERE hostname=\"" + hostname + "\" AND date=\"" + dateString + "\";";
			console.log(updateQuery)
			sync_con.query(updateQuery)
			res.end()
		} else {
			let date = new Date()

			let insertQuery = "INSERT INTO " + req.body.id + " (hostname, time, date) VALUES (\"" +
				hostname + "\", " + req.body.timeTable[hostname] + ", \"" + dateString + "\");"
			console.log(insertQuery)
			sync_con.query(insertQuery)
		}

	}
}
app.get('/', function (req, res) {
	res.end("GET request to server")
})

/*
Sample call:
{
  "id":"test",
  "timeTable": {
	"www.youtube.com": 10,
	"www.google.com": 20
  }
}
*/
app.post('/sendData', function (req, res) {
	console.log("sendData request to server")
	console.log("timeTable is", req.body.timeTable)

	if (!(knownIds.includes(req.body.id))) {
		let createDataTableQuery = "CREATE TABLE IF NOT EXISTS " + req.body.id + " (hostname VARCHAR(255), time INT, date DATE);"
		let createGoalTableQuery = "CREATE TABLE IF NOT EXISTS " + req.body.id + "_goal (date DATE, goal_id VARCHAR(255), hostname VARCHAR(255), timeTarget INT, timeSpent INT)";
		
		sync_con.query(createDataTableQuery)
		sync_con.query(createGoalTableQuery)

		updateDatabase(req, res)

		knownIds.push(req.body.id)
	} else {
		updateDatabase(req, res)
	}
})

/*
Sample call:
{
  "id":"test"
}
*/
app.post('/requestData', function (req, res) {
	console.log("requestData request to server")

	if(req.body.startDate==undefined)	//if no date range specified, select all data in table 
		var selectQuery = "SELECT * FROM " + req.body.id;
	else
		var selectQuery = "SELECT * FROM " + req.body.id + " WHERE date >= \'" + req.body.startDate + "\' AND date <= \'" + req.body.endDate + "\'";
	console.log(selectQuery)
	let result = sync_con.query(selectQuery)
	res.send(result)
	res.end()
})

/*
Sample call:
{
  "id":"test",
  "hostname":"www.youtube.com",
  "startDate":"05-14-2021",
  "endDate":"05-21-2021",
  "startGoal":60,
  "endGoal":15,
  "method":"linear"
}
*/
app.post('/createGoal', function (req, res) {
	//TODO: How can we prevent duplicate goals?
	//TODO: How can we conduct error checking for input?

	let goalID = utils.generateID()

	startDate = new Date(req.body.startDate)
	endDate = new Date(req.body.endDate)

	startDateString = utils.getDateString(startDate)
	endDateString = utils.getDateString(endDate)

	startGoal = parseInt(req.body.startGoal)*60 //In seconds
	endGoal = parseInt(req.body.endGoal)*60 //In seconds

	days = Math.ceil((endDate-startDate)/(1000*60*60*24))

	console.log("Create goal with id", goalID, "for website", req.body.hostname, "from", startDateString, "to", endDateString, "lasting ", days, "days and going from", startGoal, "to", endGoal, "minutes with", req.body.method, "method.")

	targetTime = utils.getGoalTargets(days, startGoal, endGoal, req.body.method)

	currDate = startDate
	for (i = 0; i < days; i++) {
		let createGoalQuery = "INSERT INTO " + req.body.id + "_goal (date, goal_id, hostname, timeTarget, timeSpent) VALUES " + 
			"(\"" + utils.getDateString(currDate) + "\", \"" + goalID + "\", \"" + req.body.hostname + "\", " + targetTime[i] + ", 0);"
		console.log(createGoalQuery)

		if (!(knownIds.includes(req.body.id))) {
			let createGoalTableQuery = "CREATE TABLE IF NOT EXISTS " + req.body.id + "_goal (date DATE, goal_id VARCHAR(255), hostname VARCHAR(255), timeTarget INT, timeSpent INT)";
			console.log(createGoalTableQuery)

			sync_con.query(createGoalTableQuery)
			sync_con.query(createGoalQuery)
			res.end()

			knownIds.push(req.body.id)
		} else {
			sync_con.query(createGoalQuery)
			res.end()
		}

		currDate.setDate(currDate.getDate() + 1)
	}
})

/*
Sample call:
{
  "id":"test",
  "goal_id":"ibfloxk"
}
*/
app.post('/deleteGoal', function (req, res) {
	let deleteGoalQuery = "DELETE FROM " + req.body.id + "_goal WHERE goal_id=\"" + req.body.goal_id + "\";";
	console.log(deleteGoalQuery)
	sync_con.query(deleteGoalQuery)
	res.end()
})

app.post('/requestGoalData', function (req, res) {
	console.log("requestGoalData request to server")

	let selectQuery = "SELECT * FROM " + req.body.id + "_goal;";
	let result = sync_con.query(selectQuery)
	res.send(result)
	res.end()
})

var PORT = 3000
app.listen(PORT, function() {
    console.log("Listening on port " + PORT)
});

app.post('/requestCatData', function (req, res) {
	console.log("requestCatData request to server")

	let selectQuery = "SELECT * FROM " + req.body.id + "_cat;";
	//console.log(deleteGoalQuery)
	let result = sync_con.query(selectQuery)
	res.send(result)
	res.end()
})


app.post('/deleteCat', function (req, res) {
	let deleteCatQuery = "DELETE FROM " + req.body.id + "_cat WHERE hostname=\"" + req.body.hostname + "\";";
	console.log(deleteCatQuery)
	sync_con.query(deleteCatQuery)
	//res.end()
})


app.post('/addCat', function (req, res) {
	console.log("sendCategorizationData request to server")
	let createAddQuery = "INSERT INTO " + req.body.id + "_cat (hostname, category) VALUES " +
		"(\"" + req.body.hostname + "\", \"" + req.body.category + "\");";
	console.log(createAddQuery)
	sync_con.query(createAddQuery)

})

app.post('/updateCat', function (req, res) {
	console.log("update request to server")
	let createUpdateQuery = "UPDATE " + req.body.id + "_cat SET category=" +
		"\"" + req.body.category + "\" " + "WHERE hostname=\"" + req.body.hostname + "\";";
	console.log(createUpdateQuery)
	sync_con.query(createUpdateQuery)
})

app.post('/clearandfillCat', function (req, res) {	//fills table with premade vals 
	console.log("clearing cat table")
	let tempClearQuery = "DELETE FROM " + req.body.id + "_cat"
	sync_con.query(tempClearQuery)	
		
	console.log("filling category table")
		for(i=0;i<Entertainment.length;i++){
			let tempAddQuery = "INSERT INTO " + req.body.id + "_cat (hostname, category) VALUES " +
		"(\"" + Entertainment[i] + "\", \"Entertainment\");";
			sync_con.query(tempAddQuery)
		}
		for(i=0;i<Productivity.length;i++){
			let tempAddQuery = "INSERT INTO " + req.body.id + "_cat (hostname, category) VALUES " +
		"(\"" + Productivity[i] + "\", \"Productivity\");";
			sync_con.query(tempAddQuery)		
		}
		for(i=0;i<Shopping.length;i++){
			let tempAddQuery = "INSERT INTO " + req.body.id + "_cat (hostname, category) VALUES " +
		"(\"" + Shopping[i] + "\", \"Shopping\");";
			sync_con.query(tempAddQuery)		
		}
})

app.post('/clearCat', function(req,res){	//empties table 
	let clear = "DELETE FROM " + req.body.id + "_cat"
	console.log(clear)
	sync_con.query(clear)		
})


var Entertainment =[
"www.youtube.com",
"www.netflix.com",
"www.hulu.com",
"www.twitch.tv",
"www.disneyplus.com",
"www.primeivideo.com",
"www.xfinity.com",
"www.hbomax.com"
]

var Productivity = [
"accounts.google.com",
"drive.google.com",
"ccle.ucla.edu",
"mail.google.com",
"www.google.com",
"stackoverflow.com",
"libgen.is",
"extensions",
"ProactiveBruin",
"www.javascripttutorial.net",
"github.com",
"stackoverflow.com",
"docs.google.com",
"web.cs.ucla.edu"
]

var Shopping = [
"www.target.com",
"www.amazon.com",
"www.urbanoutfitters.com"
]
