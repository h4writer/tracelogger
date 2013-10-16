var tree = undefined;
var page = undefined;
var textmap = undefined;

var xhr = new XMLHttpRequest();
xhr.open('GET', data["dict"], true);

xhr.onload = function(e) {
  textmap = JSON.parse(this.response);

  var xhr = new XMLHttpRequest();
  xhr.open('GET', data["tree"], true);
  xhr.responseType = 'arraybuffer';

  xhr.onload = function(e) {
    tree = new DataTree(this.response);
    page = new Page();
    page.init()
  };

  xhr.send();
};

xhr.send();


function DataTree(buffer) {
  this.buffer = buffer;
  this.view = new DataView(buffer);
  /* Tree is saved like:
   *
   * [position: start, stop, textId, hasChilds, nextId]
   *
   * - position: is the position in the binary file (is not saved, reported here to understand the tree better).
   * - start: a timestamp
   * - stop: a timestamp
   * - textId: refers to the information
   * - hasChilds: if this leaf has a child (if it does, the first child is located at position+1)
   * - nextId: refers to the next child of the parent node.
   *
   *                                          [0: ..., ..., ..., 1, 0]
   *                                           |
   *                     [1: ..., ..., ..., 1, 10] ---> [10: ..., ..., ..., 1, 12] ---> [12: ..., ..., ..., 0, 0]
   *                       |                             |
   *  [2: ..., ..., ..., 1, 2]                    [11: ..., ..., ..., 0, 0]
   *   |
   *  ...
   *
   * default layout:
   * start: 64bits
   * stop: 64bits
   * textId: 31bits
   * hasChilds: 1bit
   * nextId: 32bits
   */
  this.itemSize = 8+8+4+4;
}

DataTree.prototype.head = function() {
  return 0;
}

DataTree.prototype.start = function(id) {
  var p1 = this.view.getUint32(id * this.itemSize);
  var p2 = this.view.getUint32(id * this.itemSize + 4);
  return p1*4294967295+p2
}

DataTree.prototype.stop = function(id) {
  var p1 = this.view.getUint32(id * this.itemSize + 8);
  var p2 = this.view.getUint32(id * this.itemSize + 12);
  return p1*4294967295+p2
}

DataTree.prototype.textId = function(id) {
  var value = this.view.getUint32(id * this.itemSize + 16);
  return value >>> 1
}

DataTree.prototype.nextId = function(id) {
  return this.view.getUint32(id * this.itemSize + 20);
}

DataTree.prototype.hasNextId = function(id) {
  return this.nextId(id) != 0;
}

DataTree.prototype.hasChilds = function(id) {
  var value = this.view.getUint32(id * this.itemSize + 16);
  return value%2 == 1
}

DataTree.prototype.firstChild = function(id) {
  return id + 1;
}

DataTree.prototype.childs = function(id) {
  if (!this.hasChilds(id))
    return [];

  var childs = []  
  var i = this.firstChild(id);
  while (true) {
    childs[childs.length] = i;

    if (!this.hasNextId(i))
      break;

    i = this.nextId(i);
  }
  return childs;
}

function percent(double) {
  return Math.round(double*10000)/100;
}

function DrawCanvas(dom, tree) {
  this.dom = dom;
  this.ctx = dom.getContext("2d");
  this.tree = tree;
  this.line_height = 10;
  this.duration = this.tree.stop(0);

  this.drawQueue = []
  this.drawThreshold = 1
}

DrawCanvas.prototype.drawItem = function(id) {
  var start = this.tree.start(id);
  var stop = this.tree.stop(id);
  var color = this.color(textmap[this.tree.textId(id)]);

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
  var letter = info.substr(0,1);
  if (letter == "s") {
    return "#FFFFFF";
  }

  if (letter == "c")
    return "green";

  if (letter == "r")
    return "#BE8CFF";

  if (letter == "g")
    return "#CCCCCC";

  if (letter == "G")
    return "#666666";

  if (letter == "i")
    return "#FFFFFF";
  if (letter == "b")
    return "#FFE75E";
  if (letter == "o")
    return "#54D93D";

  if (letter == "p") {
    var type = info.substr(1,1);
    if (type == "s")
      return "#DB0000";
    if (type == "l")
      return "#A30000";
    if (type == "f")
      return "#CC8585";
  }

  return "white";
}

DrawCanvas.prototype.backtraceAtPos = function (x, y) {
  var tick = Math.floor(y / this.line_height) * this.width + x;
  tick = tick / this.conversion;

  var id = 0;
  var bt = []
  var found = true;

  while (found) {
    found = false;

    var childs = this.tree.childs(id);
    for (var i = 0; i < childs.length; i++) {
      if (this.tree.start(childs[i]) <= tick && this.tree.stop(childs[i]) > tick) {
        id = childs[i]
        bt[bt.length] = textmap[this.tree.textId(id)];
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
  this.initEngineOverview()
  this.initScriptOverview()
}
Page.prototype.initGraph = function() {
  this.canvas = new DrawCanvas(document.getElementById("myCanvas"), tree);
  this.resize();
  window.onresize = this.resize.bind(this);
  this.canvas.dom.onclick = this.clickCanvas.bind(this);
}
Page.prototype.initEngineOverview = function() {
  this.engineOverview = {}
  this.scriptOverview = {}
  this.scriptTimes = {}
  
  this.processQueue = [["",0]]
  this.futureProcessQueue = []
  this.processThreshold = (tree.stop(0) - tree.start(0));
  this.processOverviewQueue();
}
Page.prototype.initScriptOverview = function() {
  
}
Page.prototype.processOverviewQueue = function () {
  var queue = this.processQueue.splice(0,10000);
  for (var i=0; i<queue.length; i++) {
    this.computeOverview(queue[i][0], queue[i][1])
  }

  var dom = document.getElementById("engineOverview");
  var output = "<h2>Engine Overview</h2>"+
               "<table><tr><td>Engine</td><td>Percent</td>";

  var total = 0;
  for (var i in this.engineOverview) {
    total += this.engineOverview[i];
  }

  for (var i in this.engineOverview) {
    output += "<tr><td>"+translateSubject(i)+"</td><td>"+percent(this.engineOverview[i]/total)+"%</td></tr>";
  }
  output += "</table>";
  dom.innerHTML = output;

  dom = document.getElementById("scriptOverview");
  var output = "<h2>Script Overview</h2>"+
               "<table><tr><td>Script</td><td>Times called</td><td>Times compiled</td><td>Total time</td><td>Spend time</td></tr>";
  for (var script in this.scriptOverview) {
    output += "<tr><td>"+translateScript(script)+"</td><td>"+this.scriptTimes[script]["s"]+"</td><td>"+this.scriptTimes[script]["c"]+"</td><td>";
    var script_total = 0;
    for (var j in this.scriptOverview[script]) {
      script_total += this.scriptOverview[script][j];
    }
    output += percent(script_total/total)+"%</td><td>";
    for (var j in this.scriptOverview[script]) {
      output += ""+translateSubject(j)+": "+percent(this.scriptOverview[script][j]/script_total)+"%, ";
    }
    output += "</td></tr>"
  }
  output += "</table>"
  dom.innerHTML = output;

  if (this.processQueue.length > 0) {
    this.timer = setTimeout(Page.prototype.processOverviewQueue.bind(this), 1);
    return;
  }

  if (this.futureProcessQueue.length > 0) {
    this.processQueue = this.futureProcessQueue;
    this.futureProcessQueue = []
    this.processThreshold = this.processThreshold / 2
    this.timer = setTimeout(Page.prototype.processOverviewQueue.bind(this), 1);
    return;
  }
}
Page.prototype.computeOverview = function(script, id) {
  var time = tree.stop(id) - tree.start(id);
  var info = textmap[tree.textId(id)].split(",");

  if (info[0] == "G" || info[0] == "g")
    script = "";
  else if (info[0] == "c" || info[0] == "ps" || info[0] == "pf" || info[0] == "pl" || info[0] == "s")
    script = info[1]+":"+info[2];

  if (time < 0)
    throw "negative time";

  var childs = tree.childs(id);
  for (var i = 0; i < childs.length; i++) {
    var childTime = tree.stop(childs[i]) - tree.start(childs[i]);
    time -= childTime;

    if (childTime < this.processThreshold) {
      this.futureProcessQueue[this.futureProcessQueue.length] = [script, childs[i]]
    } else {
      this.computeOverview(script, childs[i])
    }

    if (time < 0)
      throw "negative time";
  }

  if (time > 0) {
    if (!this.engineOverview[info[0]])
      this.engineOverview[info[0]] = 0
    this.engineOverview[info[0]] += time;
  }

  if (script != "") {
    if (!this.scriptOverview[script]) {
      this.scriptOverview[script] = {};
      this.scriptTimes[script] = {"c":0, "s":0};
    }
    if (info[0] == "c" || info[0] == "s")
      this.scriptTimes[script][info[0]] += 1;
    if (info[0] != "s") {
      if (!this.scriptOverview[script][info[0]])
        this.scriptOverview[script][info[0]] = 0;
      this.scriptOverview[script][info[0]] += time;
    }
  }
}
Page.prototype.resize = function() {
  this.canvas.dom.width = (document.body.clientWidth - 350)
  this.canvas.draw();
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
      var info = backtrace[i].split(",")
      if (info[0] == "s" || info[0] == "c" || info[0] == "pl" || info[0] == "ps" || info[0] == "pF") {
        var out = translate(backtrace[i]).split(", ")
        out[1] = translateScript(out[1]);
        output += out.join(", ")+"<br />";

        if (backtrace[i].substring(0,1) == "s")
          i++;
      } else {
        output += translate(backtrace[i])+"<br />";
      }
    }
    document.getElementById("backtrace").innerHTML = output;
}
