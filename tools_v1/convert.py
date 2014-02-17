import sys
import argparse
import tailer
from LogReader import LogReader
import struct
import json

argparser = argparse.ArgumentParser(description='Parse tracelogs and create html output for them.')
argparser.add_argument('logfile', nargs='+',
                   help='the logfile to parse')
argparser.add_argument('-o', '--outfile',
                   help='the name of the output files')
args = argparser.parse_args()

logFilenames = args.logfile
outFilename = args.outfile

treefile = open(outFilename+".tree.tl", 'wb') # clear file
treefile.close()
treefile = open(outFilename+".tree.tl", 'r+b')

jsfile = open(outFilename+".js", "w")
jsfile.write('var data = {"tree": "'+outFilename+'.tree.tl", "dict": "'+outFilename+'.dict.tl", "treeFormat":"64,64,31,1,32"}');
jsfile.close()

readers = []
for logFilename in logFilenames:
    readers.append(LogReader(logFilename))

#################################

old_textmap = ["bad"]
textmap = {}
textmap2 = []
def transform(info):
  if len(info) < 2:
    pass
  elif info[1].isdigit():
    info[1] = old_textmap[int(info[1])]
  else:
    old_textmap.append(info[1])
    len(old_textmap)

  text = ",".join(info)
  if text not in textmap:
    textmap[text] = len(textmap)
    textmap2.append(text)
  
  return textmap[text]

##############################################"

#TODO: make format changeable
# 64bit: start
# 64bit: stop
# 31bit: textId
#  1bit: hasChildren
# 32bit: nextId

def write(i, start, textId):
  hasChilds = 0
  value = textId*2+hasChilds
  treefile.seek(i * (8+8+4+4))
  treefile.write(struct.pack('>QQII', start, 0, value, 0))

def updateStop(i, stop):
  treefile.seek(i * (8+8+4+4) + 8)
  treefile.write(struct.pack('>Q', stop))

def updateHasChilds(i, hasChilds):
  treefile.seek(i * (8+8+4+4) + 8+8)
  value = treefile.read(4)
  value = struct.unpack(">I", value)[0]
  value = value >> 1
  value = value*2 + hasChilds
  treefile.seek(i * (8+8+4+4) + 8+8)
  treefile.write(struct.pack('>I', value))  

def updateNextId(i, nextId):
  treefile.seek(i * (8+8+4+4) + 8+8+4)
  treefile.write(struct.pack('>I', nextId))

#################################

class OutputTree:
  def __init__(self, start_tick):
    self.tree = {"sub":[], "start":0, "stop":-1, "info":"helper structure", "id":0}
    self.stack = [self.tree]
    self.topInfo_ = ["helper structure"]
    self.id = 0

    write(self.id, int(start_tick), 0)
  
  def hasChilds(self):
    return len(self.stack[-1]["sub"]) > 0

  def start(self, tick, info):
    self.id += 1

    updateHasChilds(self.stack[-1]["id"], 1);

    #TODO: remove sub/start
    data = {"sub":[], "start":tick, "id": self.id}
    self.stack[-1]["sub"].append(data)
    self.stack.append(data)
    self.topInfo_.append(info[0])

    write(self.id, int(tick), transform(info));
  
  def stop(self, tick):
    updateStop(self.stack[-1]["id"], int(tick))
    numChilds = len(self.stack[-1]["sub"]);
    if numChilds > 0:
      for i in range(0, numChilds-1):
        updateNextId(self.stack[-1]["sub"][i]["id"], self.stack[-1]["sub"][i+1]["id"])

    self.stack[-1]["stop"] = tick
    self.stack = self.stack[:-1]
    self.topInfo_ = self.topInfo_[:-1]

    #outfile.write("], stop:"+tick+"}")

  def end(self):
    if len(self.stack) != 1:
      print "WARNING: stack isn't correct"

    self.stop(self.tree["sub"][-1]["stop"])

  def topInfo(self):
    return self.topInfo_[-1]

  def topStart(self):
    return self.stack[-1]["start"] 

for reader in readers:
  reader.next()
  tree = OutputTree(reader.info()["data"][0])

  while not reader.isDone():
    if reader.isStart():
        info = reader.info()["data"]
        tree.start(info[0], info[2:])

    elif reader.isStop():
        info = reader.current_

        # hack: also stop the engine
        if tree.topInfo()[0] == "i" or tree.topInfo()[0] == "b" or tree.topInfo()[0] == "o":
          tree.stop(info[0])

        tree.stop(info[0])

    elif reader.isEngineChange():
        assert tree.topInfo()[0] == "s" or tree.topInfo()[0] == "i" or tree.topInfo()[0] == "b" or tree.topInfo()[0] == "o"

        info = reader.current_
        start = info[0]

        if tree.topInfo()[0] != "s":
          tree.stop(info[0])

        if not tree.hasChilds():
          start = tree.topStart()

        tree.start(start, info[2:])

    reader.next()
  tree.end()

  dicfile = open(outFilename+".dict.tl", "w")
  dicfile.write(json.dumps(textmap2));
  dicfile.close()

