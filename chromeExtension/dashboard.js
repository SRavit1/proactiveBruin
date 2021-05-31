background_window = chrome.extension.getBackgroundPage().window

//keeps stores site data and cleaned data for global use
var globsiteData 
var extensionid = chrome.runtime.id	//32 char id given to each extension 
var dateRangeData
var useDateRangeSwitch = false //keeps track of whether to use dateRangeData or globsiteData
var globCategoriesHostname
var globCategoriesCategory
var earliestDate
var latestDate
var setDates = false; 


function listSiteData(siteData)
{

	//adds times for duplicates
	var sitename = []
	var sitetime = []
	var temp = ""
	for (site in siteData){
		temp = String(siteData[site]["hostname"])
		//if(temp == extensionid) temp="ProactiveBruin";
		if (!sitename.includes(temp)){ //for use in line charts will not add duplicate hostnames on different days
			sitename.push(temp)
			sitetime.push(parseInt(siteData[site]["time"]))
		}
		else if (sitename.includes(temp)){
			sitetime[sitename.indexOf(temp)] += parseInt(siteData[site]["time"])
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

	//sets the earliest and latest dates for checking if the dates entered are valid
	if(!setDates){
	earliestDate = sitedates[0]
	latestDate = sitedates[sitedates.length-1]
	setDates=true
	}


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

	var data = google.visualization.arrayToDataTable(listSiteData(siteData)); 

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

			dateRangeData = siteData


			google.charts.setOnLoadCallback(drawCharts(siteData));
			done = true
		}
	}
}

//sets event listener to dropdown
document.addEventListener('DOMContentLoaded', function(){
	const selectElement = document.querySelector('.statsselect');
	selectElement.addEventListener('change', (event) => {
		const result = document.getElementById('result');
		
		if(event.target.value == 'Websites'){
			if(useDateRangeSwitch){
				google.charts.setOnLoadCallback(drawCharts(dateRangeData));
			}
			else{
				google.charts.setOnLoadCallback(drawCharts(globsiteData));
			}
		}
		else {
			drawCategoryChart()
		}
	});
})

//draws the category chart, has switch for use of a range of site data or all site data
function drawCategoryChart() {
	
	var entertainmentnum = 0
	var productivitynum = 0
	var othernum = 0
	var shoppingnum = 0
	var data
	if(!useDateRangeSwitch)
		data = listSiteData(globsiteData)
	else 
		data = listSiteData(dateRangeData)

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
}

//gets a date range from back end, sets global var dateRangeData to data
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
			siteDataTextrange = '{' + "\"key_val\":" + xhr.responseText + '}'

			console.log(siteDataTextrange)
			siteDatarange = JSON.parse(siteDataTextrange)["key_val"]

			dateRangeData = siteDatarange

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

//adds event listeners to each of the buttons (toggle, add, delete, reset, refresh, search clear)
document.addEventListener('DOMContentLoaded', function(){
	document.getElementById("myBtn").addEventListener("click", function() {
		if(!useDateRangeSwitch){
			var start = window.prompt("Enter start date (YYYY-MM-DD): ")
			var end = window.prompt("Enter end date (YYYY-MM-DD): ")
			//while(!end){} //not sure if needed, intended to wait untill user inputs vals before requesting data
			if(start && end && validDate(start,end)){ 
				getDateRange(start, end)

				const Btn = document.getElementById('myBtn');
				Btn.textContent = `Date Range Shown`;
				useDateRangeSwitch = true;
				if(document.getElementById('statsselect').value=="Websites"){
					google.charts.setOnLoadCallback(drawCharts(temp))
				}
				else{
					google.charts.setOnLoadCallback(drawCategoryChart())
				}
			}
			else{
				window.alert("Invalid Date.\nUse format YYYY-MM-DD\nEarliest Date: " + earliestDate + "\nLatest Date: " + latestDate)
				return
			}
		}

		else{
				const Btn = document.getElementById('myBtn');
				Btn.textContent = `All Data Shown`;
				useDateRangeSwitch = false;
				if(document.getElementById('statsselect').value=="Websites")
					google.charts.setOnLoadCallback(drawCharts(globsiteData))
				else{
					getCategoryTable()
					drawCategoryChart(globsiteData)
				}
		}
	});
  document.getElementById("resetCat").addEventListener("click", function() {
    resetCatTable();
  });
  document.getElementById("searchCat").addEventListener("click", function() {
  	siteSearched = document.getElementById("websiteString").value
  	if(siteSearched == "")
  		window.alert("Error\nEmpty String")
  	else if(globCategoriesHostname.includes(siteSearched)){
  		window.alert(siteSearched + " is currently in the category " + globCategoriesCategory[globCategoriesHostname.indexOf(siteSearched)])
  	}
  	else
  		window.alert(siteSearched + " has not been categorized\nHit the add button to categorize the site")
  });
  document.getElementById("addCat").addEventListener("click", function() {
  	 siteToAdd = document.getElementById("websiteString").value
  	 if(siteToAdd == "")
  		window.alert("Error\nEmpty String")
  	 else if(globCategoriesHostname.includes(siteToAdd))
  	 	window.alert("Site is already catagorized.\nHit Update to change the associated category")
  	 else{
  	 	var userCat = window.prompt("Enter the category of the site:")
  	 	if(userCat == "Entertainment" || userCat == "Shopping" || userCat=="Productivity"){
  		 	const bg = chrome.extension.getBackgroundPage()
			var xhr = new XMLHttpRequest()
			xhr.open("POST", "http://localhost:3000/addCat")
			xhr.setRequestHeader("Content-Type", "application/json")
			xhr.send(JSON.stringify({"id":bg.id, "hostname":siteToAdd, "category":userCat}))
			getCategoryTable()
		}
		else
			window.alert(userCat + " is not a valid category\nTry again with categories: \"Entertainment\", \"Productivity\", or \"Shopping\"")
  	 }
  });
  document.getElementById("deleteCat").addEventListener("click", function() {
  	  siteToDelete = document.getElementById("websiteString").value
  	  if(siteToDelete == "")
  		window.alert("Error\nEmpty String")
  	  else if(!globCategoriesHostname.includes(siteToDelete))
  	 	window.alert("Site is not catagorized.\nNothing to delete")
  	 else{
  	 	const bg=chrome.extension.getBackgroundPage()
  	 	var xhr = new XMLHttpRequest()
  	 	xhr.open("POST", "http://localhost:3000/deleteCat")
  	 	xhr.setRequestHeader("Content-Type", "application/json")
  	 	xhr.send(JSON.stringify({"id":bg.id, "hostname":siteToDelete}))
  	 	window.alert(siteToDelete + " has been deleted from your categories")
		getCategoryTable()
  	 }
  });
 document.getElementById("updateCat").addEventListener("click", function() {
 	 siteToUpdate = document.getElementById("websiteString").value
	 if(siteToUpdate == "")
  		window.alert("Error\nEmpty String")
  	else if(!globCategoriesHostname.includes(siteToUpdate))
  		window.alert("Site is not catagorized.\nNothing to update")
  	else{
  		newCat = window.prompt("Enter the new category for " + siteToUpdate)
  		if(newCat=="Entertainment"||newCat=="Shopping"||newCat=="Productivity"){
  			const bg=chrome.extension.getBackgroundPage()
  		 	var xhr = new XMLHttpRequest()
  		 	xhr.open("POST", "http://localhost:3000/updateCat")
	  	 	xhr.setRequestHeader("Content-Type", "application/json")
	  	 	xhr.send(JSON.stringify({"id":bg.id, "hostname":siteToUpdate, "category":newCat}))
  	 		window.alert(siteToUpdate + "'s category has been updated to " + newCat)
			getCategoryTable()
	    }
	    else
			window.alert(userCat + " is not a valid category\nTry again with categories: \"Entertainment\", \"Productivity\", or \"Shopping\"")
  	}
 });
  document.getElementById("clearCat").addEventListener("click", function() {
  	 const bg=chrome.extension.getBackgroundPage()
  	 var xhr = new XMLHttpRequest()
  	 xhr.open("POST", "http://localhost:3000/clearCat")
  	 xhr.setRequestHeader("Content-Type", "application/json")
  	 xhr.send(JSON.stringify({"id":bg.id}))
  	 window.alert("Your categories have been cleared. Add categories with Add button")
  	 globCategoriesHostname = []
	 globCategoriesCategory = []
	 getCategoryTable()
  });
  document.getElementById("refreshCat").addEventListener("click", function() {
  	if(document.getElementById("statsselect").value=="Websites")
  		window.alert("You are not viewing the category chart")
  	else
  		drawCategoryChart()
  });
})

//gets the category table from the back-end 
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

//splits category 2D array into 1D arrays, easier to search through
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

//resets category table to our pre-set version
function resetCatTable(){
	const bg = chrome.extension.getBackgroundPage()

	var xhr = new XMLHttpRequest()	//fills cat table with preset vals
	xhr.open("POST", "http://localhost:3000/clearandfillCat")
	xhr.setRequestHeader("Content-Type", "application/json")
	xhr.send(JSON.stringify({"id":bg.id}))

	getCategoryTable()
}

//returns true if valid date, false otherwise
function validDate(start, end){
	if(start.length==10&&end.length==10&&start.charAt(4)=='-'&&end.charAt(4)=='-'&&start.charAt(7)=='-'&&end.charAt(7)=='-'
		&&!isNaN(start.substring(0,4))&&!isNaN(end.substring(0,4))&&Number(start.substring(0,4))<=Number(end.substring(0,4))
			&&!isNaN(start.substring(5,7))&&!isNaN(end.substring(5,7))&&Number(start.substring(5,7))<=Number(end.substring(5,7))
			&&!isNaN(start.substring(8,10))&&!isNaN(end.substring(8,10))&&Number(start.substring(8,10))<=Number(end.substring(8,10))
			&&Number(earliestDate.substring(0,4))<=Number(start.substring(0,4))&&Number(earliestDate.substring(5,7))<=Number(start.substring(5,7))
			&&Number(earliestDate.substring(8,10))<=Number(start.substring(8,10))&&Number(earliestDate.substring(0,4))<=Number(end.substring(0,4))
			&&Number(end.substring(0,4))<=Number(latestDate.substring(0,4))&&Number(end.substring(5,7))<=Number(latestDate.substring(5,7))
			&&Number(end.substring(8,10))<=Number(latestDate.substring(8,10)))
			{
		return true; 
	}
	return false; 
}
