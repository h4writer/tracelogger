import argparse
import subprocess
import struct
import json
import shutil
import os

class SmartFormatter(argparse.HelpFormatter):
    def _split_lines(self, text, width):
        if text.startswith('R|'):
            return text[2:].splitlines()  
        # this is the RawTextHelpFormatter._split_lines
        return argparse.HelpFormatter._split_lines(self, text, width)

tools = {
    "dump": "Dump the binary format in a textual format.",
    "dump_flat": "Dump the binary format in a flat textual format.",
    "overview": "Gives an overview of where the time was spend.",
    "waiting_for_ion": "Gives how much time was spend trying to execute a script, that we were compiling in ion."
}

description = "Run a specific tool over a tracelogger file.\r\n"
for key in tools:
    description += " - " + key + ": " + tools[key] + "\r\n"

argparser = argparse.ArgumentParser(description=description, formatter_class=argparse.RawTextHelpFormatter)
argparser.add_argument('tool', help='name of the tool')
argparser.add_argument('js_shell', help='a js shell environment')
argparser.add_argument('js_file', help='the json file to parse')
args = argparser.parse_args()

if args.tool not in tools:
    print("unknown tool");
    exit();

jsfile = os.path.abspath(args.js_file);
pwd = os.path.dirname(os.path.realpath(__file__))
datapwd = os.path.dirname(jsfile)

os.chdir(datapwd)

# Get the data information
with open(jsfile, "r") as fp:
    data = json.load(fp)

# Handle tl-data.json redirect files
if not isinstance(data, list):
    with open(data, "r") as fp:
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
    "var data = " + json.dumps(mainEntry),
    "-f",
    pwd+"/"+args.tool+".js"
]
subprocess.call(overview)
