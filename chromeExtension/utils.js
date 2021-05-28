var background_window = chrome.extension.getBackgroundPage().window
//document.getElementById("sendGoalButton").addEventListener("click", processGoalRequest);
//document.getElementById("refreshGoals").addEventListener("click", goalsTable());

//Taken from: https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
//TODO: Check if we are allowed to use this function or if we must replace it
function extractHostname(url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
}

function generateID() {
	var id = '';
	for (var i = 0; i < 7; i++) {
		id += String.fromCharCode(97+Math.random()*26);
	}
  return id
}

function getDateString (date) {
    return date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()
}

//Note: Currently, only "linear" method is supported
function sendGoalRequest(startDate, endDate, startGoal, endGoal, hostname, method) {
    var createGoalReq = {
        "id":background_window.id,
        "startDate":startDate,
        "endDate":endDate,
        "startGoal":startGoal,
        "endGoal":endGoal,
		"hostname":hostname,
        "method":method
    }

    var xhr = new XMLHttpRequest()
    xhr.open("POST", "http://localhost:3000/createGoal")
    xhr.setRequestHeader("Content-Type", "application/json")

    xhr.send(JSON.stringify(createGoalReq))
    console.log("Checking value"+createGoalReq)

    console.log("sending create goal request")
}

function processGoalRequest()
{
    console.log("calling processGoalRequest")
    var h = document.getElementsByName("hostn")[0].value
    var sd = document.getElementsByName("sDate")[0].value
    console.log("yooo"+sd)
	var ed = document.getElementsByName("eDate")[0].value
	var sg = document.getElementsByName("SGoal")[0].value
	var eg = document.getElementsByName("eGDate")[0].value
	//var h = document.getElementsByName("hostn")[0].value
	sendGoalRequest(sd, ed, sg, eg, h, "linear")
    return h
}

function getHost ()
{
    var h = document.getElementsByName("hostn")[0].value
    return h
}

function deleteGoalRequest(goal_id) {
    var createGoalReq = {
        "goal_id": goal_id//how do i access the goal id?
    }

    var xhr = new XMLHttpRequest()
    xhr.open("POST", "http://localhost:3000/deleteGoal")
    xhr.setRequestHeader("Content-Type", "application/json")

    xhr.send(JSON.stringify(createGoalReq))
    console.log("Checking value"+createGoalReq)

    console.log("sending delete goal request")
}


$(() => {
    
    $('#refreshGoals').on('click', (e)=>{
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
			siteDataText = returnData;// '{' + "\"key_val\":" + xhr.responseText + '}'
			console.log(siteDataText)
			siteData = JSON.parse(siteDataText); //["key_val"]

			console.log(siteData);
			
			//globsiteData = siteData //sets glob var on load
			
			//google.charts.setOnLoadCallback(drawCharts(siteData));
			done = true
            //call here to get the data
            try{
                
            $('#goals').DataTable({
                data: siteData,
                columns: [
                    { title: "Website" , data: 'hostname'},
                    { title: "Start Date", data: 'date'},
                    { title: "End Date", data: 'date'},
                    { title: "Start Goal", data: 'timeSpent' },
                    { title: "End Goal", data: 'timeTarget' },
                    { title: "Goal", data: 'goal_id' },
                    { title: "Edit" }
                ]
            });
            var t = $('#goals').DataTable();
            $('#sendGoalButton').on('click', (e)=>{
                processGoalRequest();
                t.row.add( [
                    { title: "Website" , data: getHost()}
                ] ).draw( false );
            });
            $('#goals tbody').on( 'click', 'tr', function () {
                if ( $(this).hasClass('selected') ) {
                    $(this).removeClass('selected');
                }
                else {
                    t.$('tr.selected').removeClass('selected');
                    $(this).addClass('selected');
                }
            } );
         
            $('#button').click( function () {
                t.row('.selected').remove().draw( false );
                deleteGoalRequest(goal_id);
            } );
        }catch(e){
            // TODO: troubleshoot
        }
        console.log("entered" + getHost())
        
    }        //processGoalRequest();
    }
});
})