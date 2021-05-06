/*
TODO:
- obtain data from server
- use React to display data

*/
document.addEventListener('DOMContentLoaded', function () {

	var done = false;
	const bg = chrome.extension.getBackgroundPage()


	var xhr = new XMLHttpRequest()
	xhr.open("POST", "http://localhost:3000/requestData")
	xhr.setRequestHeader("Content-Type", "application/json")

	xhr.send(JSON.stringify({"id":bg.id}))
	xhr.onreadystatechange = function() {
		if (!done) {
			siteDataText = '{' + "\"key_val\":" + xhr.responseText + '}'
			console.log(siteDataText)
			siteData = JSON.parse(siteDataText)["key_val"]

			for (site in siteData) {
				const div = document.createElement('div')
				console.log(siteData[site])
				div.textContent = siteData[site]["hostname"] + " " + siteData[site]["time"]
				document.body.appendChild(div)
			}
			done = true;
		}
	}


}, false)