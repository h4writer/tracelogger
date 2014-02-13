import argparse

argparser = argparse.ArgumentParser(description='Filter the init. of selfhosting out of a log.')
argparser.add_argument('logfile', help='the logfile to parse')
argparser.add_argument('-o', '--outfile', default="stdout", help='the name of the log output file')
args = argparser.parse_args()

# process input file
fi = open(args.logfile, 'r')

# process output file
if args.outfile == "stdout":
    fo = sys.stdout
elif args.outfile == "stderr":
    fo = sys.stderr
else:
    fo = open(args.outfile, 'w')

class Filter:
    def __init__(self):
        # The text in the logfile needs to be renumbered when removing parts.
        # Hold an array with the old text and a dictionary having the new id
        self.old_textmap = ["bad"]
        self.new_textmap = {}
        self.last_num = 1

        self.filtering = False
        self.depth = 0
        self.stop_depth = -1

    def filterSubTree(self, line):
        if self.depth != 0:
            return False
        if "ps,self-hosted,1" in line: 
            return True
        if "s,self-hosted,1" in line: 
            return True 
        return False

    def process(self, fo, line):
        splitted = line.split(",")

        # Fetch the text
        if len(splitted) > 3:
            if splitted[3].isdigit():
                splitted[3] = self.old_textmap[int(splitted[3])]
            else:
                self.old_textmap.append(splitted[3])

        # Decide to start filtering
        if not self.filtering and self.filterSubTree(",".join(splitted)):
            self.filtering = True
            self.stop_depth = self.depth

        # Write out line (if it is not getting filtered)
        if not self.filtering:
            if len(splitted) > 3:
                if splitted[3] in self.new_textmap:
                    splitted[3] = self.new_textmap[splitted[3]]
                else:
                    self.new_textmap[splitted[3]] = str(self.last_num);
                    self.last_num += 1 
            fo.write(",".join(splitted)) 

        # Set system
        if splitted[1] == "1":
            self.depth += 1
        if splitted[1] == "0":
            self.depth -= 1
            if self.depth == self.stop_depth:
                self.filtering = False
                self.stop_depth = -1

    def run(self, fi, fo):
        for line in fi:
            self.process(fo, line)

filter = Filter()
filter.run(fi, fo)
