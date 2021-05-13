//Taken from: https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
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
	let id = ""
	for (let i = 0; i < 7; i++)
		id += String.fromCharCode(97+Math.random()*26)
  return id
}

window.id = generateID;
window.timeTable = {}

chrome.browserAction.onClicked.addListener(function (tab) {
	chrome.tabs.create({url: 'dashboard.html'})
})

//Frequency with which updating occurs
//Frequency of updating time table, frequency of updating server
let timeTableUpdateFrequency = 1
let serverUpdateFrequency = 30

//TODO: Can we make sure updateTimeTable and updateServer don't execute at the same time

function updateTimeTable() {
	//TODO: This counts tabs even when user is using some other application
	console.log(Date.now(), "updateTimeTable called")
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		for (let i = 0; i < tabs.length; i++) {
			let currHostname = extractHostname(tabs[i].url)
			if (!(currHostname in window.timeTable)) window.timeTable[currHostname] = 0;
			
			window.timeTable[currHostname] += timeTableUpdateFrequency;
		}
	});
}

function updateServer() {
	console.log(Date.now(), "updateServer called")

	let sendData = JSON.stringify({"id":window.id, "timeTable":window.timeTable})
	console.log("sendData", sendData)

	var xhr = new XMLHttpRequest()
	xhr.open("POST", "http://localhost:3000/sendData")
	xhr.setRequestHeader("Content-Type", "application/json")

	xhr.send(sendData)
	xhr.onreadystatechange = function() {}

	window.timeTable = {}
}

setInterval(updateTimeTable, timeTableUpdateFrequency*1000)
setInterval(updateServer, serverUpdateFrequency*1000)