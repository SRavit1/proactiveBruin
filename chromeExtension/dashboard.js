background_window = chrome.extension.getBackgroundPage().window

//keeps stores site data and cleaned data for global use
var globsiteData 
var globProcessedSiteData
var extensionid = chrome.runtime.id	//32 char id given to each extension 


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
	
	globProcessedSiteData = screentimeData //sets processed var on load
	
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
			
			globsiteData = siteData //sets glob var on load
			
			google.charts.setOnLoadCallback(drawChart(siteData));
			done = true
		}
	}
}

document.addEventListener('DOMContentLoaded', function(){
const selectElement = document.querySelector('.statsselect');
selectElement.addEventListener('change', (event) => {
  const result = document.getElementById('result');
  result.textContent = `You selected ${event.target.value}`;
  if(event.target.value == 'Websites'){
  	google.charts.setOnLoadCallback(drawChart(globsiteData));
  }
  else {
  	drawCategoryChart()
  }
});
})


function drawCategoryChart() {
	var entertainmentnum = 0
	var productivitynum = 0
	var othernum = 0
	var shoppingnum = 0
	for (i=1; i<globProcessedSiteData.length; i++){
		temp = globProcessedSiteData[i][0]

		if(Entertainment.includes(temp)){
			entertainmentnum+=Number(globProcessedSiteData[i][1])
		}
		else if(Productivity.includes(temp)){
			productivitynum+=Number(globProcessedSiteData[i][1])
		}
		else if(Shopping.includes(temp)){
			shoppingnum+=Number(globProcessedSiteData[i][1])
		}
		else{
			othernum+=Number(globProcessedSiteData[i][1])
		}
	}
	var data = google.visualization.arrayToDataTable([
	  ['Task', 'Hours per Day'],
	  ['Entertainment',     entertainmentnum],
	  ['Productivity',      productivitynum],
	  ['Shopping',  shoppingnum],
	  ['Other',    othernum],
	]);

	var options = {
	  title: 'Daily Screentime By Category'
	};

	var chart = new google.visualization.PieChart(document.getElementById('piechart'));

	chart.draw(data, options);
}



//websites in each category
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
"ProactiveBruin"
]

var Shopping = [
"www.target.com",
"www.amazon.com"
]
