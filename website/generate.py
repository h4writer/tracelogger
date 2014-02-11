import tools
import calendar
import json

db = tools.db

c = db.cursor()

full_subject = {
  "g": "Minor GC",
  "G": "GC",
  "ps": "Script parsing",
  "pl": "Lazy parsing",
  "pF": "Function parsing",
  "c": "Ion compilation",
  "o": "Ion execution",
  "b": "Baseline execution",
  "i": "Interpreter",
  "r": "Yarr jitt execution"
}

# Create "front.js" file
data = {}

##  - engines
data["engines"] = []
c.execute("SELECT ID, name FROM EngineInfo")
for engine in c.fetchall():
  data["engines"].append({"ID": engine["ID"], "name": engine["name"]})

##  - script
data["suites"] = []
c.execute("SELECT distinct(suite) as name FROM ScriptInfo")
for suite in c.fetchall():
  scripts = []
  c.execute("SELECT ID, name FROM ScriptInfo WHERE suite = %s", (suite["name"],))
  for script in c.fetchall():
    scripts.append({"ID": script["ID"], "name": script["name"]})

  data["suites"].append({"name": suite["name"], "scripts": scripts})

fp = open(tools.dataPath + "/front.js", "w")
fp.write("var TLData = ")
json.dump(data, fp)
fp.write(";")
fp.close()

c.execute("SELECT ID FROM Run WHERE processed = 0 AND finished = 1")
if not c.fetchone():
  print "Nothing to update"
  exit()

# Create "front-[engine]-[suite].json" files
c.execute("SELECT ID FROM EngineInfo")
for engine in c.fetchall():

  c.execute("SELECT distinct(suite) as name FROM ScriptInfo")
  for suite in c.fetchall():
    data = {}

    c.execute("SELECT ID, submitDate FROM Run WHERE engineInfoID = %s and finished = 1 ORDER BY submitDate", (engine["ID"],))
    for run in c.fetchall():
      timestamp = calendar.timegm(run["submitDate"].utctimetuple())*1000
      
      c.execute("SELECT subject, suite, sum(score) as score "
                "FROM Score LEFT JOIN ScriptInfo ON Score.scriptInfoId = ScriptInfo.ID "
                "WHERE runId = %s AND suite = %s GROUP BY subject ORDER BY subject ",
                (run["ID"], suite["name"]))
      for score in c.fetchall():
        subject = score["subject"]
        if subject == "s":
          continue
        if subject not in data:
          data[subject] = []

        data[subject].append((timestamp, int(score["score"])))

    output = []
    for subject in data:
      output.append({"label": full_subject[subject]+" = XX.XX%", "data": data[subject]})

    fp = open(tools.dataPath + "/front-"+str(engine["ID"])+"-"+suite["name"]+".json", "w")
    json.dump(output, fp)
    fp.close()

# Create "front-[engine]-[suite]-[script].json" files
c.execute("SELECT ID FROM EngineInfo")
for engine in c.fetchall():

  c.execute("SELECT ID, suite, name FROM ScriptInfo")
  for script in c.fetchall():
    data = {}

    c.execute("SELECT ID, submitDate FROM Run WHERE engineInfoID = %s and finished = 1 ORDER BY submitDate", (engine["ID"], ))
    for run in c.fetchall():
      timestamp = calendar.timegm(run["submitDate"].utctimetuple())*1000
      
      c.execute("SELECT subject, score FROM Score WHERE runId = %s AND scriptInfoId = %s ORDER BY subject", (run["ID"], script["ID"]))
      for score in c.fetchall():
        subject = score["subject"]
        if subject == "s":
          continue
        if subject not in data:
          data[subject] = []

        data[subject].append((timestamp, int(score["score"])))

    output = []
    for subject in data:
      output.append({"label": full_subject[subject]+" = XX.XX%", "data": data[subject]})

    fp = open(tools.dataPath + "/front-"+str(engine["ID"])+"-"+script["suite"]+"-"+script["name"]+".json", "w")
    json.dump(output, fp)
    fp.close()


c.execute("UPDATE Run SET processed = 1 WHERE finished = 1");
db.commit()


