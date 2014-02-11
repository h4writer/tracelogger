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

rev = "32410b741451"
octane = "/home/h4server/Build/octane"

def bench(bench_name, js_file, html_file):
  global octane, js

  print run("rm /tmp/tracelogging.log; rm /tmp/tracelogging-compile.log; rm /tmp/tracelogging-gc.log"),
  print run("cd "+octane+"; "+js+" --ion-parallel-compile=on "+js_file),
  print run("cd /home/h4server/Build/tracelogger/output; pypy ../generate.py /tmp/tracelogging.log /tmp/tracelogging-compile.log /tmp/tracelogging-gc.log -n \""+bench_name+"\" -o "+html_file),

js = "/home/h4server/Build/mozilla-inbound/js/src/build-tracelogging/js"
for i in benchmarks:
  bench("Octane-"+i, "run-"+i+".js", "octane-"+i+"-"+rev+".html")

js = "/home/h4server/Build/mozilla-inbound/js/src/build-tracelogging-ggc/js"
for i in benchmarks:
  bench("Octane-"+i+" GGC", "run-"+i+".js", "octane-"+i+"-ggc-"+rev+".html")

