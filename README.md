# Proactive Bruin

## About

![Proactive Bruin Logo](images/logo.png)

Proactive Bruin is a Chrome extension designed to keep track of and analyze students' online Internet activity. When enabled by the user, it silently runs in the background recording each website visited on Chrome, and the duration of each visit. This data is then visualized onto the dashboard via line charts and bar charts. The user can take charge of their time-spending habits by creating upper time limit goals for a given website. They can also narrow the scope of their search to a certain date range and by grouping websites together into categories.

## How to run

1. Navigate to webServer directory and run "node Server.js"
1. Load chrome extension (see header below)
1. View dashboard by clicking on chrome extension in top right corner of Chrome

### Load chrome extension

1. Go to chrome://extensions/ on a chrome browser
1. Turn developer mode on
1. Select "Load unpacked" and upload chromeExtension folder

### Access mysql database

1. Install mysql client in shell
1. Run command "mysql -uproactiveBruinUser -pbruin123 -h 18.224.63.160"

## Contributors

[Jinwoo Baik](https://github.com/jbaik1)

[Emmett Cocke](https://github.com/Emmettlsc)

[Jasneev Kaur](https://github.com/jasneev)

[Ravit Sharma](https://github.com/SRavit1)
