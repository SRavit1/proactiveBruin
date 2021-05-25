var utils = require('../webServer/utils.js');
var assert = require('assert');

var sync_mysql = require('sync-mysql')


var knownIds = []

var sync_con = new sync_mysql({
  host: "18.224.63.160",
  user: "proactiveBruinUser",
  password: "bruin123",
  database: "proactiveBruinData",
})
console.log("Successfully connected to mysql server!");

function updateGoalEntries (ID, date) {
	let goalQuery = "SELECT * FROM " + ID + "_goal WHERE date=\"" + date + "\";"
	console.log(goalQuery)
	let goalQueryRes = sync_con.query(goalQuery)
	for (let i = 0; i < goalQueryRes.length; i++) {
		let dataQuery = "SELECT * FROM " + ID + " WHERE date=\"" + date + "\"" + " AND " + "hostname=\"" + goalQueryRes[i].hostname + "\";"
		console.log(dataQuery)
		let dataQueryRes = sync_con.query(dataQuery)
		assert(dataQueryRes.length == 0 | dataQueryRes.length == 1)
		if (dataQueryRes.length == 1) {
			let timeSpent = dataQueryRes[0].time

			let updateQuery = "UPDATE " + ID + "_goal SET timeSpent=" + timeSpent + " WHERE date=\"" + date + "\" AND hostname=\"" + goalQueryRes[i].hostname + "\";";
			console.log(updateQuery)
			sync_con.query(updateQuery)

		}
	}
}

//updateGoalEntries("test", utils.getCurrDateString())
let currDate = utils.getCurrDateString()

tables = sync_con.query("SHOW TABLES;")
for (let i = 0; i < tables.length; i++) {
	tableName = Object.values(tables[i])[0]
	if (/^[a-z]+$/.test(tableName)) { //Theoretically, condition is true iff tableName is a user id
		updateGoalEntries(tableName, currDate)
	}
}
