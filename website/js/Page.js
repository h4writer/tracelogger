define([
    "js/lib/sorttable.js",
    "js/request.js",
    "js/utils.js",
    "js/DrawCanvas.js",
    "js/SelectionCanvas.js",
    "js/Settings.js",
    "js/ScriptOverview.js"
], function(_, request, utils, DrawCanvas, SelectionCanvas, Settings, ScriptOverview) {

    function Page() {
        this.settings = new Settings()
    }

    Page.prototype.init = function() {
      var url = utils.GetUrlValue("data");
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
        }
     }.bind(this), function(file) {
         alert("Failed to load: "+file);
     });
    }

    Page.prototype.initFilesList = function() {
      this.filelist = document.createElement("div");
      this.filelist.className = "popup"
      this.filelist.innerHTML = "<h2>File list</h2><p>Select the file you want to examine.</p>"

      request(["list/"], function (answer) {
          answer += "";
          if (/tl-data.json/.test(answer)) {
              this.filelist.innerHTML += "- Most recent trace: ";
              var div = document.createElement("div");
              div.innerHTML += "<a href='?data=tl-data.json'>tl-data.json</a>";

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
                  div.innerHTML += "<a href='?data="+logs[i]+"'>"+logs[i]+"</a>";

                  utils.lastModified(logs[i], function(modified) {
                      div.innerHTML += " - "+modified;
                  })

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
          var drawCanvas = new DrawCanvas(canvas, tree,  {
              minDraw: this.settings.drawcutoff
          });
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
      } else {
          this.settings.on("drawcutoff", () => {
              this.canvas.minDraw = this.settings.drawcutoff;
              this.canvas.draw();
          });
      }

      var canvas = new DrawCanvas(document.getElementById("myCanvas"), this.tree, {
          minDraw: this.settings.drawcutoff
      });
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
      this.selection.dom.width = (document.body.clientWidth - 350)
      this.selection.draw();
    }

    Page.prototype.initOverview = function() {
      if (this.overview)
          this.overview.reset();

      this.overview = new Overview(this.tree, {
        chunk_cb: Page.prototype.computeOverview.bind(this)
      });

      this.settings.on("change", () => { // actually "relative" and "absoluteunit"
        this.computeOverview();
      });

      if (this.corrections) {
        this.overview.engineOverview = this.corrections.engineOverview;
        this.overview.engineAmount = this.corrections.engineAmount;
        this.overview.scriptOverview = this.corrections.scriptOverview;
        this.overview.scriptTimes = this.corrections.scriptTimes;
      }

      var scriptOverview = new ScriptOverview(this.overview, this.settings);

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

        this.tablesInited = true;
        this.engineOverviewTable = []
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
              this.engineOverviewTable[i].cells[2].innerHTML = utils.percent(this.overview.engineOverview[i]/total)+"%";
          else
              this.engineOverviewTable[i].cells[2].innerHTML = Math.round(this.overview.engineOverview[i]/this.settings.absoluteunit);
      }
    }

    Page.prototype.createZoom = function() {
        var zoomdom;
        if (this.zoom) {
            zoomdom = this.zoom.dom;
        } else {
            zoomdom = document.createElement("canvas");
            this.canvas.dom.parentNode.insertBefore(zoomdom, this.canvas.dom);

            this.settings.on("drawcutoff", () => {
                this.zoom.minDraw = this.settings.drawcutoff;
                this.zoom.draw();
            });

            zoomdom.height = "50"
            zoomdom.width = "750"
        }

        this.zoom = new DrawCanvas(zoomdom, this.canvas.tree, {
            minDraw: this.settings.drawcutoff
        });

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

    function translateScript(script) {
      var arr = script.split("/");
      return "<span title='"+script+"'>"+arr[arr.length-1]+"</span>";
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

    return Page;
});
