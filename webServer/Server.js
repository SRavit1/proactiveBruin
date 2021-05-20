var express = require("express");
const bodyParser = require("body-parser");
var mysql = require('mysql');
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

function updateDatabase(req, res) {
	for (hostname in req.body.timeTable) {
		let selectQuery = "SELECT * FROM " + req.body.id + " WHERE hostname=\"" + hostname + "\";";
		console.log(selectQuery);

		/*
		let selectQueryErr = null
		let selectQueryRes = null
		con.query(selectQuery, (err, result) => {
			selectQueryErr = err
			selectQueryRes = result
			console.log("selectQuery result returned")
		})
		*/

		var selectQueryRes = sync_con.query(selectQuery)

		if (selectQueryRes.length > 0) {
			let updatedTime = selectQueryRes[0]["time"] + req.body.timeTable[hostname];
			let updateQuery = "UPDATE " + req.body.id + " SET time=" + updatedTime + " WHERE hostname=\"" + hostname + "\";";
			console.log(updateQuery)
			con.query(updateQuery, (err, update_res) => {
				if (err) {
					console.log(err)
					res.end()
					return
				}
				res.end()
			})
		} else {
			let date = new Date()
			let dateString = utils.getCurrDateString()

			let insertQuery = "INSERT INTO " + req.body.id + " (hostname, time, date) VALUES (\"" +
				hostname + "\", " + req.body.timeTable[hostname] + ", \"" + dateString + "\");"
			console.log(insertQuery)
			con.query(insertQuery, (err, res) => {})
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
		let createGoalTableQuery = "CREATE TABLE IF NOT EXISTS " + req.body.id + "_goal (date DATE, goal_id VARCHAR(255), timeTarget INT, timeSpent INT)";
		
		con.query(createDataTableQuery, (err, result) => { updateDatabase(req, res) })
		con.query(createGoalTableQuery, (err, result) => {})

		knownIds.push(req.body.id)
	} else {
		updateDatabase(req, res)
	}
})

app.post('/requestData', function (req, res) {
	console.log("requestData request to server")

	let selectQuery = "SELECT * FROM " + req.body.id;
	con.query(selectQuery, (err, result) => {
		res.send(result)
		res.end()
	})
})

/*
Sample call:
{
  "id":"testID",
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

	console.log("Create goal with id", goalID, "from", startDateString, "to", endDateString, "lasting ", days, "days and going from", startGoal, "to", endGoal, "minutes with", req.body.method, "method.")

	targetTime = utils.getGoalTargets(days, startGoal, endGoal, req.body.method)

	currDate = startDate
	for (i = 0; i < days; i++) {
		let createGoalQuery = "INSERT INTO " + req.body.id + "_goal (date, goal_id, timeTarget) VALUES " + 
			"(\"" + utils.getDateString(currDate) + "\",\"" + goalID + "\", " + targetTime[i] + ");"
		console.log(createGoalQuery)

		if (!(knownIds.includes(req.body.id))) {
			let createGoalTableQuery = "CREATE TABLE IF NOT EXISTS " + req.body.id + "_goal (date DATE, goal_id VARCHAR(255), timeTarget INT, timeSpent INT)";
			console.log(createGoalTableQuery)

			con.query(createGoalTableQuery, (err, result) => {
				con.query(createGoalQuery, (err, result) => {})
				res.end()
			})

			knownIds.push(req.body.id)
		} else {
			con.query(createGoalQuery, (err, result) => {})
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
	con.query(deleteGoalQuery, (err, result) => {})
	res.end()
})

var PORT = 3000
app.listen(PORT, function() {
    console.log("Listening on port " + PORT)
});