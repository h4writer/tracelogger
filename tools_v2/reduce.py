import argparse
import struct
import json
import shutil
import os
import collections

argparser = argparse.ArgumentParser(description='Reduce the logfile to make suitable for online distribution.')
argparser.add_argument('js_file', help='the js file to parse')
argparser.add_argument('output_name', help='the name of the output (without the .js)')
argparser.add_argument('--no-corrections', action='store_false', dest='corrections', help='don\'t compute the corrections files')
argparser.add_argument('--threshold', default=0.1, help='prune anything that would be fewer than THRESHOLD pixels on a 1600x400 pixel canvas')

args = argparser.parse_args()

jsfile = os.path.abspath(args.js_file);
output = args.output_name;

pwd = os.path.dirname(os.path.realpath(__file__))
datapwd = os.path.dirname(jsfile)

print "Get data information"
with open(jsfile, "r") as fp:
    data = json.load(fp)

TreeItem = collections.namedtuple('TreeItem', ['id', 'start', 'stop', 'textId', 'children', 'nextId'])

class TreeReader(object):
    def __init__(self, fp):
        self.fp = fp

    def readItem(self, offset):
        struct_fmt = '!QQII'
        struct_len = struct.calcsize(struct_fmt)
        struct_unpack = struct.Struct(struct_fmt).unpack_from

        self.fp.seek(offset * struct_len)
        s = self.fp.read(struct_len)
        if not s:
            return
        s = struct_unpack(s)
        return TreeItem(offset, s[0], s[1], s[2] >> 1, s[2] & 0x1, s[3])

    def writeItem(self, item):
        struct_fmt = '!QQII'
        struct_len = struct.calcsize(struct_fmt)
        struct_pack = struct.Struct(struct_fmt).pack

        self.fp.seek(item.id * struct_len)
        s = struct_pack(item.start, item.stop, item.textId * 2 + item.children, item.nextId)

        self.fp.write(s)

    def childGenerator(self, item):
        if item.children:
            child = self.readItem(item.id + 1)
            while child:
                yield child
                child = self.readItem(child.nextId) if child.nextId else None

    def _getStop(self, item):
        # When there is a stop time set, use that. Finished.
        if item.stop != 0:
            return item.stop

        # The parent item doesn't contain the stop information.
        # Get the last tree item for the stop information.
        children = list(self.childGenerator(item))

        # If there are no children. Still use parentItem.stop
        if not children:
            return item.stop

        # Get the last item stop time.
        return self._getStop(children[-1])

    def getStop(self):
        parentItem = self.readItem(0)
        return self._getStop(parentItem);
        
class CreateDataTree(TreeReader):
    def __init__(self, fp, start, stop):
        TreeReader.__init__(self, fp)

        self.writeItem(TreeItem(0, start, stop, 0, 0, 0))
        self.newId = 1

    def addChild(self, parent, oldItem):
        parentItem = self.readItem(parent)
        if parentItem.children is 1:
            lastChildItem = self.readItem(parent + 1)
            while lastChildItem.nextId is not 0:
                lastChildItem = self.readItem(lastChildItem.nextId) 
            self.writeItem(lastChildItem._replace(nextId = self.newId)) 
        else:
            assert self.newId == parent + 1
            self.writeItem(parentItem._replace(children = 1))
        self.writeItem(TreeItem(self.newId, oldItem.start, oldItem.stop, oldItem.textId, 0, 0))
        newId = self.newId
        self.newId += 1
        return newId

class Overview:
    def __init__(self, tree, dic):
        self.tree = tree
        self.dic = dic
        self.engineOverview = {}
        self.engineAmount = {}
        self.scriptOverview = {}
        self.scriptTimes = {}

    def isScriptInfo(self, tag):
      return tag[0:6] == "script";

    def clearScriptInfo(self, tag):
      return tag == "G" or tag == "g";

    def calc(self):
        self.processTreeItem("", self.tree.readItem(0))

    def processTreeItem(self, script, item):
        time = item.stop - item.start
        info = self.dic[item.textId]

        if self.clearScriptInfo(info):
            script = ""
        elif self.isScriptInfo(info):
            script = info

        if item.children is 1:
            childItem = self.tree.readItem(item.id + 1) 
            while childItem:
                time -= childItem.stop - childItem.start
                self.processTreeItem(script, childItem)
                if childItem.nextId is 0:
                    break
                childItem = self.tree.readItem(childItem.nextId) 

        if item.id == 0:
            return

        if script is "":
            return

        if time > 0 and not self.isScriptInfo(info):
            if info not in self.engineOverview:
                self.engineOverview[info] = 0
            if info not in self.engineAmount:
                self.engineAmount[info] = 0
            self.engineOverview[info] += time
            self.engineAmount[info] += 1

        if script != "" and info != "Internal":
            if script not in self.scriptTimes:
                self.scriptTimes[script] = {}
            if info not in self.scriptTimes[script]:
                self.scriptTimes[script][info] = 0;
            self.scriptTimes[script][info] += 1;

            if script not in self.scriptOverview:
                self.scriptOverview[script] = {}
            if info not in self.scriptOverview[script]:
                self.scriptOverview[script][info] = 0
            self.scriptOverview[script][info] += time;

def reduceTree(oldTree, newTree, parent, oldItem):
    if oldItem.stop == 0 or oldItem.stop - oldItem.start >= threshold:
        newId = newTree.addChild(parent, oldItem)
        for child in oldTree.childGenerator(oldItem):
            reduceTree(oldTree, newTree, newId, child)
        
ndata = []
for j, datum in enumerate(data):
    print "reducing trace #%d of %d files" % (j, len(data))
    fp = open(datapwd+"/"+datum["tree"], "rb")
    wp = open("%s.tree.%d.tl" % (output, j), 'w+b')

    oldTree = TreeReader(fp)
    parentItem = oldTree.readItem(0)
    start = parentItem.start
    stop = oldTree.getStop()
    newTree = CreateDataTree(wp, start, stop)

    # accuracy of args.threshold (default 0.1) px when graph shown on 1600
    # width display (1600*400)
    threshold = int((stop - start) / (64000 / args.threshold))

    for child in oldTree.childGenerator(parentItem):
        reduceTree(oldTree, newTree, 0, child)

    if args.corrections:
        with open(datapwd+"/"+datum["dict"], "r") as fp:
            dic = json.load(fp)

        fullOverview = Overview(oldTree, dic)
        fullOverview.calc()

        partOverview = Overview(newTree, dic)
        partOverview.calc()

        correction = {
          "engineOverview": {},
          "engineAmount": {},
          "scriptTimes": {},
          "scriptOverview": {}
        }
        for i in fullOverview.engineOverview:
          correction["engineOverview"][i] = fullOverview.engineOverview[i]
          if i in partOverview.engineOverview:
            correction["engineOverview"][i] -= partOverview.engineOverview[i]
        for i in fullOverview.engineAmount:
          correction["engineAmount"][i] = fullOverview.engineAmount[i]
          if i in partOverview.engineAmount:
            correction["engineAmount"][i] -= partOverview.engineAmount[i]
        for script in fullOverview.scriptTimes:
          correction["scriptTimes"][script] = {}
          for part in fullOverview.scriptTimes[script]:
            correction["scriptTimes"][script][part] = fullOverview.scriptTimes[script][part] 
            if script in partOverview.scriptTimes and part in partOverview.scriptTimes[script]:
              correction["scriptTimes"][script][part] -= partOverview.scriptTimes[script][part]
        for script in fullOverview.scriptOverview: 
          correction["scriptOverview"][script] = {}
          for part in fullOverview.scriptOverview[script]:
            correction["scriptOverview"][script][part] = fullOverview.scriptOverview[script][part] 
            if script in partOverview.scriptOverview and part in partOverview.scriptOverview[script]:
              correction["scriptOverview"][script][part] -= partOverview.scriptOverview[script][part]

        with open("%s.corrections.%d.json" % (output, j), 'wb') as corrFile:
            json.dump(correction, corrFile)
    
    shutil.copyfile(datapwd+"/"+datum["dict"], "%s.dict.%d.json" % (output, j))

    ndata.append({
        "tree": "%s.tree.%d.tl" % (os.path.basename(output), j),
        "dict": "%s.dict.%d.json" % (os.path.basename(output), j)
    })

    if "threadName" in datum:
        ndata[-1]["threadName"] = datum["threadName"]

    if args.corrections:
        ndata[-1]["corrections"] = "%s.corrections.%d.json" % (os.path.basename(output), j)

print "writing js file"

with open(output+".json", "w") as fp:
    json.dump(ndata, fp);
