background_window = chrome.extension.getBackgroundPage().window

function drawChart() {
	var data = google.visualization.arrayToDataTable([
	  ['Task', 'Hours per Day'],
	  ['Facebook',     11],
	  ['Instagram',      2],
	  ['Netflix',  2],
	  ['Youtube', 2],
	  ['CCLE',    7]
	]);

	var options = {
	  title: 'My Daily Screentime'
	};

	var chart = new google.visualization.PieChart(document.getElementById('piechart'));

	chart.draw(data, options);
}

document.addEventListener('DOMContentLoaded', onLoad, false)

function onLoad() {
	google.charts.load('current', {'packages':['corechart']});
	google.charts.setOnLoadCallback(drawChart);

	var done = false
	const bg = chrome.extension.getBackgroundPage()


	var xhr = new XMLHttpRequest()
	xhr.open("POST", "http://localhost:3000/requestData")
	xhr.setRequestHeader("Content-Type", "application/json")

	xhr.send(JSON.stringify({"id":bg.id}))
	xhr.onreadystatechange = function() {
		if (!done) {
			let returnData = xhr.responseText.trim()
			if (returnData === "") return
			siteDataText = '{' + "\"key_val\":" + xhr.responseText + '}'
			console.log(siteDataText)
			siteData = JSON.parse(siteDataText)["key_val"]

			console.log(siteData)
			done = true
		}
	}
}