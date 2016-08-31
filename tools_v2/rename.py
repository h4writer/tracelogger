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
argparser.add_argument('--keep', action='store_true',
                       help='do not remove the original files')
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
    jsfile = os.path.join(dirname(jsfile), data)
    with open(jsfile, "r") as fp:
        data = json.load(fp)

# args.new_name is ambiguous. If it is given as a path foo/bar, then it is
# assumed to be a new directory foo/ (underneath cwd) with files named
# bar.json. If it is a single component (no slashes), then it is treated
# as a directory if it exists, otherwise it is a name within the source
# directory.
if '/' in args.new_name:
    new_name = args.new_name
    if basename(new_name) == '':  # foo/bar/
        new_name = os.path.join(new_name, basename(jsfile))
elif os.path.isdir(args.new_name):
    new_name = os.path.join(args.new_name, basename(jsfile))
else:
    new_name = os.path.join(dirname(jsfile), args.new_name)

# Strip off the .json if we inherited one from the source.
new_name, _ = os.path.splitext(new_name)

# Create the output directory if needed.
try:
    os.makedirs(dirname(new_name))
except OSError:
    pass

action = shutil.copy if args.keep else shutil.move

for j in range(len(data)):
    tree = new_name+".tree."+str(j)+".tl"
    action(datapwd+"/"+data[j]["tree"], tree)
    data[j]["tree"] = basename(tree)

    events = new_name+".event."+str(j)+".tl"
    action(datapwd+"/"+data[j]["events"], events)
    data[j]["events"] = basename(events)

    ndict = new_name+".dict."+str(j)+".json"
    action(datapwd+"/"+data[j]["dict"], ndict)
    data[j]["dict"] = basename(ndict)

    if "corrections" in data[j]:
        corrections = new_name+".corrections."+str(j)+".json"
        action(datapwd+"/"+data[j]["corrections"], corrections)
        data[j]["corrections"] = basename(corrections)

# Create new jsfile
with open(new_name+".json", "w") as fp:
    json.dump(data, fp)
print("Wrote %s.json" % new_name)

# Recreate the redirection file in the destination directory, if we used a
# redirection file in the first place.
if redir_file:
    if not args.keep:
        os.remove(redir_file)
    new_redir_file = os.path.join(dirname(new_name), "tl-data.json")
    print("Writing " + new_redir_file)
    with open(new_redir_file, "w") as fp:
        fp.write("\"%s.json\"" % basename(new_name))

# If everything went ok, remove the original.
if not args.keep:
    os.remove(jsfile)
