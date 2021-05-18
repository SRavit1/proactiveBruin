background_window = chrome.extension.getBackgroundPage().window

function listSiteData(siteData)
{

	//adds times for duplicates
	var sitename = []
	var sitetime = []
	var temp = ""
	for (site in siteData){
		temp = String(siteData[site]["hostname"])
		if (!sitename.includes(temp)){
			sitename.push(temp)
			sitetime.push(Number(siteData[site]["time"]))
		}
		else if (sitename.includes(temp)){
			sitetime[sitename.indexOf(temp)] += Number(siteData[site]["time"])
		}		
	}

	//add data from webserver
	var screentimeData = [['Task', 'Hours per Day']];
	var i = 0
	for (i=0; i<sitename.length;i++){
		screentimeData.push([sitename[i] , sitetime[i]])
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
