if (!baseUrl)
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
    return "";
}

function request (files, callback, error_cb) {
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
        if (error_cb) {
            xhr.onerror = (function (file) {
                return function (data, textStatus, jqXHR) {
                    error_cb(baseUrl + file);
                };
            })(files[i]);
        }
        xhr.send();
    }
}

function percent(double) {
  return Math.round(double*10000)/100;
}

function SelectionCanvas(dom, fromCanvas) {
  this.dom = dom;
  this.ctx = dom.getContext("2d");

  this.fromCanvas = fromCanvas
  this.selectionStart = fromCanvas.start;
  this.selectionStop = fromCanvas.stop;
  this.strokeSize = 5
}

SelectionCanvas.prototype.updateStart = function(start) {
    this.selectionStart = start;
}
SelectionCanvas.prototype.updateStop = function(stop) {
    this.selectionStop = stop;
}
SelectionCanvas.prototype.draw = function() {
  this.start = this.fromCanvas.start;
  this.stop = this.fromCanvas.stop;

  this.width = this.dom.width;
  this.height = this.dom.height;

  this.conversion = this.width / (this.stop - this.start)

  this.ctx.clearRect(0, 0, this.width, this.height);

  var startx = (this.selectionStart - this.start) * this.conversion
  var stopx = (this.selectionStop - this.start) * this.conversion
  this.ctx.beginPath();
  this.ctx.moveTo(0, this.height);
  this.ctx.lineTo(startx, this.strokeSize);
  this.ctx.lineTo(stopx, this.strokeSize);
  this.ctx.lineTo(this.width, this.height);
  this.ctx.stroke()

  this.ctx.fillRect(startx, 0, stopx - startx, this.strokeSize);
}

function DrawCanvas(dom, tree) {
  this.dom = dom;
  this.ctx = dom.getContext("2d");
  this.tree = tree;
  this.line_height = 10;
  this.start = this.tree.start(1);
  this.stop = this.tree.stop(0);
  this.duration = this.stop - this.start;
  this.hiddenList = [];

  for(var i=0; i<this.tree.textmap.length; i++) {
      if (this.tree.colors.getColor(this.tree.textmap[i]) == "white")
          this.hiddenList[i] = true;
  }

  this.drawQueue = []
  this.drawThreshold = 1
}

DrawCanvas.prototype.convert = function(x, y) {
    var tick = Math.floor(y / this.line_height) * this.width + x;
    tick = tick / this.conversion;
    tick += this.start;
    return tick;
}

DrawCanvas.prototype.show = function(textId) {
    this.hiddenList[textId] = false;
}
DrawCanvas.prototype.hide = function(textId) {
    this.hiddenList[textId] = true;
}
DrawCanvas.prototype.isHidden = function(textId) {
    return !!this.hiddenList[textId]
}

DrawCanvas.prototype.getStart = function() {
  return this.start;
}

DrawCanvas.prototype.updateStart = function(start) {
  this.start = start;
  this.duration = this.stop - this.start;
}

DrawCanvas.prototype.getStop = function() {
  return this.stop;
}

DrawCanvas.prototype.updateStop = function(stop) {
  this.stop = stop;
  this.duration = this.stop - this.start;
}

DrawCanvas.prototype.drawItem = function(id) {
  var start = this.tree.start(id) - this.start;
  var stop = this.tree.stop(id) - this.start;

  // Decide if we need to draw now.
  if (stop < 0)
      return;
  if (start > this.stop - this.start)
      return;
  if ((stop - start) < this.drawThreshold / this.conversion) {

      // Too small to draw.
      if ((stop - start) <= this.minDraw / this.conversion)
          return;

      // Draw in a later pass.
      this.futureQueue[this.futureQueue.length] = id
      return;
  }

  // Draw
  var color = this.tree.color(id);
  var textId = this.tree.textId(id);
  this.drawRect(start, stop, color, textId);

  // Draw children.
  var childs = this.tree.childs(id);
  for (var i = 0; i < childs.length; i++) {
    this.drawItem(childs[i]);
  }
}

DrawCanvas.prototype.drawRect = function(start, stop, color, textId) {
  var x_start = start * this.conversion;
  var y_start = Math.floor(x_start / this.width) * this.line_height;
  x_start = x_start % this.width;

  var x_stop = stop * this.conversion;
  var y_stop = Math.floor(x_stop / this.width) * this.line_height;
  x_stop = x_stop % this.width;


  this.ctx.fillStyle = color;
  if (y_start == y_stop) {
    if (!this.hiddenList[textId])
        this.ctx.fillRect(x_start, y_start, x_stop - x_start, this.line_height);
    return
  }

  if (!this.hiddenList[textId]) {
    this.ctx.fillRect(x_start, y_start, this.width - x_start, this.line_height);
    for (var i = y_start + this.line_height; i < y_stop; i += this.line_height) {
      this.ctx.fillRect(0, i, this.width, this.line_height);
    }
    this.ctx.fillRect(0, y_stop, x_stop, this.line_height);
  }
}

DrawCanvas.prototype.backtraceAtPos = function (x, y) {
  var tick = this.convert(x, y);
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

  this.ctx.clearRect(0, 0, this.width, this.height);

  this.drawThreshold = this.length_
  this.currentQueue = this.tree.childs(0);
  this.currentPos = 0;
  this.futureQueue = []
  this.minDraw = 0.05

  clearTimeout(this.timer);
  this.timer = setTimeout(DrawCanvas.prototype.drawQueue.bind(this), 1);
}

DrawCanvas.prototype.drawQueue = function() {
  var min = Math.min(this.currentPos + 100000, this.currentQueue.length)
  for (var i=this.currentPos; i < min; i++) {
    this.drawItem(this.currentQueue[i])
  }
  this.currentPos = min

  if (this.currentPos < this.currentQueue.length) {
    this.timer = setTimeout(DrawCanvas.prototype.drawQueue.bind(this), 1);
    return;
  }

  if (this.futureQueue.length > 0) {
    this.currentQueue = this.futureQueue;
    this.currentPos = 0;
    this.futureQueue = []
    if (this.drawThreshold < this.minDraw)
      return;
    this.drawThreshold = this.drawThreshold / 2
    this.timer = setTimeout(DrawCanvas.prototype.drawQueue.bind(this), 1);
    return;
  }
}

DrawCanvas.prototype.halt = function() {
    clearTimeout(this.timer);
}
DrawCanvas.prototype.proceed = function() {
    clearTimeout(this.timer);
    this.timer = setTimeout(DrawCanvas.prototype.drawQueue.bind(this), 1);
}

DrawCanvas.prototype.reset = function() {
  clearTimeout(this.timer);
  this.drawQueue = []
  this.futureQueue = []
}

function translateScript(script) {
  var arr = script.split("/");
  return "<span title='"+script+"'>"+arr[arr.length-1]+"</span>";
}

function Page() {
  this.settings = {
    relative: true,
    absoluteunit: 10000
  }
}

Page.prototype.init = function() {
  var url = GetUrlValue("data");
  if (/^\w+:\/\//.test(url))
      throw new Error("Loading logs from absolute URLs is disallowed for security reasons.");

  var pos = url.lastIndexOf("/");
  if (pos != -1) {
      baseUrl += url.substring(0, pos+1);
      url = url.substring(pos+1);
  }

  if (url.length == 0) {
      this.initFilesList()
      return;
  }

  this.loadFile(url);
}

Page.prototype.loadFile = function(url) {
  request([url], function (answer) {
    var json = answer[0];
    var pos = json.indexOf("=");
    json = json.substr(pos+1);

    try {
    var data = JSON.parse(json);
    } catch(e) {
        alert("Failed to load: "+baseUrl+url);
    }
    if (typeof data == "string") {
        this.loadFile(data);
    } else {
        this.data = data;
        this.initPopup()
        this.initSettings()
    }
 }.bind(this), function(file) {
     alert("Failed to load: "+file);
 });
}

Page.prototype.initFilesList = function() {
  this.filelist = document.createElement("div");
  this.filelist.className = "popup"
  this.filelist.innerHTML = "<h2>File list</h2><p>Select the file you want to examine.</p>"

  request(["/"], function (answer) {
      answer += "";
      if (/tl-data.json/.test(answer)) {
          this.filelist.innerHTML += "- Most recent trace: ";
          var div = document.createElement("div");
          div.innerHTML += "<a href='#'>tl-data.json</a>";
          div.onclick = function() {
              this.loadFile("tl-data.json");
              this.filelist.style.display = "none";
          }.bind(this)

          this.filelist.appendChild(div);
          var br = document.createElement("br");
          this.filelist.appendChild(br);
          var div = document.createElement("div");
          div.innerHTML += "- Older traces: ";
          this.filelist.appendChild(div);
      }

      var logs = answer.match(/tl-data.[0-9]*.json/g);
      for (var i=0; i<logs.length; i++) {
          if (i>0 &&logs[i] == logs[i-1])
              continue;
          ( function(i) {
              var div = document.createElement("div");
              div.innerHTML += "<a href='#'>"+logs[i]+"</a>";
              div.onclick = function() {
                  this.loadFile(logs[i]);
                  this.filelist.style.display = "none";
              }.bind(this)

              this.filelist.appendChild(div);
          }.bind(this))(i)
      }
      var br = document.createElement("br");
      this.filelist.appendChild(br);
  }.bind(this), function(file) {
      alert("Couldn't contact "+file+". Is the server running?");
  });

  document.body.appendChild(this.filelist);
}

Page.prototype.initPopup = function() {

  var a = document.createElement("a");
  a.innerHTML = "show thread list";
  a.href = "#";
  a.className = "nav";
  a.onclick = function() {
      this.popup.style.display = "block";
      for (var i = 0; i < this.popupElement.length; i++)
          this.popupElement[i].proceed();
  }.bind(this)
  document.body.insertBefore(a, document.getElementsByTagName("h1")[0].nextSibling);

  this.popup = document.createElement("div");
  this.popup.id = "threadpopup"
  this.popup.className = "popup"
  this.popup.innerHTML = "<h2>Thread list</h2><p>Select the thread you want to examine.</p>"
  this.popupElement = []
  for (var i = 0; i < this.data.length; i++) {
    var canvas = this.initPopupElement(this.data[i]);
    this.popup.appendChild(canvas);
  }

  document.body.appendChild(this.popup);
}

Page.prototype.initSettings = function() {

  var a = document.createElement("a");
  a.innerHTML = "settings";
  a.href = "#";
  a.className = "nav";
  a.onclick = function() {
      this.settingspopup.style.display = "block";
  }.bind(this)
  document.body.insertBefore(a, document.getElementsByTagName("h1")[0].nextSibling);

  this.settingspopup = document.createElement("div");
  this.settingspopup.id = "settingspopup"
  this.settingspopup.className = "popup"
  this.settingspopup.innerHTML =
    "<h2>Settings</h2>" +
    "<p>Timings: <select><option "+(this.settings.relative?"":"selected")+">absolute</option><option "+(this.settings.relative?"selected":"")+">relative</option></select></p>"+
    "<p>Absolute unit: <input type='text' value='"+this.settings.absoluteunit+"' /> ops/unit</p>"+
    "<p><input type='button' value='close' /></p>"
  document.body.appendChild(this.settingspopup);

  var settings = this.settings;
  this.settingspopup.getElementsByTagName("select")[0].onchange = function() {
      settings.relative = this.value == "relative"
  }
  this.settingspopup.getElementsByTagName("input")[0].onchange = function() {
      settings.absoluteunit = this.value
  }
  this.settingspopup.getElementsByTagName("input")[1].onclick = function() {
      this.settingspopup.style.display = "none";
      this.computeOverview();
  }.bind(this)

}

Page.prototype.initPopupElement = function(data) {
    var container = document.createElement("div");
    var canvas = document.createElement("canvas");

    var pages = [];
    pages[0] = data.dict;
    pages[1] = data.tree;
    if (data.corrections)
        pages[2] = data.corrections;

    request(pages, function (answer) {
      var textmap = JSON.parse(answer[0]);
      var buffer = answer[1];
      if (answer.length == 3)
        var corrections = JSON.parse(answer[2]);

      var tree = new DataTree(buffer, textmap);
      if (!tree.hasChilds(0)) {
          canvas.style.display = "none";
          return;
      } else {
          if (data.threadName) {
              var name = document.createElement("div");
              name.innerHTML = data.threadName + ":";
              container.insertBefore(name, canvas);
          }
      }
      var drawCanvas = new DrawCanvas(canvas, tree);
      this.updateStartTime(drawCanvas);
      drawCanvas.line_height = 50;
      drawCanvas.dom.onclick = function() {
          this.popup.style.display = "none";
          this.textmap = textmap;
          this.tree = tree;
          if (corrections)
            this.corrections = corrections;
          this.initGraph()
          this.initOverview()
          for (var i = 0; i < this.popupElement.length; i++)
              this.popupElement[i].halt();
      }.bind(this)
      drawCanvas.draw();
      this.popupElement[this.popupElement.length] = drawCanvas;
    }.bind(this));

    canvas.height = "50"
    canvas.width = "750"

    container.appendChild(canvas);
    return container;
}

Page.prototype.updateStartTime = function (drawCanvas) {
  // No start known yet.
  if (!this.start) {
    this.start = drawCanvas.getStart();
    this.stop = drawCanvas.getStop();
    return;
  }

  // Canvas has a higher start time. Set it to the lower one.
  if (drawCanvas.getStart() >= this.start && drawCanvas.getStop() <= this.stop) {
    drawCanvas.updateStart(this.start);
    drawCanvas.updateStop(this.stop);
    return;
  }

  // Canvas has a lower start time. Update the start time and
  // redraw all known canvasses.

  if (drawCanvas.getStart() < this.start)
    this.start = drawCanvas.getStart();
  else
    drawCanvas.updateStart(this.start);

  if (drawCanvas.getStop() > this.stop)
    this.stop = drawCanvas.getStop();
  else
    drawCanvas.updateStop(this.stop);

  for (var i = 0; i < this.popupElement.length; i++) {
    this.popupElement[i].updateStart(this.start);
    this.popupElement[i].updateStop(this.stop);
    this.popupElement[i].reset();
    this.popupElement[i].draw();
  }
  if (this.canvas) {
    this.canvas.updateStart(this.start);
    this.canvas.updateStop(this.stop);
    this.canvas.reset();
    this.canvas.draw();
    this.zoom.updateStart(this.start);
    this.zoom.updateStop(this.stop);
    this.zoom.reset();
    this.zoom.draw();
  }
}

Page.prototype.initGraph = function() {
  if (this.canvas) {
      this.canvas.reset();
      this.zoom.reset();
  }

  var canvas = new DrawCanvas(document.getElementById("myCanvas"), this.tree);
  this.canvas = canvas;

  this.createZoom();

  this.canvas.dom.onclick = this.clickCanvas.bind(this);
  this.zoom.dom.onmousedown = this.zoomStart.bind(this);
  this.zoom.dom.onmousemove = this.zoomMove.bind(this);
  this.zoom.dom.onmouseup = this.zoomEnd.bind(this);
  window.onmouseup = this.zoomFailed.bind(this);
  this.zoom.dom.ondblclick = this.zoomOut.bind(this);

  this.updateStartTime(canvas);
  this.resize();
  window.onresize = this.resize.bind(this);
}

Page.prototype.resize = function() {
  this.canvas.dom.width = (document.body.clientWidth - 350)
  this.canvas.draw();
  this.zoom.dom.width = (document.body.clientWidth - 350)
  this.zoom.draw();
}

Page.prototype.initOverview = function() {
  if (this.overview)
      this.overview.reset();

  this.overview = new Overview(this.tree, {
    chunk_cb: Page.prototype.computeOverview.bind(this)
  });

  if (this.corrections) {
    this.overview.engineOverview = this.corrections.engineOverview;
    this.overview.scriptOverview = this.corrections.scriptOverview;
    this.overview.scriptTimes = this.corrections.scriptTimes;
  }

  this.tablesInited = false;
  this.overview.init();
}

Page.prototype.computeOverview = function () {
  if (!this.tablesInited) {
    var dom = document.getElementById("engineOverview");
    var output = "<h2>Engine Overview</h2><table id='engineOverviewTable'></table>";
    dom.innerHTML = output;

    var overview = document.getElementById("engineOverviewTable");
    var thead = overview.createTHead();
    var row = thead.insertRow(0);
    row.insertCell(0).innerHTML = "Engine";
    row.insertCell(1).innerHTML = "Times called";
    row.insertCell(2).innerHTML = "Total time";
    row.cells[1].className = "sorttable_numeric";
    row.cells[2].className = "sorttable_numeric";
    var tbody = overview.createTBody();
    sorttable.makeSortable(overview);

    dom = document.getElementById("scriptOverview");
    output = "<h2>Script Overview</h2><table id='scriptOverviewTable'></table>";
    dom.innerHTML = output;

    var overview = document.getElementById("scriptOverviewTable");
    var thead = overview.createTHead();
    var row = thead.insertRow(0);
    row.insertCell(0).innerHTML = "Script";
    row.insertCell(1).innerHTML = "Times called";
    row.insertCell(2).innerHTML = "Times compiled";
    row.insertCell(3).innerHTML = "Total time";
    row.insertCell(4).innerHTML = "Spend time";
    row.cells[1].className = "sorttable_numeric";
    row.cells[2].className = "sorttable_numeric";
    row.cells[3].className = "sorttable_numeric";
    var tbody = overview.createTBody();
    sorttable.makeSortable(overview);

    this.tablesInited = true;
    this.engineOverviewTable = []
    this.scriptOverviewTable = []
    return;
  }

  var total = 0;
  for (var i in this.overview.engineOverview) {
    total += this.overview.engineOverview[i];
  }

  var self = this;
  var colors = new TextToColor(this.textmap);
  for (var i in this.overview.engineOverview) {
      if (!(i in this.engineOverviewTable)) {
          var overview = document.getElementById("engineOverviewTable").tBodies[0];
          var row = overview.insertRow(overview.rows.length);
          var engineCell = row.insertCell(0);
          engineCell.innerHTML = "<span class='block' style='background-color:"+colors.getColor(i)+";'></span>"+i;
          engineCell.onclick = (function(engineCell, name) {
              return function() {
                  // find textId
                  for (var i = 0; i<self.textmap.length; i++) {
                      if (self.textmap[i] == name) {
                          if (self.canvas.isHidden(i)) {
                            self.canvas.show(i);
                            //self.zoom.show(i);
                            engineCell.className = "engineCell";
                          } else {
                            self.canvas.hide(i);
                            //self.zoom.hide(i);
                            engineCell.className = "engineCell disabled";
                          }
                          self.canvas.draw();
                          return;
                      }
                  }
              }
          })(engineCell, i)
          engineCell.className = "engineCell";
          var timesCell = row.insertCell(1)
          var totalCell = row.insertCell(2)
          this.engineOverviewTable[i] = row;
      }
      this.engineOverviewTable[i].cells[1].innerHTML = this.overview.engineAmount[i];
      if (this.settings.relative)
          this.engineOverviewTable[i].cells[2].innerHTML = percent(this.overview.engineOverview[i]/total)+"%";
      else
          this.engineOverviewTable[i].cells[2].innerHTML = Math.round(this.overview.engineOverview[i]/this.settings.absoluteunit);
  }

  for (var script in this.overview.scriptOverview) {
    if (!this.overview.scriptTimes[script]["IonCompilation"])
      this.overview.scriptTimes[script]["IonCompilation"] = 0
    if (!(script in this.scriptOverviewTable)) {
      var overview = document.getElementById("scriptOverviewTable").tBodies[0];
      var row = overview.insertRow(overview.rows.length);
      row.insertCell(0);
      row.insertCell(1);
      row.insertCell(2);
      row.insertCell(3);
      row.insertCell(4);
      this.scriptOverviewTable[script] = row;
    }

    this.scriptOverviewTable[script].cells[0].innerHTML = script;
    this.scriptOverviewTable[script].cells[1].innerHTML = this.overview.scriptTimes[script][script];
    this.scriptOverviewTable[script].cells[2].innerHTML = this.overview.scriptTimes[script]["IonCompilation"];

    var script_total = 0;
    for (var j in this.overview.scriptOverview[script]) {
      if (j != script)
          script_total += this.overview.scriptOverview[script][j];
    }


    if (this.settings.relative)
        this.scriptOverviewTable[script].cells[3].innerHTML = percent(script_total/total)+"%";
    else
        this.scriptOverviewTable[script].cells[3].innerHTML = Math.round(script_total/this.settings.absoluteunit);

    var output = "";
    for (var j in this.overview.scriptOverview[script]) {
      if (j != script) {
        if (this.settings.relative)
          output += ""+j+": "+percent(this.overview.scriptOverview[script][j]/script_total)+"%, ";
        else
          output += ""+j+": "+Math.round(this.overview.scriptOverview[script][j]/this.settings.absoluteunit)+", ";
      }
    }
    this.scriptOverviewTable[script].cells[4].innerHTML = output;
  }
}

Page.prototype.createZoom = function() {
    var zoomdom;
    if (this.zoom) {
        zoomdom = this.zoom.dom;
    } else {
        zoomdom = document.createElement("canvas");
        this.canvas.dom.parentNode.insertBefore(zoomdom, this.canvas.dom);

        zoomdom.height = "50"
        zoomdom.width = "750"
    }

    this.zoom = new DrawCanvas(zoomdom, this.canvas.tree);

    this.zoom.line_height = 50;
    this.zoom.dom.width = (document.body.clientWidth - 350)
    this.zoom.draw();

    var selectiondom;
    if (this.selection) {
        selectiondom = this.selection.dom;
    } else {
        selectiondom = document.createElement("canvas");
        this.canvas.dom.parentNode.insertBefore(selectiondom, this.canvas.dom);

        selectiondom.height = "25"
        selectiondom.width = "750"
    }

    this.selection = new SelectionCanvas(selectiondom, this.zoom);
    this.selection.dom.width = (document.body.clientWidth - 350)
    this.selection.draw();
}

Page.prototype.zoomStart = function(e) {
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

    this.zooming = true;
    this.zoomStart = this.zoom.convert(posx, 1);
}

Page.prototype.zoomMove = function(e) {
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

    if (this.zooming) {
        var zoomEnd = this.zoom.convert(posx, 1);
        if (zoomEnd == this.zoomStart) {
            this.selection.updateStart(this.zoom.convert(posx-10, 1));
            this.selection.updateStop(this.zoom.convert(posx+10, 1));
        } else if (zoomEnd > this.zoomStart) {
            this.selection.updateStart(this.zoomStart);
            this.selection.updateStop(zoomEnd);
        } else {
            this.selection.updateStart(zoomEnd);
            this.selection.updateStop(this.zoomStart);
        }
        this.selection.draw()
    }
    return true;
}

Page.prototype.zoomEnd = function(e) {
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

    if (this.zooming) {
        this.zooming = false;
        var zoomEnd = this.zoom.convert(posx, 1);
        if (zoomEnd == this.zoomStart) {
            this.canvas.updateStart(this.zoom.convert(posx-10, 1));
            this.canvas.updateStop(this.zoom.convert(posx+10, 1));
        } else if (zoomEnd > this.zoomStart) {
            this.canvas.updateStart(this.zoomStart);
            this.canvas.updateStop(zoomEnd);
        } else {
            this.canvas.updateStart(zoomEnd);
            this.canvas.updateStop(this.zoomStart);
        }
        this.canvas.draw();
    }
    this.selection.updateStart(this.canvas.start)
    this.selection.updateStop(this.canvas.stop)
    this.selection.draw()

    this.tablesInited = false;
    this.overview.setClip(this.canvas.start, this.canvas.stop);
}

Page.prototype.zoomOut = function(e) {
    this.zooming = false;

    this.canvas.updateStart(this.tree.start(1));
    this.canvas.updateStop(this.tree.stop(0));
    this.canvas.draw();

    this.selection.updateStart(this.canvas.start)
    this.selection.updateStop(this.canvas.stop)
    this.selection.draw()

    this.tablesInited = false;
    this.overview.setClip(this.canvas.start, this.canvas.stop);
}

Page.prototype.zoomFailed = function(e) {
    this.zooming = false;
    this.selection.updateStart(this.canvas.start)
    this.selection.updateStop(this.canvas.stop)
    this.selection.draw()
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
    document.getElementById("backtrace").scrollTop = backtrace.length*40;
}

var page = new Page();
page.init()


/*
  SortTable
  version 2
  7th April 2007
  Stuart Langridge, http://www.kryogenix.org/code/browser/sorttable/

  Instructions:
  Download this file
  Add <script src="sorttable.js"></script> to your HTML
  Add class="sortable" to any table you'd like to make sortable
  Click on the headers to sort

  Thanks to many, many people for contributions and suggestions.
  Licenced as X11: http://www.kryogenix.org/code/browser/licence.html
  This basically means: do what you want with it.
*/


var stIsIE = /*@cc_on!@*/false;

sorttable = {
  init: function() {
    // quit if this function has already been called
    if (arguments.callee.done) return;
    // flag this function so we don't do the same thing twice
    arguments.callee.done = true;
    // kill the timer
    if (_timer) clearInterval(_timer);

    if (!document.createElement || !document.getElementsByTagName) return;

    sorttable.DATE_RE = /^(\d\d?)[\/\.-](\d\d?)[\/\.-]((\d\d)?\d\d)$/;

    forEach(document.getElementsByTagName('table'), function(table) {
      if (table.className.search(/\bsortable\b/) != -1) {
        sorttable.makeSortable(table);
      }
    });

  },

  makeSortable: function(table) {
    if (table.getElementsByTagName('thead').length == 0) {
      // table doesn't have a tHead. Since it should have, create one and
      // put the first table row in it.
      the = document.createElement('thead');
      the.appendChild(table.rows[0]);
      table.insertBefore(the,table.firstChild);
    }
    // Safari doesn't support table.tHead, sigh
    if (table.tHead == null) table.tHead = table.getElementsByTagName('thead')[0];

    if (table.tHead.rows.length != 1) return; // can't cope with two header rows

    // Sorttable v1 put rows with a class of "sortbottom" at the bottom (as
    // "total" rows, for example). This is B&R, since what you're supposed
    // to do is put them in a tfoot. So, if there are sortbottom rows,
    // for backwards compatibility, move them to tfoot (creating it if needed).
    sortbottomrows = [];
    for (var i=0; i<table.rows.length; i++) {
      if (table.rows[i].className.search(/\bsortbottom\b/) != -1) {
        sortbottomrows[sortbottomrows.length] = table.rows[i];
      }
    }
    if (sortbottomrows) {
      if (table.tFoot == null) {
        // table doesn't have a tfoot. Create one.
        tfo = document.createElement('tfoot');
        table.appendChild(tfo);
      }
      for (var i=0; i<sortbottomrows.length; i++) {
        tfo.appendChild(sortbottomrows[i]);
      }
      delete sortbottomrows;
    }

    // work through each column and calculate its type
    headrow = table.tHead.rows[0].cells;
    for (var i=0; i<headrow.length; i++) {
      // manually override the type with a sorttable_type attribute
      if (!headrow[i].className.match(/\bsorttable_nosort\b/)) { // skip this col
        mtch = headrow[i].className.match(/\bsorttable_([a-z0-9]+)\b/);
        if (mtch) { override = mtch[1]; }
	      if (mtch && typeof sorttable["sort_"+override] == 'function') {
	        headrow[i].sorttable_sortfunction = sorttable["sort_"+override];
	      } else {
	        headrow[i].sorttable_sortfunction = sorttable.guessType(table,i);
	      }
	      // make it clickable to sort
	      headrow[i].sorttable_columnindex = i;
	      headrow[i].sorttable_tbody = table.tBodies[0];
	      dean_addEvent(headrow[i],"click", sorttable.innerSortFunction = function(e) {

          if (this.className.search(/\bsorttable_sorted\b/) != -1) {
            // if we're already sorted by this column, just
            // reverse the table, which is quicker
            sorttable.reverse(this.sorttable_tbody);
            this.className = this.className.replace('sorttable_sorted',
                                                    'sorttable_sorted_reverse');
            this.removeChild(document.getElementById('sorttable_sortfwdind'));
            sortrevind = document.createElement('span');
            sortrevind.id = "sorttable_sortrevind";
            sortrevind.innerHTML = stIsIE ? '&nbsp<font face="webdings">5</font>' : '&nbsp;&#x25B4;';
            this.appendChild(sortrevind);
            return;
          }
          if (this.className.search(/\bsorttable_sorted_reverse\b/) != -1) {
            // if we're already sorted by this column in reverse, just
            // re-reverse the table, which is quicker
            sorttable.reverse(this.sorttable_tbody);
            this.className = this.className.replace('sorttable_sorted_reverse',
                                                    'sorttable_sorted');
            this.removeChild(document.getElementById('sorttable_sortrevind'));
            sortfwdind = document.createElement('span');
            sortfwdind.id = "sorttable_sortfwdind";
            sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : '&nbsp;&#x25BE;';
            this.appendChild(sortfwdind);
            return;
          }

          // remove sorttable_sorted classes
          theadrow = this.parentNode;
          forEach(theadrow.childNodes, function(cell) {
            if (cell.nodeType == 1) { // an element
              cell.className = cell.className.replace('sorttable_sorted_reverse','');
              cell.className = cell.className.replace('sorttable_sorted','');
            }
          });
          sortfwdind = document.getElementById('sorttable_sortfwdind');
          if (sortfwdind) { sortfwdind.parentNode.removeChild(sortfwdind); }
          sortrevind = document.getElementById('sorttable_sortrevind');
          if (sortrevind) { sortrevind.parentNode.removeChild(sortrevind); }

          this.className += ' sorttable_sorted';
          sortfwdind = document.createElement('span');
          sortfwdind.id = "sorttable_sortfwdind";
          sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : '&nbsp;&#x25BE;';
          this.appendChild(sortfwdind);

	        // build an array to sort. This is a Schwartzian transform thing,
	        // i.e., we "decorate" each row with the actual sort key,
	        // sort based on the sort keys, and then put the rows back in order
	        // which is a lot faster because you only do getInnerText once per row
	        row_array = [];
	        col = this.sorttable_columnindex;
	        rows = this.sorttable_tbody.rows;
	        for (var j=0; j<rows.length; j++) {
	          row_array[row_array.length] = [sorttable.getInnerText(rows[j].cells[col]), rows[j]];
	        }
	        /* If you want a stable sort, uncomment the following line */
	        //sorttable.shaker_sort(row_array, this.sorttable_sortfunction);
	        /* and comment out this one */
	        row_array.sort(this.sorttable_sortfunction);

	        tb = this.sorttable_tbody;
	        for (var j=0; j<row_array.length; j++) {
	          tb.appendChild(row_array[j][1]);
	        }

	        delete row_array;
	      });
	    }
    }
  },

  guessType: function(table, column) {
    // guess the type of a column based on its first non-blank row
    sortfn = sorttable.sort_alpha;
    for (var i=0; i<table.tBodies[0].rows.length; i++) {
      text = sorttable.getInnerText(table.tBodies[0].rows[i].cells[column]);
      if (text != '') {
        if (text.match(/^-?[£$¤]?[\d,.]+%?$/)) {
          return sorttable.sort_numeric;
        }
        // check for a date: dd/mm/yyyy or dd/mm/yy
        // can have / or . or - as separator
        // can be mm/dd as well
        possdate = text.match(sorttable.DATE_RE)
        if (possdate) {
          // looks like a date
          first = parseInt(possdate[1]);
          second = parseInt(possdate[2]);
          if (first > 12) {
            // definitely dd/mm
            return sorttable.sort_ddmm;
          } else if (second > 12) {
            return sorttable.sort_mmdd;
          } else {
            // looks like a date, but we can't tell which, so assume
            // that it's dd/mm (English imperialism!) and keep looking
            sortfn = sorttable.sort_ddmm;
          }
        }
      }
    }
    return sortfn;
  },

  getInnerText: function(node) {
    // gets the text we want to use for sorting for a cell.
    // strips leading and trailing whitespace.
    // this is *not* a generic getInnerText function; it's special to sorttable.
    // for example, you can override the cell text with a customkey attribute.
    // it also gets .value for <input> fields.

    if (!node) return "";

    hasInputs = (typeof node.getElementsByTagName == 'function') &&
                 node.getElementsByTagName('input').length;

    if (node.getAttribute("sorttable_customkey") != null) {
      return node.getAttribute("sorttable_customkey");
    }
    else if (typeof node.textContent != 'undefined' && !hasInputs) {
      return node.textContent.replace(/^\s+|\s+$/g, '');
    }
    else if (typeof node.innerText != 'undefined' && !hasInputs) {
      return node.innerText.replace(/^\s+|\s+$/g, '');
    }
    else if (typeof node.text != 'undefined' && !hasInputs) {
      return node.text.replace(/^\s+|\s+$/g, '');
    }
    else {
      switch (node.nodeType) {
        case 3:
          if (node.nodeName.toLowerCase() == 'input') {
            return node.value.replace(/^\s+|\s+$/g, '');
          }
        case 4:
          return node.nodeValue.replace(/^\s+|\s+$/g, '');
          break;
        case 1:
        case 11:
          var innerText = '';
          for (var i = 0; i < node.childNodes.length; i++) {
            innerText += sorttable.getInnerText(node.childNodes[i]);
          }
          return innerText.replace(/^\s+|\s+$/g, '');
          break;
        default:
          return '';
      }
    }
  },

  reverse: function(tbody) {
    // reverse the rows in a tbody
    newrows = [];
    for (var i=0; i<tbody.rows.length; i++) {
      newrows[newrows.length] = tbody.rows[i];
    }
    for (var i=newrows.length-1; i>=0; i--) {
       tbody.appendChild(newrows[i]);
    }
    delete newrows;
  },

  /* sort functions
     each sort function takes two parameters, a and b
     you are comparing a[0] and b[0] */
  sort_numeric: function(a,b) {
    aa = parseFloat(a[0].replace(/[^0-9.-]/g,''));
    if (isNaN(aa)) aa = 0;
    bb = parseFloat(b[0].replace(/[^0-9.-]/g,''));
    if (isNaN(bb)) bb = 0;
    return aa-bb;
  },
  sort_alpha: function(a,b) {
    if (a[0]==b[0]) return 0;
    if (a[0]<b[0]) return -1;
    return 1;
  },
  sort_ddmm: function(a,b) {
    mtch = a[0].match(sorttable.DATE_RE);
    y = mtch[3]; m = mtch[2]; d = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt1 = y+m+d;
    mtch = b[0].match(sorttable.DATE_RE);
    y = mtch[3]; m = mtch[2]; d = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt2 = y+m+d;
    if (dt1==dt2) return 0;
    if (dt1<dt2) return -1;
    return 1;
  },
  sort_mmdd: function(a,b) {
    mtch = a[0].match(sorttable.DATE_RE);
    y = mtch[3]; d = mtch[2]; m = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt1 = y+m+d;
    mtch = b[0].match(sorttable.DATE_RE);
    y = mtch[3]; d = mtch[2]; m = mtch[1];
    if (m.length == 1) m = '0'+m;
    if (d.length == 1) d = '0'+d;
    dt2 = y+m+d;
    if (dt1==dt2) return 0;
    if (dt1<dt2) return -1;
    return 1;
  },

  shaker_sort: function(list, comp_func) {
    // A stable sort function to allow multi-level sorting of data
    // see: http://en.wikipedia.org/wiki/Cocktail_sort
    // thanks to Joseph Nahmias
    var b = 0;
    var t = list.length - 1;
    var swap = true;

    while(swap) {
        swap = false;
        for(var i = b; i < t; ++i) {
            if ( comp_func(list[i], list[i+1]) > 0 ) {
                var q = list[i]; list[i] = list[i+1]; list[i+1] = q;
                swap = true;
            }
        } // for
        t--;

        if (!swap) break;

        for(var i = t; i > b; --i) {
            if ( comp_func(list[i], list[i-1]) < 0 ) {
                var q = list[i]; list[i] = list[i-1]; list[i-1] = q;
                swap = true;
            }
        } // for
        b++;

    } // while(swap)
  }
}

/* ******************************************************************
   Supporting functions: bundled here to avoid depending on a library
   ****************************************************************** */

// Dean Edwards/Matthias Miller/John Resig

/* for Mozilla/Opera9 */
if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", sorttable.init, false);
}

/* for Internet Explorer */
/*@cc_on @*/
/*@if (@_win32)
    document.write("<script id=__ie_onload defer src=javascript:void(0)><\/script>");
    var script = document.getElementById("__ie_onload");
    script.onreadystatechange = function() {
        if (this.readyState == "complete") {
            sorttable.init(); // call the onload handler
        }
    };
/*@end @*/

/* for Safari */
if (/WebKit/i.test(navigator.userAgent)) { // sniff
    var _timer = setInterval(function() {
        if (/loaded|complete/.test(document.readyState)) {
            sorttable.init(); // call the onload handler
        }
    }, 10);
}

/* for other browsers */
window.onload = sorttable.init;

// written by Dean Edwards, 2005
// with input from Tino Zijdel, Matthias Miller, Diego Perini

// http://dean.edwards.name/weblog/2005/10/add-event/

function dean_addEvent(element, type, handler) {
	if (element.addEventListener) {
		element.addEventListener(type, handler, false);
	} else {
		// assign each event handler a unique ID
		if (!handler.$$guid) handler.$$guid = dean_addEvent.guid++;
		// create a hash table of event types for the element
		if (!element.events) element.events = {};
		// create a hash table of event handlers for each element/event pair
		var handlers = element.events[type];
		if (!handlers) {
			handlers = element.events[type] = {};
			// store the existing event handler (if there is one)
			if (element["on" + type]) {
				handlers[0] = element["on" + type];
			}
		}
		// store the event handler in the hash table
		handlers[handler.$$guid] = handler;
		// assign a global event handler to do all the work
		element["on" + type] = handleEvent;
	}
};
// a counter used to create unique IDs
dean_addEvent.guid = 1;

function removeEvent(element, type, handler) {
	if (element.removeEventListener) {
		element.removeEventListener(type, handler, false);
	} else {
		// delete the event handler from the hash table
		if (element.events && element.events[type]) {
			delete element.events[type][handler.$$guid];
		}
	}
};

function handleEvent(event) {
	var returnValue = true;
	// grab the event object (IE uses a global event object)
	event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
	// get a reference to the hash table of event handlers
	var handlers = this.events[event.type];
	// execute each event handler
	for (var i in handlers) {
		this.$$handleEvent = handlers[i];
		if (this.$$handleEvent(event) === false) {
			returnValue = false;
		}
	}
	return returnValue;
};

function fixEvent(event) {
	// add W3C standard event methods
	event.preventDefault = fixEvent.preventDefault;
	event.stopPropagation = fixEvent.stopPropagation;
	return event;
};
fixEvent.preventDefault = function() {
	this.returnValue = false;
};
fixEvent.stopPropagation = function() {
  this.cancelBubble = true;
}

// Dean's forEach: http://dean.edwards.name/base/forEach.js
/*
	forEach, version 1.0
	Copyright 2006, Dean Edwards
	License: http://www.opensource.org/licenses/mit-license.php
*/

// array-like enumeration
if (!Array.forEach) { // mozilla already supports this
	Array.forEach = function(array, block, context) {
		for (var i = 0; i < array.length; i++) {
			block.call(context, array[i], i, array);
		}
	};
}

// generic enumeration
Function.prototype.forEach = function(object, block, context) {
	for (var key in object) {
		if (typeof this.prototype[key] == "undefined") {
			block.call(context, object[key], key, object);
		}
	}
};

// character enumeration
String.forEach = function(string, block, context) {
	Array.forEach(string.split(""), function(chr, index) {
		block.call(context, chr, index, string);
	});
};

// globally resolve forEach enumeration
var forEach = function(object, block, context) {
	if (object) {
		var resolve = Object; // default
		if (object instanceof Function) {
			// functions have a "length" property
			resolve = Function;
		} else if (object.forEach instanceof Function) {
			// the object implements a custom forEach method so use that
			object.forEach(block, context);
			return;
		} else if (typeof object == "string") {
			// the object is a string
			resolve = String;
		} else if (typeof object.length == "number") {
			// the object is array-like
			resolve = Array;
		}
		resolve.forEach(object, block, context);
	}
};

