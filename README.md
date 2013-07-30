Tracelogger
===========

Tracelogger is a tool in the javascript engine that can pinpoint which engine in firefox is used.
To create a log file you need to recompile the js shell with --enable-trace-logging (currently x64 only).
Afterwards every execution of a file will result in the creation of a /tmp/tracelogging.log file.
This branch contains the python scripts to create a nice graph out of tracelogging files.


To create a tracelogging graph when you obtained the log file:
python generate.py /tmp/tracelogging.log > /tmp/test.html
