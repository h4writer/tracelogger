import os
import shutil
from subprocess import call
import json

def touch(fname, times=None):
    with open(fname, 'a'):
        os.utime(fname, times)
def createDir(dir):
    try:
        os.stat(dir)
    except:
        os.mkdir(dir)  
def createFiles(dir, name):
    with open(os.path.join(dir, name+".json"), "w") as fp:
        fp.write('[{"tree": "'+name+'.tree.0.tl", "treeFormat": "64,64,31,1,32", "dict": "'+name+'.dict.0.json", "events": "'+name+'.event.0.tl", "threadName": "Web Content"}, {"tree": "'+name+'.tree.1.tl", "treeFormat": "64,64,31,1,32", "dict": "'+name+'.dict.1.json", "events": "'+name+'.event.1.tl", "threadName": "JS Helper"}]')
        touch(os.path.join(dir, name+".tree.0.tl"))
        touch(os.path.join(dir, name+".dict.0.json"))
        touch(os.path.join(dir, name+".event.0.tl"))
        touch(os.path.join(dir, name+".tree.1.tl"))
        touch(os.path.join(dir, name+".dict.1.json"))
        touch(os.path.join(dir, name+".event.1.tl"))
def addCorrections(dir, name):
    fp = open(os.path.join(dir, name+".json"), "r")
    data = json.load(fp)
    fp.close()
    for i in range(len(data)):
        data[i]["corrections"] = name+".corrections."+str(i)+".json"
        touch(os.path.join(dir, name+".corrections."+str(i)+".json"))
    fp = open(os.path.join(dir, name+".json"), "w")
    json.dump(data, fp);
    fp.close()
def clearDir(dir):
    if os.path.exists(dir):
        shutil.rmtree(dir)
def assertExists(dir, file):
    assert os.path.exists(os.path.join(dir, file))
def assertContains(dir, file, text):
    with open(os.path.join(dir, file), "r") as fp:
        data = fp.read()
        assert text == data
def createForwardFile(dir, forward, file):
    with open(os.path.join(dir, forward), "w") as fp:
        fp.write('"'+file+'"')
    


DIR = "/tmp/test1234"

####################################################################################"
clearDir(DIR)
createDir(DIR)
createFiles(DIR, "test")

call(["python", "../tools_v2/rename.py", os.path.join(DIR, "test.json"), os.path.join(DIR, "test2.json")])

assertExists(DIR, "test2.json")
assertExists(DIR, "test2.tree.0.tl")
assertExists(DIR, "test2.dict.0.json")
assertExists(DIR, "test2.event.0.tl")
assertExists(DIR, "test2.tree.1.tl")
assertExists(DIR, "test2.dict.1.json")
assertExists(DIR, "test2.event.1.tl")

####################################################################################"
clearDir(DIR)
createDir(DIR)
createFiles(DIR, "test")
addCorrections(DIR, "test")

call(["python", "../tools_v2/rename.py", os.path.join(DIR, "test.json"), os.path.join(DIR, "test2.json")])

assertExists(DIR, "test2.json")
assertExists(DIR, "test2.tree.0.tl")
assertExists(DIR, "test2.dict.0.json")
assertExists(DIR, "test2.event.0.tl")
assertExists(DIR, "test2.corrections.0.json")
assertExists(DIR, "test2.tree.1.tl")
assertExists(DIR, "test2.dict.1.json")
assertExists(DIR, "test2.event.1.tl")
assertExists(DIR, "test2.corrections.1.json")

####################################################################################"
clearDir(DIR)
createDir(DIR)
createFiles(DIR, "test")
createForwardFile(DIR, "tl-data.json", "test.json")

call(["python", "../tools_v2/rename.py", os.path.join(DIR, "tl-data.json"), os.path.join(DIR, "test2.json")])

assertExists(DIR, "tl-data.json")
assertContains(DIR, "tl-data.json", '"test2.json"')
assertExists(DIR, "test2.json")
assertExists(DIR, "test2.tree.0.tl")
assertExists(DIR, "test2.dict.0.json")
assertExists(DIR, "test2.event.0.tl")
assertExists(DIR, "test2.tree.1.tl")
assertExists(DIR, "test2.dict.1.json")
assertExists(DIR, "test2.event.1.tl")

####################################################################################"
clearDir(DIR)
createDir(DIR)
createFiles(DIR, "test")
createForwardFile(DIR, "tl-data.json", "test.json")

call(["python", "../tools_v2/rename.py", os.path.join(DIR, "tl-data.json"), os.path.join(DIR, "tl-data.json")])

assertExists(DIR, "tl-data.json")
assertExists(DIR, "tl-data.tree.0.tl")
assertExists(DIR, "tl-data.dict.0.json")
assertExists(DIR, "tl-data.event.0.tl")
assertExists(DIR, "tl-data.tree.1.tl")
assertExists(DIR, "tl-data.dict.1.json")
assertExists(DIR, "tl-data.event.1.tl")

####################################################################################"
clearDir(DIR)
createDir(DIR)
createFiles(DIR, "tl-data")

call(["python", "../tools_v2/rename.py", os.path.join(DIR, "tl-data.json"), os.path.join(DIR, "tl-data.json")])

assertExists(DIR, "tl-data.json")
assertExists(DIR, "tl-data.tree.0.tl")
assertExists(DIR, "tl-data.dict.0.json")
assertExists(DIR, "tl-data.event.0.tl")
assertExists(DIR, "tl-data.tree.1.tl")
assertExists(DIR, "tl-data.dict.1.json")
assertExists(DIR, "tl-data.event.1.tl")
