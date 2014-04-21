import os
import subprocess
import json
import runner
import submitter
import engine
import utils


utils.InitConfig("tl.config")

######### RECOMPILE ###############

pwd = os.path.dirname(os.path.realpath(__file__))
output = subprocess.check_call("cd "+pwd+"; ./compile.sh", shell=True)

######### RUN ####################

rev = utils.run('hg parent --template "{node|short}" --cwd /home/h4writer/Build/mozilla-inbound')
print rev

normaljs = utils.config.get('main', 'js')

engines = [engine.X86Engine()]

for engine in engines:
    submit = submitter.Submitter()
    submit.Start(rev, engine)
    runner.OctaneRunner(rev, engine, submit, normaljs).bench();
    runner.SSRunner(rev, engine, submit, normaljs).bench();
    runner.PeaceKeeperRunner(rev, engine, submit, normaljs).bench();
    submit.Finish()

######### SAVE COLORS ############

utils.run(engines.shell() + " -e ''")

fp = open("/tmp/tl-data.json", "r")
data = json.load(fp)
fp.close()

toolsv2 = utils.config.get('main', 'toolsv2')+
colors = utils.run(engines.shell() + " -f '"+toolsv2+"/engine.js' -e 'var textmap = JSON.parse(read(\""+data[0]["dict"]+"\")); var colors = TextToColor(textmap); print(JSON.stringify(textmap))'")

fp = open(uploadPath+"/colors.js", "w")
fp.write("var colors = "+colors);
fp.close()

######### UPLOAD #################

logDir = utils.config.get('main', 'logDir')
uploadPath = utils.config.get('main', 'uploadPath')

print utils.run("rm -f "+uploadPath+"/data-*")
print utils.run("rm -f "+uploadPath+"/rev")
print utils.run("cp "+logDir+"/data-*-"+rev+"-reduced.*.gz "+uploadPath)
print utils.run("rename s/-"+rev+"-reduced// "+uploadPath+"/data-*.gz")
print utils.run("gunzip "+uploadPath+"/data-*.gz")
print utils.run("sed -i s/-"+rev+"-reduced//g "+uploadPath+"/data-*.json")
print utils.run("echo '"+rev+"' > "+uploadPath+"/rev")
print utils.run("cd ~/Build/uploader; ~/Build/stackato update -n")
