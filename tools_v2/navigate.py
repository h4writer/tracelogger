import argparse
import subprocess
import struct
import json
import shutil
import os
import sys

argparser = argparse.ArgumentParser(description='Returns an overview of the mainthread.')
argparser.add_argument('js_shell', help='a js shell environment')
argparser.add_argument('js_file', help='the js file to parse')
args = argparser.parse_args()

shell = args.js_shell;
jsfile = args.js_file;
if jsfile[0] != "/":
    jsfile = os.getcwd() + "/" + jsfile;

pwd = os.path.dirname(os.path.realpath(__file__))
datapwd = os.path.dirname(jsfile)

# Get the data information
fp = open(jsfile, "r")
data = json.load(fp)
fp.close()


import sys,tty,termios
class _Getch:
    def __call__(self):
            fd = sys.stdin.fileno()
            old_settings = termios.tcgetattr(fd)
            try:
                tty.setraw(sys.stdin.fileno())
                ch = sys.stdin.read(1)
            finally:
                termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
            return ch
def getkey():
    inkey = _Getch()
    while(1):
        k=inkey()
        if k!='':
            break
    return k

def clearscreen():
    print chr(27) + "[2J"

def makeDisplay():
    global line, opened
    line = 0
    if len(opened) == 0:
        for i in range(len(data)):
            printline(data[i]["tree"])
    else:
        printline(data[opened[0]]["tree"])

        overview = shell+" -e 'var data = "+json.dumps(data[opened[0]])+";var opened = "+json.dumps(opened[1:])+"' -f "+pwd+"/navigate.js"
        lines = subprocess.check_output(overview, shell=True)
        lines = lines.split("\n")
        for i in lines:
            printline(i)

selected = 0
line = 0
opened = []

def printline(data):
    global selected, line
    if selected == line:
        print '\033[94m' + data + '\033[0m'
    else:
        print data
    line += 1
choice = "a"
while 1:
    clearscreen()
    makeDisplay()

    print(opened)
    choice = getkey()
    if choice == 'x':
        exit()
    if choice == '\x1b':
        choice = getkey()+getkey()
        if choice == '[A': # up
            if selected != 0:
                selected -= 1
        if choice == '[B': # down
            if selected + 1 != line:
                selected += 1
    if choice == chr(13): # enter
        if selected < len(opened):
            opened = opened[:selected]
            selected = len(opened)
        else:
            opened.append(selected - len(opened))
            selected = len(opened) - 1 
