Tracelogger
===========

Tracelogger is a tool in the javascript engine that can pinpoint which engine in firefox is used.
To create a log file you need to recompile the js shell with --enable-trace-logging.
Afterwards every execution of a file will result in the creation of a /tmp/tl-data.json file.
This branch contains the python scripts to create a nice graph out of tracelogging files.

Tools V2
========

**1. Creating a tracelogging graph:**

- Make a directory "tracelogging"
- Download "tracelogger.js", "tracelogger.html", "tracelogger.css" and "engine.js" from tools_v2 and save it in that directory.
- Copy all /tmp/tl-* files into that directory
- Navigate with a browser to tracelogger.html?data=tl-data.json

*Note: when you are doing this from "file:///" you will probably get a security warning in the console. This is because firefox doesn't allow loading files from the harddisk using httprequest, even when the file loading the file is on the harddisk. There are two solutions. One is to create a localhost server and serving the files there. The other being disable this check in "about:config", by temporarly switching "security.fileuri.strict_origin_policy" to false*

**2. Reducing a tracelogging graph:**

When you need to serve the graphs online or when it takes the browser too long to read the files you can reduce the graphs using a python script.

- Make sure you have a normal JS shell ($JS) which doesn't have tracelogging enabled
- Download the full "tools_v2" directory
- Run python reduce.py $JS /tmp/tl-data.json /somepath/somename
- This will create /somepath/somename.json and save all files with the prefix somename

**3. Renaming the tracelogging files:**

When you want to rename the files and don't want to adjust the names yourself and update the content of /tmp/tl-data.json. This script does this.

- Run python rename.py /tmp/tl-data.json /somepath/somename
- This will move /tmp/tl-data.json to /somepath/somename.json and move all the data files while renaming the files to begin with somename

Tools V1 (Deprecated)
========

To create a tracelogging graph when you obtained the log file:

    python generate.py [-h] [-w WIDTH] [-n NAME] [-r REVISION] logfile [logfile ...] -o outfile
    
e.g.
    python generate.py /tmp/tracelogging.log -o /tmp/test.html

The outfile should contain the graph. Put style.css and basic.js in the same folder
and you should be good to go.
