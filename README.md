Tracelogger
===========

Tracelogger is a tool in the javascript engine that can pinpoint which engine in firefox is used.
To create a log file you need to recompile the js shell with --enable-trace-logging.
Afterwards every execution of a file will result in the creation of a /tmp/tracelogging.log file.
This branch contains the python scripts to create a nice graph out of tracelogging files.

Tools V1
========

To create a tracelogging graph when you obtained the log file:

    python generate.py [-h] [-w WIDTH] [-n NAME] [-r REVISION] logfile [logfile ...] -o outfile
    
e.g.
    python generate.py /tmp/tracelogging.log -o /tmp/test.html

The outfile should contain the graph. Put style.css and basic.js in the same folder
and you should be good to go.

Tools V2
========

Experimental.
