import argparse
import os
import shutil
from subprocess import check_output
import json

def assertExists(dir, file):
    assert os.path.exists(os.path.join(dir, file))
def assertContains(dir, file, text):
    with open(os.path.join(dir, file), "r") as fp:
        data = fp.read()
        assert text == data
def assertOverview(output):
    objs = json.loads(output)
    assert "engineOverview" in objs
    assert "scriptOverview" in objs
    assert "scriptTimes" in objs


argparser = argparse.ArgumentParser()
argparser.add_argument('js_shell', help='a js shell environment')
args = argparser.parse_args()

####################################################################################"
output = check_output(["python", "../tools_v2/overview.py", args.js_shell, "tl-data.json"])

assertOverview(output)

####################################################################################"
os.chdir("..")

output = check_output(["python", "tools_v2/overview.py", args.js_shell, os.path.join("tests", "tl-data.json")])

assertOverview(output)
