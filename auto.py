import subprocess

def run(cmd):
    output = subprocess.check_output(cmd, shell=True)
    return output

benchmarks = ['richards',
'deltablue',
'crypto',
'raytrace',
'earley-boyer',
'regexp',
'splay',
'navier-stokes',
'pdfjs',
'mandreel',
'gbemu',
'code-load',
'box2d']

rev = "5efda3c30be3"
octane = "/home/h4writer/Build/octane"

def bench(bench_name, js_file, html_file):
  global octane, js

  print run("cd "+octane+"; "+js+" --ion-parallel-compile=on "+js_file),

  head = run("head -1 /tmp/tracelogging.log").split(",")[0]
  tail = run("tail -n 1 /tmp/tracelogging.log").split(",")[0]
  ticks = int(tail)-int(head)
  pixels = 80000

  print run("cd /home/h4writer/Build/tracelogger/output; python ../generate.py /tmp/tracelogging.log "+str(ticks/pixels)+" \""+bench_name+"\" > "+html_file),


js = "/home/h4writer/Build/mozilla-inbound/js/src/build-64/js"
for i in benchmarks:
  bench("Octane-"+i, "run-"+i+".js", "octane-"+i+"-"+rev+".html")

js = "/home/h4writer/Build/mozilla-inbound/js/src/build-ggc/js"
for i in benchmarks:
  bench("Octane-"+i+" GGC", "run-"+i+".js", "octane-"+i+"-ggc-"+rev+".html")

#  run("cd "+octane+"; "+js+" --ion-parallel-compile=on run-"+i+".js")
#  run("cd /home/h4writer/Build/tracelogger/output; python ../generate.py /tmp/tracelogging.log 20000 Octane-"+i+" "+rev+" > octane-"+i+"-"+rev+".html")
#  run("cd "+octane+"; "+js+" --ion-parallel-compile=on run-"+i+".js")
#  run("cd /home/h4writer/Build/tracelogger/output; python ../generate.py /tmp/tracelogging.log 20000 \"Octane-"+i+" GGC\" "+rev+" > octane-"+i+"-ggc-"+rev+".html")
