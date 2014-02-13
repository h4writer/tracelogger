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

engines = [engine.X86Engine(),
           engine.X86GGCEngine()]

for engine in engines:
    submitter = submitter.Submitter()
    submitter.Start(rev, engine)
    runner.OctaneRunner(rev, engine, submitter, normaljs).bench();
    runner.SSRunner(rev, engine, submitter, normaljs).bench();
    runner.PeaceKeeperRunner(rev, engine, submitter, normaljs).bench();
    submitter.Finish()

