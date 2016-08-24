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

shell = args.js_shell
jsfile = os.path.abspath(args.js_file)

pwd = os.path.dirname(os.path.realpath(__file__))
datapwd = os.path.dirname(jsfile)

# Get the data information
with open(jsfile, "r") as fp:
    data = json.load(fp)

# Handle tl-data.json redirect files
if not isinstance(data, list):
    with open(data, "r") as fp:
        data = json.load(fp)


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

def updateDisplay():
    global opened, display
    display = []
    if len(opened) == 0:
        display.extend([d["tree"] for d in data])
    else:
        display.append(data[opened[0]]["tree"])

        overview = [
            shell,
            "-e", "var data = "+json.dumps(data[opened[0]])+";var opened = "+json.dumps(opened[1:]),
            "-f", pwd+"/navigate.js"
        ]
        env = os.environ
        env['TLLOG'] = ''
        lines = subprocess.check_output(overview, shell=False, env=env)
        lines = lines.split("\n")
        display = display + lines

def makeDisplay():
    global line

    start = max(selected - 10, 0)
    stop = start + 40
    if stop > len(display):
        start = max(0, len(display) - 40)

    line = start
    for i in display[start:stop]:
        printline(i);

def printline(data):
    global selected, line
    if selected == line:
        print '\033[94m' + data + '\033[0m'
    else:
        print data
    line += 1
selected = 0
line = 0
opened = []
display = []
choice = "a"
updateDisplay()

KEY_UP = '[A'
KEY_DOWN = '[B'
KEY_PGDN = '[6'
KEY_PGUP = '[5'
KEY_ENTER = chr(13)

while 1:
    clearscreen()
    makeDisplay()

    print(opened)
    choice = getkey()
    if choice == 'x' or choice == 'q':
        exit()
    if choice == '\x1b':
        choice = getkey()+getkey()
        if choice == KEY_UP:
            if selected != 0:
                selected -= 1
        if choice == KEY_DOWN:
            if selected + 1 != line:
                selected += 1
        if choice == KEY_PGDN:
            if selected + 10 < line:
                selected += 10
            else:
                selected = line - 1;
        if choice == KEY_PGUP:
            if selected - 10 > 0:
                selected -= 10
            else:
                selected = 0;
    if choice == KEY_ENTER:
        if selected < len(opened):
            opened = opened[:selected]
            selected = len(opened)
            updateDisplay()
        else:
            opened.append(selected - len(opened))
            selected = len(opened) - 1
            updateDisplay()
