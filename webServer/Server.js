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
		let selectQuery = "SELECT * FROM " + req.body.id + " WHERE hostname=\"" + hostname + "\";";
		console.log(selectQuery);

		var selectQueryRes = sync_con.query(selectQuery)

		if (selectQueryRes.length > 0) {
			let updatedTime = selectQueryRes[0]["time"] + req.body.timeTable[hostname];
			let updateQuery = "UPDATE " + req.body.id + " SET time=" + updatedTime + " WHERE hostname=\"" + hostname + "\";";
			console.log(updateQuery)
			sync_con.query(updateQuery)
			res.end()
		} else {
			let date = new Date()
			let dateString = utils.getCurrDateString()

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

app.post('/requestData', function (req, res) {
	console.log("requestData request to server")

	let selectQuery = "SELECT * FROM " + req.body.id;
	let result = sync_con.query(selectQuery)
	res.send(result)
	res.end()
})

/*
Sample call:
{
  "id":"testID",
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

	startGoal = parseInt(req.body.startGoal)
	endGoal = parseInt(req.body.endGoal)

	days = Math.ceil((endDate-startDate)/(1000*60*60*24))

	console.log("Create goal with id", goalID, "for website", req.body.hostname, "from", startDateString, "to", endDateString, "lasting ", days, "days and going from", startGoal, "to", endGoal, "minutes with", req.body.method, "method.")

	targetTime = utils.getGoalTargets(days, startGoal, endGoal, req.body.method)

	currDate = startDate
	for (i = 0; i < days; i++) {
		let createGoalQuery = "INSERT INTO " + req.body.id + "_goal (date, goal_id, hostname, timeTarget) VALUES " + 
			"(\"" + utils.getDateString(currDate) + "\", \"" + goalID + "\", \"" + req.body.hostname + "\", " + targetTime[i] + ");"
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
  "id":"testID",
  "goal_id":"ibfloxk"
}
*/
app.post('/deleteGoal', function (req, res) {
	let deleteGoalQuery = "DELETE FROM " + req.body.id + "_goal WHERE goal_id=\"" + req.body.goal_id + "\";";
	console.log(deleteGoalQuery)
	sync_con.query(deleteGoalQuery)
	res.end()
})

var PORT = 3000
app.listen(PORT, function() {
    console.log("Listening on port " + PORT)
});