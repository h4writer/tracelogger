import sys
import gzip
import argparse
import tailer

argparser = argparse.ArgumentParser(description='Parse tracelogs and create html output for them.')
argparser.add_argument('logfile',
                   help='the logfile to parse')
argparser.add_argument('outfile',
                   help='the name of the html output file')
argparser.add_argument('-w', '--width', type=int, default=80000,
                   help='width in px (default: 80000)')
argparser.add_argument('-n', '--name', default=None,
                   help='Benchmark name')
argparser.add_argument('-r', '--revision', default=None,
                   help='Revision the shell or browser executable was built from')
args = argparser.parse_args()

logFilename = args.logfile
outFilename = args.outfile
pixels = args.width
bench_name = args.name
revno = args.revision

tail = tailer.tail(open(logFilename), 1)[0].split(",")[0]
ticks = int(tail)
zoom = pixels*1./ticks

start = 0
status = ""
oldline = ""

outfile = open(outFilename, 'w')

names = {
  "s i": "interpreter run",
  "s b": "baseline run",
  "c": "ion compile",
  "s j": "ion run",
  "r": "yarr",
  "g": "minor_gc",
  "G": "gc",
  "pf": "parser_function",
  "ps": "parser_script",
  "pl": "parser_lazy",
}
engines = {
  "i": "Interpreter",
  "b": "Baseline",
  "j": "IonMonkey",
  "": ""
}


###################################################
outfile.write("<html>\n")
outfile.write("<head>\n")
outfile.write("<script src='basic.js'></script>\n")
outfile.write("<link rel='stylesheet' type='text/css' href='style.css'>\n")
outfile.write("</head>\n")
outfile.write("<body>\n")
if bench_name:
  outfile.write("<h1>"+bench_name+"</h1>\n")
if revno:
  outfile.write("<p>Revision: <a href='https://hg.mozilla.org/mozilla-central/rev/"+revno+"'>"+revno+"</a></p>\n")

outfile.write("<div id=legend>\n")
outfile.write("<p><span class='block interpreter run'></span> interpreter</p>\n")
outfile.write("<p><span class='block ion compile'></span> ionmonkey compilation</p>\n")
outfile.write("<p><span class='block ion run'></span> ionmonkey running</p>\n")
outfile.write("<p><span class='block jm run'></span> baseline running</p>\n")
outfile.write("<p><span class='block yarr jit'></span> yarr jit</p>\n")
outfile.write("<p><span class='block gc'></span> GC</p>\n")
outfile.write("<p><span class='block minor_gc'></span> Minor GC</p>\n")
outfile.write("<p><span class='block parser_script'></span> Script parsing</p>\n")
outfile.write("<p><span class='block parser_lazy'></span> Lazy parsing</p>\n")
outfile.write("<p><span class='block parser_function'></span> Function parsing</p>\n")
outfile.write("<!--<div><p>1px = "+str(int(1./zoom))+" kernel ticks</p></div>-->\n")
outfile.write("</div>\n")
outfile.write("<div class='graph'>\n")

def create_backtrace():
    full_info = ""
    for i in range(len(stack)):
        full_info += "; -"+",".join(stack[i]["data"][2:])
        if "engine" in stack[i]:
            full_info += " " + engines[stack[i]["engine"]]
    return full_info

block_time = 0
aggregate = 0
def output(delta, info):
    global text, block_time,aggregate

    width = delta*zoom + aggregate

    class_ = info["data"][2]
    engine = ""
    if "engine" in info:
        engine = info["engine"]
        class_ += " " + engine

    # Don't show entries where the engine isn't set yet.
    if class_ == "s":
        aggregate = width
        return

    # Don't show entries that are too small.
    if width < 1:
      aggregate = width
      return

    # Output the current entry:
    aggregate = 0
    block_width = 10
    blocks = "<span style='width:"+str(width%block_width)+"px'>\n</span>"
    for i in range(int(width/block_width)):
      blocks += "<span style='width:"+str(block_width)+"px'>\n</span>"

    full_info = create_backtrace()

    outfile.write("<span class='block "+names[class_]+"' info='Block: "+str(block_time)+";Engine: "+engines[engine]+";<b>Call stack:</b>"+full_info+"'>"+blocks+"</span>")
    block_time += 1

from collections import defaultdict
engine_stat = defaultdict(int)
script_stat = defaultdict(lambda : defaultdict(int))
def keep_stat(delta, info):
  engine = ""
  task = info["data"][2]
  statkey = task
  if "engine" in info:
      engine = info["engine"]
      statkey += " " + engine
  if engine != "" or task != "s":
      engine_stat[statkey] += delta

  # Any script running (if engine is set) / ion compiling / any parsing
  if (task == "s" and engine != "") or task == "c" or task[0] == "p":
      script = info["data"][3]
      script_stat[script][statkey] += delta

script_called = defaultdict(lambda : defaultdict(int))
def keep_stat_start(info):
  task = info["data"][2]
  # Any script running / ion compiling / any parsing
  if task == "s" or task == "c" or task[0] == "p":
      script = info["data"][3]
      script_called[script][task] += 1

##################################################""

stack = []

if ".gz" in logFilename:
    fp = gzip.open(logFilename)
else:
    fp = open(logFilename)

for line in fp:
    data = line[:-1].split(",")
    if len(data) < 2:
        continue
    # Any start/stop or engine change.
    if data[1] == "1" or data[1] == "0" or (data[1] == "e"):
        time = int(data[0])
        if data[1] == "1":
            stack.append({"data":data})
            keep_stat_start(stack[-1])
        else:
            output(time-prev_time, stack[-1])
            keep_stat(time-prev_time, stack[-1])
            
            if data[1] == "e":
                stack[-1]["engine"] = data[2][0]
            else:
                assert data[1] == "0"
                stack = stack[:-1]

    prev_time = time

##########################################################
outfile.write("</div>\n")

total = 0
total_script = 0
for i in engine_stat:
  total += engine_stat[i]
  # Any script running / ion compiling / any parsing
  if i[0] == "s" or i[0] == "c" or i[0] == "p":
    total_script += engine_stat[i]

outfile.write("<h2>Engine overview</h2>\n")
outfile.write("<table>\n")
outfile.write("<thead><td>Engine</td><td>Percent</td></thead>\n")
for i in engine_stat:
  outfile.write("<tr><td>"+str(names[i])+"</td><td>%.2f%%</td></tr>\n" % (engine_stat[i]*100./total))
outfile.write("</table>\n")

outfile.write("<h2>Script overview</h2>\n")
outfile.write("<table>\n")
outfile.write("<thead><td>Script</td><td>Times called</td><td>Times compiled</td><td>Total time</td><td>Time spent</td></thead>\n")
for i in script_stat:
  total = 0
  for j in script_stat[i]:
    total += script_stat[i][j]

  outfile.write("<tr><td>"+str(i)+"</td>\n")
  outfile.write("<td>"+str(script_called[i]["s"])+"</td>\n")
  outfile.write("<td>"+str(script_called[i]["c"])+"</td>\n")
  outfile.write("<td>%.2f%%</td><td>\n" % (total*100./total_script))
  for j in script_stat[i]:
    outfile.write(names[j]+": %.2f%%, \n" % (script_stat[i][j]*100./total))
  outfile.write("</td></tr>\n")
outfile.write("</table>\n")

outfile.write("</body>\n")
outfile.write("</html>\n")
