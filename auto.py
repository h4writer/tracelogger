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

rev = "82d28bdf9317"
octane = "/home/h4writer/Build/octane"

def bench(bench_name, js_file, html_file):
  global octane, js

  print run("cd "+octane+"; "+js+" --ion-parallel-compile=on "+js_file),
  print run("cd /home/h4writer/Build/tracelogger/output; pypy ../generate.py /tmp/tracelogging.log 80000 \""+bench_name+"\" > "+html_file),

js = "/home/h4writer/Build/mozilla-inbound/js/src/build-tracelogging/js"
for i in benchmarks:
  bench("Octane-"+i, "run-"+i+".js", "octane-"+i+"-"+rev+".html")

js = "/home/h4writer/Build/mozilla-inbound/js/src/build-tracelogging-ggc/js"
for i in benchmarks:
  bench("Octane-"+i+" GGC", "run-"+i+".js", "octane-"+i+"-ggc-"+rev+".html")

