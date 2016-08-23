import argparse
import json
import shutil
import os
from os.path import abspath, basename, dirname

argparser = argparse.ArgumentParser(description='Rename the files.')
argparser.add_argument('js_file',
                       help='the js file to parse, or a directory containing tl-data.json')
argparser.add_argument('new_name',
                       help='the new js file name (and/or path), without the .json')
args = argparser.parse_args()

# Example:
#  python rename.py tl-data.json myname
#   - renames whatever tl-data.json points to in cwd to myname, re-points tl-data.json at it.
#  python rename.py oldname.json newname
#   - renames oldname to newname
#  python rename.py /some/path /new/path
#   - renames whatever /some/path/tl-data.json points to, to /new/path/<name>.json (the name
#     is taken from the contents of /some/path/tl-data.json)

jsfile = abspath(args.js_file)
if os.path.isdir(jsfile):
    jsfile = os.path.join(jsfile, "tl-data.json")

datapwd = dirname(jsfile)

# Get the data information
with open(jsfile, "r") as fp:
    data = json.load(fp)

# If the user gave the tl-data.json redirection file, load what it points to.
redir_file = None
if not isinstance(data, list):
    redir_file = jsfile
    print("Have redir file = " + redir_file)
    jsfile = data
    with open(jsfile, "r") as fp:
        data = json.load(fp)

# The new name is assumed to be in the jsfile's directory, unless it is given
# as a directory itself, in which case it will be placed in the given directory
# under the basename of the jsfile.
if os.path.isdir(args.new_name):
    new_name = os.path.join(args.new_name, basename(jsfile))
    new_name, _ = os.path.splitext(new_name)
else:
    new_name = os.path.join(datapwd, args.new_name)

for j in range(len(data)):
    tree = new_name+".tree."+str(j)+".tl"
    shutil.move(datapwd+"/"+data[j]["tree"], tree)
    data[j]["tree"] = basename(tree)

    events = new_name+".event."+str(j)+".tl"
    shutil.move(datapwd+"/"+data[j]["events"], events)
    data[j]["events"] = basename(events)

    ndict = new_name+".dict."+str(j)+".json"
    shutil.move(datapwd+"/"+data[j]["dict"], ndict)
    data[j]["dict"] = basename(ndict)

# Create new jsfile
with open(new_name+".json", "w") as fp:
    json.dump(data, fp)
print("Wrote %s.json" % new_name)

# Recreate the redirection file in the destination directory, if we used a
# redirection file in the first place.
if redir_file:
    new_redir_file = os.path.join(dirname(new_name), "tl-data.json")
    print("Writing " + new_redir_file)
    with open(new_redir_file, "w") as fp:
        fp.write("\"%s.json\"" % basename(new_name))
    os.remove(redir_file)

# If everything went ok, remove the original.
os.remove(jsfile)
