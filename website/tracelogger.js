var baseUrl = "./";

function GetUrlValue(VarSearch){
    var SearchString = window.location.search.substring(1);
    var VariableArray = SearchString.split('&');
    for(var i = 0; i < VariableArray.length; i++){
        var KeyValuePair = VariableArray[i].split('=');
        if(KeyValuePair[0] == VarSearch){
            return KeyValuePair[1];
        }
    }
}

function request (files, callback) {
    var count = 0;
    var received = new Array(files.length);

    for (var i = 0; i < files.length; i++) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', baseUrl + files[i], true);
        if (files[i].substring(files[i].length-3) == ".tl")
            xhr.responseType = 'arraybuffer';
        xhr.onload = (function (index) {
            return function (data, textStatus, jqXHR) {
                received[index] = this.response;
                count++;
                if (count == files.length)
                    callback(received);
            };
        })(i);
        xhr.send();
    }
}

var data = undefined;
var tree = undefined;
var page = undefined;
var textmap = undefined;
var buffer = undefined;
var corrections = undefined;
var url = GetUrlValue("data");
if (/^[a-zA-Z0-9-.]*$/.test(url)) {

  request([url], function (answer) {
    var json = answer[0];
    var pos = json.indexOf("=");
    json = json.substr(pos+1);

    data = JSON.parse(json)[1];

    var pages = [];
    pages[0] = data.dict;
    pages[1] = data.tree;
    if (data.corrections)
        pages[2] = data.corrections;

    request(pages, function (answer) {
      textmap = JSON.parse(answer[0]);
      buffer = answer[1];
      if (answer.length == 3)
        corrections = JSON.parse(answer[2]);

      tree = new DataTree(buffer, textmap);
      page = new Page();
      page.init()
    });
  });
}


function percent(double) {
  return Math.round(double*10000)/100;
}

function DrawCanvas(dom, tree) {
  this.dom = dom;
  this.ctx = dom.getContext("2d");
  this.tree = tree;
  this.line_height = 10;
  this.start = this.tree.start(0);
  this.duration = this.tree.stop(0) - this.start;

  this.drawQueue = []
  this.drawThreshold = 1
}

DrawCanvas.prototype.drawItem = function(id) {
  var start = this.tree.start(id) - this.start;
  var stop = this.tree.stop(id) - this.start;
  var color = this.color(this.tree.text(id));

  if (!this.drawRect(start, stop, color)) {
    this.futureDrawQueue[this.futureDrawQueue.length] = id
    return;
  }

  var childs = this.tree.childs(id);
  for (var i = 0; i < childs.length; i++) {
    this.drawItem(childs[i]);
  }
}

DrawCanvas.prototype.drawRect = function(start, stop, color) {
  var x_start = start * this.conversion;
  var y_start = Math.floor(x_start / this.width) * this.line_height;
  x_start = x_start % this.width;

  var x_stop = stop * this.conversion;
  var y_stop = Math.floor(x_stop / this.width) * this.line_height;
  x_stop = x_stop % this.width;


  this.ctx.fillStyle = color;
  if (y_start == y_stop) {
    if (x_stop - x_start < this.drawThreshold)
      return false;

    this.ctx.fillRect(x_start, y_start, x_stop - x_start, this.line_height);
    return true;
  }

  this.ctx.fillRect(x_start, y_start, this.width - x_start, this.line_height);
  for (var i = y_start + this.line_height; i < y_stop; i += this.line_height) {
    this.ctx.fillRect(0, i, this.width, this.line_height);
  }
  this.ctx.fillRect(0, y_stop, x_stop, this.line_height);
  return true;
}

DrawCanvas.prototype.color = function (info) {
  if (info == "IonCompilation")
    return "green";
  if (info == "IonLinking")
    return "green";

  if (info == "YarrCompile")
    return "#BE8CFF";
  if (info == "YarrJIT")
    return "#BE8CFF";
  if (info == "YarrInterpreter")
    return "#BE8CFF";

  if (info == "MinorGC")
    return "#CCCCCC";

  if (info == "GC")
    return "#666666";

  if (info == "Interpreter")
    return "#FFFFFF";
  if (info == "Baseline")
    return "#FFE75E";
  if (info == "IonMonkey")
    return "#54D93D";

  if (info == "ParserCompileScript")
      return "#DB0000";
  if (info == "ParserCompileLazy")
      return "#A30000";
  if (info == "ParserCompileFunction")
      return "#CC8585";

  return "white";
}

DrawCanvas.prototype.backtraceAtPos = function (x, y) {
  var tick = Math.floor(y / this.line_height) * this.width + x;
  tick = tick / this.conversion;
  tick += this.start;

  var id = 0;
  var bt = []
  var found = true;

  while (found) {
    found = false;

    var childs = this.tree.childs(id);
    for (var i = 0; i < childs.length; i++) {
      if (this.tree.start(childs[i]) <= tick && this.tree.stop(childs[i]) > tick) {
        id = childs[i]
        bt[bt.length] = this.tree.text(id);
        found = true
        break;
      }
    }
  }

  return bt;
}

DrawCanvas.prototype.draw = function() {
  this.width = this.dom.width;
  this.height = Math.floor(this.dom.height / this.line_height) * this.line_height;
  this.length_ = this.width * this.height / this.line_height;
  this.conversion = this.length_ / this.duration;

  this.drawThreshold = 5
  this.drawQueue = this.tree.childs(0);
  this.futureDrawQueue = []

  clearTimeout(this.timer);
  this.timer = setTimeout(DrawCanvas.prototype.drawQueue.bind(this), 1);
}

DrawCanvas.prototype.drawQueue = function() {
  var queue = this.drawQueue.splice(0,10000);
  for (var i=0; i<queue.length; i++) {
    this.drawItem(queue[i])
  }

  if (this.drawQueue.length > 0) {
    this.timer = setTimeout(DrawCanvas.prototype.drawQueue.bind(this), 1);
    return;
  }

  if (this.futureDrawQueue.length > 0) {
    this.drawQueue = this.futureDrawQueue;
    this.futureDrawQueue = []
    if (this.drawThreshold < 0.05)
      return;
    this.drawThreshold = this.drawThreshold / 2
    this.timer = setTimeout(DrawCanvas.prototype.drawQueue.bind(this), 1);
    return;
  }
}

function translate(info) {
  info = info.split(",")
  info[0] = translateSubject(info[0]);
  return info.join(", ")
}

function translateSubject(subject) {
  switch(subject) {
    case "i": return "interpreter";
    case "b": return "baseline";
    case "o": return "ionmonkey";
    case "pl": return "lazy parsing";
    case "ps": return "script parsing";
    case "pF": return "'Function' parsing";
    case "s": return "script";
    case "G": return "GC";
    case "g": return "Minor GC";
    case "gS": return "GC sweeping";
    case "gA": return "GC allocating";
    case "r": return "regexp";
    case "c": return "IM compilation";
  }
}

function translateScript(script) {
  var arr = script.split("/");
  return "<span title='"+script+"'>"+arr[arr.length-1]+"</span>";
}

function Page() {}
Page.prototype.init = function() {
  this.initGraph()
  this.initOverview()
}

Page.prototype.initGraph = function() {
  this.canvas = new DrawCanvas(document.getElementById("myCanvas"), tree);
  this.resize();
  window.onresize = this.resize.bind(this);
  this.canvas.dom.onclick = this.clickCanvas.bind(this);
}

Page.prototype.resize = function() {
  this.canvas.dom.width = (document.body.clientWidth - 350)
  this.canvas.draw();
}

Page.prototype.initOverview = function() {
  this.overview = new Overview(tree, {
    chunk_cb: Page.prototype.computeOverview.bind(this)
  });

  if (typeof data.corrections != "undefined") {
    this.overview.engineOverview = corrections.engineOverview;
    this.overview.scriptOverview = corrections.scriptOverview;
    this.overview.scriptTimes = corrections.scriptTimes;
  }

  this.overview.init();
}

Page.prototype.computeOverview = function () {
  var dom = document.getElementById("engineOverview");
  var output = "<h2>Engine Overview</h2>"+
               "<table><tr><td>Engine</td><td>Percent</td>";

  var total = 0;
  for (var i in this.overview.engineOverview) {
    total += this.overview.engineOverview[i];
  }

  for (var i in this.overview.engineOverview) {
    output += "<tr><td>"+i+"</td><td>"+percent(this.overview.engineOverview[i]/total)+"%</td></tr>";
  }
  output += "</table>";
  dom.innerHTML = output;

  dom = document.getElementById("scriptOverview");
  var output = "<h2>Script Overview</h2>"+
               "<table><tr><td>Script</td><td>Times called</td><td>Times compiled</td><td>Total time</td><td>Spend time</td></tr>";
  for (var script in this.overview.scriptOverview) {
    if (!this.overview.scriptTimes[script]["IonCompilation"])
      this.overview.scriptTimes[script]["IonCompilation"] = 0
    output += "<tr><td>"+script+"</td><td>"+this.overview.scriptTimes[script][script]+"</td><td>"+this.overview.scriptTimes[script]["IonCompilation"]+"</td><td>";
    var script_total = 0;
    for (var j in this.overview.scriptOverview[script]) {
      if (j != script)
          script_total += this.overview.scriptOverview[script][j];
    }
    output += percent(script_total/total)+"%</td><td>";
    for (var j in this.overview.scriptOverview[script]) {
      if (j != script)
        output += ""+j+": "+percent(this.overview.scriptOverview[script][j]/script_total)+"%, ";
    }
    output += "</td></tr>"
  }
  output += "</table>"
  dom.innerHTML = output;
}

Page.prototype.clickCanvas = function(e) {
    var posx = 0;
    var posy = 0;
    if (!e) var e = window.event;
    if (e.offsetX || e.offsetY) {
        posx = e.offsetX;
        posy = e.offsetY;
    }
    else if (e.layerX || e.layerY) {
        posx = e.layerX;
        posy = e.layerY;
    }

    var backtrace = this.canvas.backtraceAtPos(posx, posy);
    var output = "";
    for (var i=0; i < backtrace.length; i++) {
      var info = backtrace[i]

      if (info.substring(0,6) == "script")
        output += translateScript(info.substring(6)) + "<br />"
      else 
        output += info + "<br />"
    }

    document.getElementById("backtrace").innerHTML = output;
}
