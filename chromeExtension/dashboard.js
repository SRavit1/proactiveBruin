background_window = chrome.extension.getBackgroundPage().window

function listSiteData(siteData)
{
	//Add data from webserver
	var screentimeData = [['Task', 'Hours per Day']];
	for (site in siteData){
		screentimeData.push([siteData[site]["hostname"], siteData[site]["time"]])
	}
	//sort by time
	screentimeData.sort(function(a,b){
		return a[1]-b[1]
	});

	return screentimeData;
}

function drawChart(siteData) {

	var data = google.visualization.arrayToDataTable(listSiteData(siteData));

	var options = {
	  title: 'My Daily Screentime'
	};

	var chart = new google.visualization.PieChart(document.getElementById('piechart'));

	chart.draw(data, options);
}

document.addEventListener('DOMContentLoaded', onLoad, false)

function onLoad() {
	google.charts.load('current', {'packages':['corechart']});

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

			google.charts.setOnLoadCallback(drawChart(siteData));
			done = true
		}
	}

	
}