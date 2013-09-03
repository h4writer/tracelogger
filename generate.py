import sys
import gzip
import argparse
import tailer
from collections import defaultdict

argparser = argparse.ArgumentParser(description='Parse tracelogs and create html output for them.')
argparser.add_argument('logfile',
                   help='the logfile to parse')
argparser.add_argument('outfile',
                   help='the name of the html output file')
argparser.add_argument('-w', '--width', type=int, default=80000,
                   help='width in px (default: 80000)')
argparser.add_argument('-n', '--name', default=None,
                   help='benchmark name')
argparser.add_argument('-r', '--revision', default=None,
                   help='mercurial revision the shell or browser executable was built from')
argparser.add_argument('-f', '--filter-scripts', dest='filter', default='',
                   help='Only record information if at least one script is on the stack whose location starts with the given string')
args = argparser.parse_args()

logFilename = args.logfile
outFilename = args.outfile
pixels = args.width
bench_name = args.name
revno = args.revision
scriptFilter = args.filter

head = tailer.head(open(logFilename), 1)[0].split(",")[0]
tail = tailer.tail(open(logFilename), 1)[0].split(",")[0]
ticks = int(tail)-int(head)
zoom = pixels*1./ticks

filter_matched = False
first_matched_frame = 0

outfile = open(outFilename, 'w')


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
    if not filter_matched:
      return ""
    full_info = ""
    # print first_matched_frame
    for info in stack[first_matched_frame:]:
        full_info += "; -"+",".join(info["data"][2:])
        if "engine" in info:
            full_info += info["engine"]
    # for i in range(first_matched_frame:len(stack)):
    #     full_info += "; -"+",".join(stack[i]["data"][2:])
    #     if "engine" in stack[i]:
    #         full_info += stack[i]["engine"]
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

    outfile.write("<span class='block "+class_+" "+engine+"' info='Block: "+str(block_time)+";Engine:"+engine+";<b>Call stack:</b>"+full_info+"'>"+blocks+"</span>")
    block_time += 1

engine_stat = defaultdict(int)
script_stat = defaultdict(lambda : defaultdict(int))
def keep_stat(delta, info):
  engine = ""
  task = info["data"][2]
  if "engine" in info:
      engine = info["engine"]
  engine_stat[task+" "+engine] += delta

  if (task == "script" and filter_matched) or ((task == "ion_compile" or "parser" in task) and info["data"][3].startswith(scriptFilter)):
      script = info["data"][3]
      script_stat[script][task+" "+engine] += delta

script_called = defaultdict(lambda : defaultdict(int))
def keep_stat_start(data):
  global filter_matched
  task = data[2]
  if (not filter_matched) and task == "script" and data[3].startswith(scriptFilter):
      filter_matched = True
      first_matched_frame = len(stack)
      print "match: " + data[3] + ', stack len: ' + str(first_matched_frame)
  if task == "script" or task == "ion_compile" or "parser" in task:
      script = data[3]
      if task != "script" or filter_matched:
          script_called[script][task] += 1

##################################################""

stack = []

if ".gz" in logFilename:
    fp = gzip.open(logFilename)
else:
    fp = open(logFilename)

for line in fp:
    data = line.split(",")
    if len(data) < 2:
        continue
    if data[1] == "start" or data[1] == "stop" or (data[1] == "info" and data[2] == "engine"):
        time = int(data[0])
        if data[1] == "start":
            stack.append({"data":data})
            keep_stat_start(data)
        else:
            output(time-prev_time, stack[-1])
            keep_stat(time-prev_time, stack[-1])
            
            if data[1] == "info":
                assert data[2] == "engine"
                stack[-1]["engine"] = data[3]
            else:
                assert data[1] == "stop"
                stack.pop()
                if len(stack) == first_matched_frame:
                  filter_matched = False

    prev_time = time

##########################################################
outfile.write("</div>\n")

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

outfile.write("<h2>Engine overview</h2>\n")
outfile.write("<table>\n")
outfile.write("<thead><td>Engine</td><td>Percent</td></thead>\n")
for i in engine_stat:
  outfile.write("<tr><td>"+str(i)+"</td><td>%.2f%%</td></tr>\n" % (engine_stat[i]*100./total))
outfile.write("</table>\n")

outfile.write("<h2>Script overview</h2>\n")
outfile.write("<table>\n")
outfile.write("<thead><td>Script</td><td>Times called</td><td>Times compiled</td><td>Total time</td><td>Time spent</td></thead>\n")
for i in script_stat:
  # hack since this is actually just overhead
  if "script " in script_stat[i]:
    del script_stat[i]["script "]

  total = 0
  for j in script_stat[i]:
    total += script_stat[i][j]

  outfile.write("<tr><td>"+str(i)+"</td>\n")
  outfile.write("<td>"+str(script_called[i]["script"])+"</td>\n")
  outfile.write("<td>"+str(script_called[i]["ion_compile"])+"</td>\n")
  outfile.write("<td>%.2f%%</td><td>\n" % (total*100./total_script))
  for j in script_stat[i]:
    outfile.write(j+": %.2f%%, \n" % (script_stat[i][j]*100./total))
  outfile.write("</td></tr>\n")
outfile.write("</table>\n")

outfile.write("</body>\n")
outfile.write("</html>\n")
