import argparse
import subprocess
import json
import os

argparser = argparse.ArgumentParser(description='Returns an overview of the mainthread.')
argparser.add_argument('js_shell', help='a js shell environment')
argparser.add_argument('js_file', help='the js file to parse')
args = argparser.parse_args()

jsfile = os.path.abspath(args.js_file);

pwd = os.path.dirname(os.path.realpath(__file__))
datapwd = os.path.dirname(jsfile)

# Get the data information
with open(jsfile, "r") as fp:
    data = json.load(fp)

# Guess the mainthread for which we want to generate an overview
# We guess by taking the entry which has the largest tree.
max_size = 0
mainEntry = None
for entry in data:
    statinfo = os.stat(datapwd + "/" + entry["tree"])
    if statinfo.st_size > max_size:
        max_size = statinfo.st_size
        mainEntry = entry

overview = [
    args.js_shell,
    "-e",
    "var data = " + json.dumps(entry),
    "-f",
    pwd+"/overview.js"
]
subprocess.call(overview)
