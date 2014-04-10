import argparse
import subprocess
import struct
import json
import shutil
import os

argparser = argparse.ArgumentParser(description='Reduce the logfile to make suitable for online destribution.')
argparser.add_argument('js_shell', help='a js shell environment')
argparser.add_argument('js_file', help='the js file to parse')
argparser.add_argument('output_name', help='the name of the output (without the .js)')
args = argparser.parse_args()

shell = args.js_shell;
jsfile = args.js_file;
if jsfile[0] != "/":
    jsfile = os.getcwd() + "/" + jsfile;
output = args.output_name;

pwd = os.path.dirname(os.path.realpath(__file__))
datapwd = os.path.dirname(jsfile)

print "Get data information"
fp = open(jsfile, "r")
data = json.load(fp)
fp.close()

ndata = []
for j in range(len(data)):
    d = {"dict": datapwd+"/"+data[j]["dict"],
         "tree": datapwd+"/"+data[j]["tree"]}
    tree = shell+" -e 'var data = "+json.dumps(d)+"' -f "+pwd+"/reduce-tree.js"
    corr = shell+" -e 'var data = "+json.dumps(d)+"' -f "+pwd+"/reduce-correction.js"

    print tree
    treeOutput = subprocess.check_output(tree, shell=True)
    treeFile = open(output+'.tree.'+str(j)+'.tl', 'wb')
    for i in treeOutput.split("\n"):
      if i != "":
        treeFile.write(struct.pack('>c', chr(int(i))))
    treeFile.close()

    print corr
    corrOutput = subprocess.check_output(corr, shell=True)
    corrFile = open(output+'.corrections.'+str(j)+'.js', 'wb')
    corrFile.write(corrOutput);
    corrFile.close()

    print "copy textmap"
    shutil.copyfile(datapwd+"/"+data[j]["dict"], output+".dict."+str(j)+".js")

    ndata.append({
        "corrections": output+'.corrections.'+str(j)+'.js',
        "tree": output+'.tree.'+str(j)+'.tl',
        "dict": output+'.dict.'+str(j)+'.js'
    })

print "writing js file"

fp = open(output+".json", "w")
json.dump(ndata, fp);
fp.close()
