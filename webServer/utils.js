exports.getDateString = function (date) {
	return date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()
}

exports.getCurrDateString = function () {
	let date = new Date()
	return date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()
}

exports.generateID = function () {
	let id = ""
	for (let i = 0; i < 7; i++)
		id += String.fromCharCode(97+Math.random()*26)
  return id
}

exports.getGoalTargets = function (days, startGoal, endGoal, method) {
	var targets = []
	if (method === "linear") {
		for (i = 0; i < days; i++) {
			targets.push(Math.round(startGoal + (endGoal-startGoal)*i/(days-1)))
		}
	}
	return targets
}