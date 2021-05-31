background_window = chrome.extension.getBackgroundPage().window

//keeps stores site data and cleaned data for global use
var globsiteData
var extensionid = chrome.runtime.id	//32 char id given to each extension 
var dateRangeData
var useDateRangeSwitch = false //keeps track of whether to use dateRangeData or globsiteData
var globCategoriesHostname
var globCategoriesCategory


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

		//console.log(newRow);
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

	//barchart - show only top N
	var bardata = data.clone();
	const selectTopWebsiteNum = 5;
	bardata.removeRows(selectTopWebsiteNum,bardata.getNumberOfRows()-selectTopWebsiteNum);
	var barchart_options = {
		title: 'Bar Chart: My Daily Top '+selectTopWebsiteNum +' Viewed Websites'
	}
	var barchart = new google.visualization.BarChart(document.getElementById('barchart'));
	barchart.draw(bardata, barchart_options); //TODO: Make this more readable with only top websites ()

	//linechart
	//Note: here you would put true for listSiteData so dupes are not added together
	data = historyFormat(siteData);
	var linechart_options = {
		title:'Line Chart: My Daily Screentime',
		curveType: 'function',
		legend: {position: 'bottom'},
		vAxis: {viewWindow:{min: 0} }
	};
	var linechart = new google.visualization.LineChart(document.getElementById('linechart'));
	linechart.draw(data, linechart_options); 

}

function drawProgressChart(allGoals) 
{
	//allGoals in the form of [goalData[goal]["date"], goalData[goal]["goal_id"], goalData[goal]["hostname"], goalData[goal]["timeTarget"], goalData[goal]["timeSpent"]]

	//create progress bars in div id="progresscharts"
	var chartElement = document.getElementById("progresscharts");
	chartElement.setAttribute("style","width:100vw");

	//update with correct time spent on each website TODO: ideally masterScript/updateGoals.js should do this later
	console.log("globSiteData" + globsiteData)
	allGoals.forEach(function(goal,index){
		var hostname = goal[2];
		
		var timeSpent = 0;
		for (site in globsiteData){
			if (String(globsiteData[site]["hostname"]) === hostname)
			{
				timeSpent = timeSpent+ Number(globsiteData[site]["time"]);
			}
		}
		goal[4] = timeSpent;
	});

	//sort by % amount completed
	goalData.sort(function(a,b) {
		
		var a_percent = a[4] / a[3];
		var b_percent = b[4] / b[3];
		return b_percent-a_percent;
	});

	//then, create a div element for each goal, and append
	allGoals.forEach(function(goal,index){
		var node = document.createElement("div");
		node.setAttribute("id", "donutchart"+index);
		node.setAttribute("style","display:inline-block")
		chartElement.appendChild(node);
	});

	//now, create graph
	allGoals.forEach(function(goal,index){
		var data = google.visualization.arrayToDataTable([
			["progress", "amount"],
			["time spent", goal[4]],
			["time remaining", goal[3]-goal[4]]

			
		]);

		var options = {
			title: "Progress on: " + goal[2],
			pieHole: 0.4,
			colors: ['#61f70a','#8e8f94'],
			legend: {position:'none'}
		}
		
		var chart = new google.visualization.PieChart(document.getElementById('donutchart'+index));
		chart.draw(data,options);
	});


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
		temp = String(data[i][0]).trim()
		if(globCategoriesHostname.includes(temp)){
			if(globCategoriesCategory[globCategoriesHostname.indexOf(temp)].trim() === "Entertainment")
				entertainmentnum += data[i][1]
			else if(globCategoriesCategory[globCategoriesHostname.indexOf(temp)].trim() === "Productivity")
				productivitynum+=data[i][1]
			else if(globCategoriesCategory[globCategoriesHostname.indexOf(temp)].trim() === "Shopping")
				shoppingnum+=data[i][1]
		}
		else 
			othernum+=data[i][1]
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

			//google.charts.setOnLoadCallback(drawCharts(siteData));
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


document.addEventListener('DOMContentLoaded', getCategoryTable, false)

function getCategoryTable(){
	var done = false
	const bg = chrome.extension.getBackgroundPage()

	var xhr = new XMLHttpRequest()
	xhr.open("POST", "http://localhost:3000/requestCatData")
	xhr.setRequestHeader("Content-Type", "application/json")


	xhr.send(JSON.stringify({"id":bg.id}))
	xhr.onreadystatechange = function() {
		if (!done) {
			let returnData = xhr.responseText.trim()
			if (returnData === "") return
			catDataText = '{' + "\"key_val\":" + xhr.responseText + '}'
			catData = JSON.parse(catDataText)["key_val"]

			console.log(catData)

			done = true
			CategoriestoArray(catData)
		}
	}
}


function CategoriestoArray(data){
	tempHostname = []
	tempCategory = []
	for(site in data){
		hostname = data[site]["hostname"]
		category = data[site]["category"]
		tempHostname.push(hostname)
		tempCategory.push(category)
	}
	globCategoriesHostname = tempHostname
	globCategoriesCategory = tempCategory
}


function resetCatTable(){
	const bg = chrome.extension.getBackgroundPage()

	var xhr = new XMLHttpRequest()	//clears cat table
	xhr.open("POST", "http://localhost:3000/clearCat")
	xhr.setRequestHeader("Content-Type", "application/json")
	xhr.send(JSON.stringify({"id":bg.id}))

	var xhr = new XMLHttpRequest()	//fills cat table with preset vals
	xhr.open("POST", "http://localhost:3000/fillCat")
	xhr.setRequestHeader("Content-Type", "application/json")
	xhr.send(JSON.stringify({"id":bg.id}))

	drawCategoryChart();
}
