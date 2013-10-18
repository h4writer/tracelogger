import argparse
import subprocess
import struct
import json
import shutil

argparser = argparse.ArgumentParser(description='Reduce the logfile to make suitable for online destribution.')
argparser.add_argument('js_shell', help='a js shell environment')
argparser.add_argument('js_file', help='the js file to parse')
argparser.add_argument('output_name', help='the name of the output (without the .js)')
args = argparser.parse_args()

shell = args.js_shell;
jsfile = args.js_file;
output = args.output_name;

retrieveData = shell+" -f "+jsfile+" -e 'print(JSON.stringify(data))'"
tree = shell+" -f "+jsfile+" -f reduce-tree.js"
corr = shell+" -f "+jsfile+" -f reduce-correction.js"

print "Get data information"
jsondata = subprocess.check_output(retrieveData, shell=True)
data = json.loads(jsondata)

print tree
treeOutput = subprocess.check_output(tree, shell=True)
treeFile = open(output+'.tree.tl', 'wb')
for i in treeOutput.split("\n"):
  if i != "":
    treeFile.write(struct.pack('>c', chr(int(i))))
treeFile.close()

print corr
corrOutput = subprocess.check_output(corr, shell=True)
corrFile = open(output+'.corrections.js', 'wb')
corrFile.write(corrOutput);
corrFile.close()

print "copy textmap"
shutil.copyfile(data["dict"], output+".dict.js")

print "writing js file"
data["corrections"] = output+'.corrections.js'
data["tree"] = output+'.tree.tl'
data["dict"] = output+'.dict.js'

dump = open(output+".js", "w")
dump.write("var data="+json.dumps(data))
dump.close()
