import sys
import gzip

if len(sys.argv) < 2:
    print sys.argv[0]+" logfile [width in px, default=80000] [benchmark name] [revision number]"
    exit()

logFile = sys.argv[1]

pixels = 80000
if len(sys.argv) > 2:
  pixels = int(sys.argv[2])

import tailer 
head = tailer.head(open(logFile), 1)[0].split(",")[0]
tail = tailer.tail(open(logFile), 1)[0].split(",")[0]
ticks = int(tail)-int(head)
zoom = pixels*1./ticks

bench_name = None
if len(sys.argv) > 3:
  bench_name = sys.argv[3]
revno = None
if len(sys.argv) > 4:
  revno = sys.argv[4]

start = 0
status = ""
oldline = ""


###################################################
print "<html>"
print "<head>"
print "<script src='basic.js'></script>"
print "<link rel='stylesheet' type='text/css' href='style.css'>"
print "</head>"
print "<body>"
if bench_name:
  print "<h1>"+bench_name+"</h1>"
if revno:
  print "<p>Revision: <a href='https://hg.mozilla.org/mozilla-central/rev/"+revno+"'>"+revno+"</a></p>"

print "<div id=legend>"
print "<p><span class='block interpreter run'></span> interpreter</p>"
print "<p><span class='block ion compile'></span> ionmonkey compilation</p>"
print "<p><span class='block ion run'></span> ionmonkey running</p>"
print "<p><span class='block jm run'></span> baseline running</p>"
print "<p><span class='block yarr jit'></span> yarr jit</p>"
print "<p><span class='block gc'></span> GC</p>"
print "<p><span class='block minor_gc'></span> Minor GC</p>"
print "<p><span class='block parser_script'></span> Script parsing</p>"
print "<p><span class='block parser_lazy'></span> Lazy parsing</p>"
print "<p><span class='block parser_function'></span> Function parsing</p>"
print "<!--<div><p>1px = "+str(int(1./zoom))+" kernel ticks</p></div>-->"
print "</div>"
print "<div class='graph'>"

def create_backtrace():
    full_info = ""
    for i in range(len(stack)):
        full_info += "; -"+",".join(stack[i]["data"][2:])
        if "engine" in stack[i]:
            full_info += stack[i]["engine"]
    return full_info

block_time = 0
aggregate = 0
def output(delta, info):
    global text, block_time,aggregate

    class_ = info["data"][2]
    engine = ""
    if "engine" in info:
        engine = info["engine"]

    block_width = 10
    width = delta*zoom
    width += aggregate
    if width < 1:
      aggregate = width
      return
    # hack to remove time between script and logging which engine we are running
    if class_ == "script" and engine == "":
      agregate = width
      return
    aggregate = 0
    blocks = "<span style='width:"+str(width%block_width)+"px'>\n</span>"
    for i in range(int(width/block_width)):
      blocks += "<span style='width:"+str(block_width)+"px'>\n</span>"

    full_info = create_backtrace()

    sys.stdout.write("<span class='block "+class_+" "+engine+"' info='Block: "+str(block_time)+";Engine:"+engine+";<b>Call stack:</b>"+full_info+"'>"+blocks+"</span>")
    block_time += 1

from collections import defaultdict
engine_stat = defaultdict(int)
script_stat = defaultdict(lambda : defaultdict(int))
def keep_stat(delta, info):
  engine = ""
  task = info["data"][2]
  if "engine" in info:
      engine = info["engine"]
  engine_stat[task+" "+engine] += delta

  if task == "script" or task == "ion_compile" or "parser" in task:
      script = info["data"][3]
      script_stat[script][task+" "+engine] += delta

script_called = defaultdict(lambda : defaultdict(int))
def keep_stat_start(info):
  task = info["data"][2]
  if task == "script" or task == "ion_compile" or "parser" in task:
      script = info["data"][3]
      script_called[script][task] += 1

##################################################""

stack = []

if ".gz" in logFile:
    fp = gzip.open(logFile)
else:
    fp = open(logFile)

for line in fp:
    data = line.split(",")
    if len(data) < 2:
        continue
    if data[1] == "start" or data[1] == "stop" or (data[1] == "info" and data[2] == "engine"):
        time = int(data[0])
        if data[1] == "start":
            stack.append({"data":data})
            keep_stat_start(stack[-1])
        else:
            output(time-prev_time, stack[-1])
            keep_stat(time-prev_time, stack[-1])
            
            if data[1] == "info":
                assert data[2] == "engine"
                stack[-1]["engine"] = data[3]
            else:
                assert data[1] == "stop"
                stack = stack[:-1]

    prev_time = time

##########################################################
print "</div>"

# hack since this is actually just overhead
if "script " in engine_stat:
  del engine_stat["script "]

total = 0
for i in engine_stat:
  total += engine_stat[i]

total_script = 0
for i in engine_stat:
  if "script" in i or "compile" in i or "parser" in i:
    total_script += engine_stat[i]

print "<h2>Engine overview</h2>"
print "<table>"
print "<thead><td>Engine</td><td>Percent</td></thead>"
for i in engine_stat:
  print "<tr><td>"+str(i)+"</td><td>%.2f%%</td></tr>" % (engine_stat[i]*100./total)
print "</table>"

print "<h2>Script overview</h2>"
print "<table>"
print "<thead><td>Script</td><td>Times called</td><td>Times compiled</td><td>Total time</td><td>Time spent</td></thead>"
for i in script_stat:
  # hack since this is actually just overhead
  if "script " in script_stat[i]:
    del script_stat[i]["script "]

  total = 0
  for j in script_stat[i]:
    total += script_stat[i][j]

  print "<tr><td>"+str(i)+"</td>"
  print "<td>"+str(script_called[i]["script"])+"</td>"
  print "<td>"+str(script_called[i]["ion_compile"])+"</td>"
  print "<td>%.2f%%</td><td>" % (total*100./total_script)
  for j in script_stat[i]:
    print j+": %.2f%%, " % (script_stat[i][j]*100./total)
  print "</td></tr>"
print "</table>"

print "</body>"
print "</html>"
