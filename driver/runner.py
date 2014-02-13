import subprocess
import urllib
import json
import datetime
import utils

def run(cmd):
    output = subprocess.check_output(cmd, shell=True)
    return output

class Runner:
    def __init__(self, suite, revision, engine, submitter, normaljs):
        
        self.output_dir = utils.config.get('main', 'logDir')
        self.toolsv1 = utils.config.get('main', 'toolsv1')
        self.toolsv2 = utils.config.get('main', 'toolsv2')
        self.benchmarks = utils.config.get('main', 'benchmarks')
        self.suite = suite
        self.revision = revision
        self.engine = engine
        self.normaljs = normaljs
        self.submitter = submitter

    def bench(self):
        for script in self.scripts():
            logfile = self.run_script(script)
            logfile = self.filter(logfile)
            logfile = self.convert(logfile, script)
            reduced = self.reduce(logfile)
            self.submitOverview(reduced, script)
            self.clean()

    def clean(self):
        # Clean the tmp dir
        print run("rm /tmp/tracelogging* -f")
        print run("cd "+self.output_dir+"; gzip *.tl")
        print run("cd "+self.output_dir+"; gzip *.js")

    def filter(self, logfile):
        # Filter self-hosting init. out of the logs
        nlogfile = "/tmp/tracelogging-filtered.log"
        print run("pypy "+self.toolsv1+"/filter_selfhosting.py "+logfile+" -o "+nlogfile);
        return nlogfile

    def convert(self, logfile, script):
        # Convert writen logfile to typedarray logfile
        nlogfile = "data-"+self.suite
        nlogfile += "-"+self.engine.name
        nlogfile += "-"+script+"-"+self.revision;
        print run("cd "+self.output_dir+"; pypy "+self.toolsv1+"/convert.py "+logfile+" -o "+nlogfile);
        return nlogfile+".js"

    def reduce(self, logfile):
        # Reduce logfile to make suitable for web
        start, end = logfile.rsplit(".")
        reduced = start+"-reduced"
        print run("cd "+self.output_dir+"; pypy "+self.toolsv2+"/reduce.py "+self.normaljs+" "+logfile+" "+reduced);
        return reduced+".js"

    def submitOverview(self, logfile, script):
        # Create and submit overview
        result = run("cd "+self.output_dir+"; "+self.normaljs+" -f "+logfile+" -f "+self.toolsv2+"/overview.js")
        result = json.loads(result)["engineOverview"];
        for subject in result:
            print subject, result[subject]

            self.submitter.SubmitScore(self.suite, script, subject, result[subject])

class OctaneRunner(Runner):
    def __init__(self, revision, engine, submitter, normaljs):
        Runner.__init__(self, "Octane", revision, engine, submitter, normaljs) 
    
    def scripts(self):
        return ['richards',
                'deltablue',
                'crypto',
                'raytrace',
                #'earley-boyer', #currently disabled since too much data
                'regexp',
                'splay',
                'navier-stokes',
                'pdfjs',
                'mandreel',
                #'gbemu', #fails currently
                'code-load',
                'box2d']

    def run_script(self, script):
        print run("cd "+self.benchmarks+"/octane; "+self.engine.js+" --ion-parallel-compile=on run-"+script+".js")
        return "/tmp/tracelogging.log"

class SSRunner(Runner):
    def __init__(self, revision, engine, submitter, normaljs):
        Runner.__init__(self, "Sunspider", revision, engine, submitter, normaljs) 
    
    def scripts(self):
        return [
            "3d-cube",
            "access-binary-trees",
            "access-nsieve",
            "bitops-bitwise-and",
            "crypto-aes",
            "date-format-tofte",
            "math-cordic",
            "regexp-dna",
            "string-tagcloud",
            "3d-morph",
            "access-fannkuch",
            "bitops-3bit-bits-in-byte",
            "bitops-nsieve-bits",
            "crypto-md5",
            "date-format-xparb",
            "math-partial-sums",
            "string-base64",
            "string-unpack-code",
            "3d-raytrace",
            "access-nbody",
            "bitops-bits-in-byte",
            "controlflow-recursive",
            "crypto-sha1",
            "math-spectral-norm",
            "string-fasta",
            "string-validate-input"]

    def run_script(self, script):
        print run("cd "+self.benchmarks+"/SunSpider/tests/sunspider-1.0.1; "+self.js+" --ion-parallel-compile=on "+script+".js")
        return "/tmp/tracelogging.log"

class PeaceKeeperRunner(Runner):
    def __init__(self, revision, engine, submitter, normaljs):
        Runner.__init__(self, "PeaceKeeper", revision, engine, submitter, normaljs) 
    
    def scripts(self):
        return [
            "arrayCombinedExtra",
            "arrayCombined",
            "arrayWeighted",
            "stringFilter",
            "stringValidateForm",
            "stringWeighted"]

    def run_script(self, script):
        print run("cd "+self.benchmarks+"/PeaceKeeper; "+self.engine.js+" --ion-parallel-compile=on "+script+".js")
        return "/tmp/tracelogging.log"
