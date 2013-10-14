import sys
import argparse
import tailer
from LogReader import LogReader

argparser = argparse.ArgumentParser(description='Parse tracelogs and create html output for them.')
argparser.add_argument('logfile', nargs='+',
                   help='the logfile to parse')
argparser.add_argument('-o', '--outfile', default="stdout",
                   help='the name of the js output file')
args = argparser.parse_args()

logFilenames = args.logfile
outFilename = args.outfile

if outFilename == "stdout":
    outfile = sys.stdout
elif outFilename == "stderr":
    outfile = sys.stderr
else:
    outfile = open(outFilename, 'w')

readers = []
for logFilename in logFilenames:
    readers.append(LogReader(logFilename))

#################################

# Currently we save only save numbers after the first output.
# This will change in the future.
textmap = ["bad"]
def transform(info):
  if len(info) < 2 or info[1].isdigit():
    return ",".join(info)

  textmap.append(info[1])
  info[1] = str(len(textmap)-1)
  return ",".join(info)

#################################
import simplejson
class OutputTree:
  def __init__(self, fp):
    self.fp = fp
    self.tree = {"sub":[], "start":0, "stop":-1, "info":"helper structure"}
    self.stack = [self.tree]
    self.topInfo_ = ["helper structure"]

    outfile.write("var data = {start:0, info:'helper structure', sub:[")
  
  def hasChilds(self):
    return len(self.stack[-1]["sub"]) > 0

  def start(self, tick, info):
    if self.hasChilds():
      outfile.write(",")

    #TODO: remove sub/start
    data = {"sub":[], "start":tick}
    self.stack[-1]["sub"].append(data)
    self.stack.append(data)
    self.topInfo_.append(transform(info))

    outfile.write("{start:"+tick+", info:"+simplejson.dumps(self.topInfo_[-1])+", sub:[")
  
  def stop(self, tick):
    self.stack[-1]["stop"] = tick
    self.stack = self.stack[:-1]
    self.topInfo_ = self.topInfo_[:-1]

    outfile.write("], stop:"+tick+"}")

  def end(self):
    print len(self.stack)
    stop = self.tree["sub"][-1]["stop"]

    outfile.write("], stop:"+stop+"};")

  def topInfo(self):
    return self.topInfo_[-1]

  def topStart(self):
    return self.stack[-1]["start"] 

nstart = 0
estart = 0
for reader in readers:
  reader.next()
  tree = OutputTree(outfile)
  while not reader.isDone():
    if reader.isStart():
        info = reader.info()["data"]
        tree.start(info[0], info[2:])
        nstart += 1

    elif reader.isStop():
        info = reader.current_

        # hack: also stop the engine
        if tree.topInfo()[0] == "i" or tree.topInfo()[0] == "b" or tree.topInfo()[0] == "o":
          tree.stop(info[0])
          estart -= 1

        tree.stop(info[0])
        nstart -= 1

    elif reader.isEngineChange():
        assert tree.topInfo()[0] == "s" or tree.topInfo()[0] == "i" or tree.topInfo()[0] == "b" or tree.topInfo()[0] == "o"

        info = reader.current_
        start = info[0]

        if tree.topInfo()[0] != "s":
          tree.stop(info[0])
          estart -= 1

        if not tree.hasChilds():
          start = tree.topStart()

        tree.start(start, info[2:])
        estart += 1

    reader.next()
  print nstart, estart
  tree.end()

  outfile.write("var textmap = ")
  outfile.write(simplejson.dumps(textmap))
  outfile.write(";")
  textmap = []
