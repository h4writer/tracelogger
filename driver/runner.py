import subprocess
import urllib
import json
import datetime
import utils

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
            logfile = self.rename(logfile, script)
            reduced = self.reduce(logfile)
            self.submitOverview(reduced, script)
            self.clean()

    def clean(self):
        # Clean the tmp dir
        print utils.run("rm /tmp/tracelogging* -f")
        print utils.run("cd "+self.output_dir+"; gzip -f *.tl")
        print utils.run("cd "+self.output_dir+"; gzip -f *.js")
        print utils.run("cd "+self.output_dir+"; gzip -f *.json")

    def rename(self, logfile, script):
        nlogfile = "data-"+self.suite
        nlogfile += "-"+self.engine.name
        nlogfile += "-"+script+"-"+self.revision;
        print utils.run("pypy "+self.toolsv2+"/rename.py "+logfile+" "+self.output_dir+"/"+nlogfile);
        return nlogfile+".json"

    def reduce(self, logfile):
        # Reduce logfile to make suitable for web
        start, end = logfile.rsplit(".")
        reduced = start+"-reduced"
        print utils.run("cd "+self.output_dir+"; pypy "+self.toolsv2+"/reduce.py "+self.normaljs+" "+logfile+" "+reduced);
        return reduced+".json"

    def submitOverview(self, logfile, script):
        # Create and submit overview
        result =  utils.run("cd "+self.output_dir+"; pypy "+self.toolsv2+"/overview.py "+self.normaljs+" "+logfile);
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
                'gbemu',
                'code-load',
                'box2d',
                'typescript',
                'zlib']

    def run_script(self, script):
        print utils.run("cd "+self.benchmarks+"/octane; TLOPTIONS=DisableMainThread "+self.engine.js+" -e 'startTraceLogger();' -f run-"+script+".js")
        return "/tmp/tl-data.json"

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
        print utils.run("cd "+self.benchmarks+"/SunSpider/tests/sunspider-1.0.1; TLOPTIONS=DisableMainThread "+self.engine.js+" -e 'startTraceLogger();' -f "+script+".js")
        return "/tmp/tl-data.json"

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
        print utils.run("cd "+self.benchmarks+"/PeaceKeeper; TLOPTIONS=DisableMainThread "+self.engine.js+" -e 'startTraceLogger();' -f "+script+".js")
        return "/tmp/tl-data.json"
