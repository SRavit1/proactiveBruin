background_window = chrome.extension.getBackgroundPage().window

//keeps stores site data and cleaned data for global use
var globsiteData 
var extensionid = chrome.runtime.id	//32 char id given to each extension 
var dateRangeData
var useDateRangeSwitch = false //keeps track of whether to use dateRangeData or globsiteData



function listSiteData(siteData, checkDupes)
{

	//adds times for duplicates
	var sitename = []
	var sitetime = []
	var temp = ""
	for (site in siteData){
		temp = String(siteData[site]["hostname"])
		if(temp == extensionid) temp="ProactiveBruin";
		if (!sitename.includes(temp) || !checkDupes){ //for use in line charts will not add duplicate hostnames on different days
			sitename.push(temp)
			sitetime.push(Number(siteData[site]["time"]))
		}
		else if (sitename.includes(temp) && checkDupes){
			sitetime[sitename.indexOf(temp)] += Number(siteData[site]["time"])
		}		
	}

	//add data from webserver
	var screentimeData = [['Task', 'Hours per Day']];
	for (i=0; i<sitename.length;i++){
		screentimeData.push([sitename[i] , sitetime[i]])
	}
	//sort by time
	screentimeData.sort(function(a,b){
		return b[1]-a[1] //high to low
	});
		
	return screentimeData;
}

function historyFormat(siteData)
{
	var data = new google.visualization.DataTable();

	var sitenames = [];
	var sitedates = [];

	data.addColumn('string', 'date');
	//add unique site names
	for (site in siteData){
		var tempName = String(siteData[site]["hostname"]);
		var tempDate = String(siteData[site]["date"]).substring(0,10);//format example: "2021-05-25T04:00:00.000Z", or "YYYY-MM-DDTO...."
		if (!sitenames.includes(tempName))
			sitenames.push(tempName);
		
		if (!sitedates.includes(tempDate))
			sitedates.push(tempDate);
		
	}
	//sort sitedates in ascending order
	sitedates.sort();

	//add columns corresponding to each site name
	sitenames.forEach(sName => data.addColumn('number',sName));
	console.log(data);

	//for each date, add row in format: [date, site1time, site2time, ...]
	sitedates.forEach(function(curDate,index) {
		var newRow = new Array(sitenames.length).fill(0); //declare an array filled with zeroes
		var date = [curDate];
		
		//find all the sites visited that day, and add to the row
		for (site in siteData){
			var tempDate = String(siteData[site]["date"]).substring(0,10);
			var tempName = String(siteData[site]["hostname"]);
			var tempTime = Number(siteData[site]["time"]);
			if (curDate === tempDate) //check that it's the correct day
			{
				newRow[sitenames.indexOf(tempName)] = tempTime; //update time
				//console.log(tempName + " has " + tempTime + " minutes");	
			}
		}
		newRow = date.concat(newRow);

		console.log(newRow);
		data.addRow(newRow);
		console.log(data);
	});

	return data;
}

function drawCharts(siteData) {

	var data = google.visualization.arrayToDataTable(listSiteData(siteData, true)); 

	//piechart
	var piechart_options = {
	  title: 'Pie Chart: My Daily Screentime'
	};
	var piechart = new google.visualization.PieChart(document.getElementById('piechart'));
	piechart.draw(data, piechart_options);

	//barchart
	var barchart_options = {
		title: 'Bar Chart: My Daily Screentime'
	}
	var barchart = new google.visualization.BarChart(document.getElementById('barchart'));
	barchart.draw(data, barchart_options); //TODO: Make this more readable with only top websites ()

	//linechart
	//Note: here you would put true for listSiteData so dupes are not added together
	data = historyFormat(siteData);
	var linechart_options = {
		title: "Line Chart: My Daily Screentime",
		curveType: 'function',
		legend: {position: 'bottom'},
		vAxis: {viewWindow:{min: 0} }
	};
	var linechart = new google.visualization.LineChart(document.getElementById('linechart'));
	linechart.draw(data, linechart_options); 

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
			
			google.charts.setOnLoadCallback(drawCharts(siteData));
			done = true
		}
	}
}


document.addEventListener('DOMContentLoaded', function(){
	const selectElement = document.querySelector('.statsselect');
	selectElement.addEventListener('change', (event) => {
		const result = document.getElementById('result');
		result.textContent = `You selected ${event.target.value}`; //Remove after debugging not needed
		
		if(event.target.value == 'Websites'){
			if(useDateRangeSwitch)
				google.charts.setOnLoadCallback(drawCharts(dateRangeData));
			else
				google.charts.setOnLoadCallback(drawCharts(globsiteData));
		}
		else if(event.target.value == "Weekly Breakdown"){
			//draw line chart here or include line chart in the onload() graphs (so pie bar and line are shown)
		}
		else {
			drawCategoryChart()
		}
	});
})


function drawCategoryChart() {
	//TODO: there's lots of similar parts, so refactoring later might be a good idea
	var entertainmentnum = 0
	var productivitynum = 0
	var othernum = 0
	var shoppingnum = 0
	var data

	if(!useDateRangeSwitch)
		data = listSiteData(globsiteData, true)
	else 
		data = listSiteData(dateRangeData, true)
	for (i=1; i<data.length; i++){
		temp = data[i][0]

		if(Entertainment.includes(temp)){
			entertainmentnum+=Number(data[i][1])
		}
		else if(Productivity.includes(temp)){
			productivitynum+=Number(data[i][1])
		}
		else if(Shopping.includes(temp)){
			shoppingnum+=Number(data[i][1])
		}
		else{
			othernum+=Number(data[i][1])
		}
	}
	var catData = [
		['Task', 'Hours per Day'],
		['Entertainment',     entertainmentnum],
		['Productivity',      productivitynum],
		['Shopping',  shoppingnum],
		['Other',    othernum],
	];

	catData.sort(function(a,b){
		return b[1]-a[1] //high to low
	});
	
	var processeddata = google.visualization.arrayToDataTable(catData);

	var options = {
	  title: 'Daily Screentime By Category'
	};

	//piechart
	var piechart_options = {
		title: 'Pie Chart: My Daily Screentime'
		};
	var piechart = new google.visualization.PieChart(document.getElementById('piechart'));
	piechart.draw(processeddata, piechart_options);

	//barchart
	var barchart_options = {
		title: 'Bar Chart: My Daily Screentime'
	}
	var barchart = new google.visualization.BarChart(document.getElementById('barchart'));
	barchart.draw(processeddata, barchart_options);

	/* //linechart
	//TODO: get data as function of time
	var linechart_options = {
		title: "Line Chart: My Monthly Screentime",
		curveType: 'function'
	};
	var linechart = new google.visualization.LineChart(document.getElementById('linechart'));
	linechart.draw(data, linechart_options); */
}


function getDateRange(start, end){

	var done = false
	const bg = chrome.extension.getBackgroundPage()

	var xhr = new XMLHttpRequest()
	xhr.open("POST", "http://localhost:3000/requestData")
	xhr.setRequestHeader("Content-Type", "application/json")

	xhr.send(JSON.stringify({"id":bg.id, "startDate":start, "endDate":end}))
	xhr.onreadystatechange = function() {
		if (!done) {
			let returnData = xhr.responseText.trim()
			if (returnData === "") return
			siteDataText = '{' + "\"key_val\":" + xhr.responseText + '}'

			console.log(siteDataText)
			siteData = JSON.parse(siteDataText)["key_val"]

			google.charts.setOnLoadCallback(drawCharts(siteData));
			dateRangeData = siteData
			done = true
		}
	}
}


$( document ).ready(function() {
	$("#editGoal").hide();
	$(".btEditGoal").click(function(){
	  $("#editGoal").show();
	});
	$("#sendGoalButton").click(function(){
	  processGoalRequest();
	  //$("#editGoal").hide();
	});
	$("#cancelGoal").click(function(){
	  //$("#editGoal").hide();
	});
});


document.addEventListener('DOMContentLoaded', function(){
	document.getElementById("myBtn").addEventListener("click", function() {
		if(!useDateRangeSwitch){
			var start = window.prompt("Enter start date: ")
			var end = window.prompt("Enter end date: ")
			while(!end){} //not sure if needed, intended to wait untill user inputs vals before requesting data
			var data
			if(end != undefined && start != undefined){ //TODO: add helper func to check if valid data
				data = getDateRange(start, end)
				const Btn = document.getElementById('myBtn');
				Btn.textContent = `Date Range Shown`;
				useDateRangeSwitch = true;
			}
		drawCharts(dateRangeData)
		}

		else{
				const Btn = document.getElementById('myBtn');
				Btn.textContent = `All Data Shown`;
				useDateRangeSwitch = false;
				drawCharts(globsiteData)
		}
	});
})


document.addEventListener('DOMContentLoaded', populateTable, false)

function populateTable(){	//rn this justs get the values stored in the mysql table
	google.charts.load('current', {'packages':['corechart']});

	var done = false
	const bg = chrome.extension.getBackgroundPage()


	var xhr = new XMLHttpRequest()
	xhr.open("POST", "http://localhost:3000/requestGoalData")
	xhr.setRequestHeader("Content-Type", "application/json")

	xhr.send(JSON.stringify({"id":bg.id}))
	xhr.onreadystatechange = function() {
		if (!done) {
			let returnData = xhr.responseText.trim()
			if (returnData === "") return
			goalDataText = '{' + "\"key_val\":" + xhr.responseText + '}'
			console.log(goalDataText)
			goalData = JSON.parse(goalDataText)["key_val"]

			console.log(goalData)

			done = true
		}
		var allGoals = [[]] //will contain all elements of goal
			for(goal in goalData){//NOTE: rn it doubles everything, not sure why 
				allGoals.push([goalData[goal]["date"], goalData[goal]["goal_id"], goalData[goal]["hostname"], goalData[goal]["timeTarget"], goalData[goal]["timeSpent"]])
				// this will print the contents of the goal table
				/*const div = document.createElement('div')
				console.log(goalData[goal])
				div.textContent = goalData[goal]["date"] + " " + goalData[goal]["goal_id"] + " " + goalData[goal]["hostname"] + " " + goalData[goal]["timeTarget"] + " " + goalData[goal]["timeSpent"]
				document.body.appendChild(div)*/
				
			}

	}
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
