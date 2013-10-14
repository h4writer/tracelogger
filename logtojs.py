import sys
import gzip

logFile = "/tmp/tracelogging.log"

stack = []

if ".gz" in logFile:
    fp = gzip.open(logFile)
else:
    fp = open(logFile)

json = [{"sub":[]}]

for line in fp:
    line = line[:-1]
    data = line.split(",")
    if len(data) < 2:
        continue
    if data[1] == "start" or data[1] == "stop" or (data[1] == "info" and data[2] == "engine"):
        time = int(data[0])
        if data[1] == "start":
            entry = {"start":time}
            stack.append(entry)
            json[-1]["sub"].append(entry)
            #keep_stat_start(stack[-1])
        else:
            #output(time-prev_time, stack[-1])
            #keep_stat(time-prev_time, stack[-1])
            
            if data[1] == "info":
                assert data[2] == "engine"
                stack[-1]["engine"] = data[3]
            else:
                assert data[1] == "stop"
                stack[-1]["stop"] = time
                stack = stack[:-1]

    prev_time = time


print json
