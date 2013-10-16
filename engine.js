if (typeof window === 'undefined') {
  function setTimeout(func, time) {
    func();
  };
}

function DataTree(buffer, textmap) {
  this.buffer = buffer;
  this.textmap = textmap;
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

DataTree.prototype.text = function(id) {
  return this.textmap[this.textId(id)]
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

function Overview(tree, settings) {
  this.tree = tree;
  this.settings = settings;
  this.engineOverview = {}
  this.scriptOverview = {}
  this.scriptTimes = {}

  this.queue = [["",0]]
  this.futureQueue = []
  this.threshold = (tree.stop(0) - tree.start(0));
}

Overview.prototype.init = function() {
  this.processQueue();
}

Overview.prototype.hasScriptInfo = function(tag) {
  return tag == "c" || tag == "ps" || tag == "pf" || tag == "pl" || tag == "s";
}

Overview.prototype.getScriptInfo = function(info) {
  return info[1]+":"+info[2];
}

Overview.prototype.clearScriptInfo = function(tag) {
  return tag == "G" || tag == "g";
}

Overview.prototype.processTreeItem = function(script, id) {
  var time = this.tree.stop(id) - this.tree.start(id);
  var info = this.tree.text(id).split(",");

  if (this.clearScriptInfo(info[0]))
    script = "";
  else if (this.hasScriptInfo(info[0]))
    script = this.getScriptInfo(info);

  if (time < 0)
    throw "negative time";

  var childs = tree.childs(id);
  for (var i = 0; i < childs.length; i++) {
    var childTime = tree.stop(childs[i]) - tree.start(childs[i]);
    time -= childTime;

    if (childTime < this.threshold) {
      this.futureQueue[this.futureQueue.length] = [script, childs[i]]
    } else {
      this.processTreeItem(script, childs[i])
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

Overview.prototype.processQueue = function () {
  var queue = this.queue.splice(0, 10000);
  for (var i=0; i<queue.length; i++) {
    this.processTreeItem(queue[i][0], queue[i][1])
  }

  if (this.settings.chunk_cb)
    this.settings.chunk_cb(this);
  
  if (this.queue.length > 0) {
    setTimeout(Overview.prototype.processQueue.bind(this), 1);
    return;
  }

  if (this.futureQueue.length > 0) {
    this.queue = this.futureQueue;
    this.futureQueue = []
    this.threshold = this.threshold / 2
    setTimeout(Overview.prototype.processQueue.bind(this), 1);
    return;
  }

  if (this.settings.finish_cb)
    this.settings.finish_cb(this);
}
