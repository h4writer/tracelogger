define([], function() {

    function DrawCanvas(dom, tree, options) {
      this.dom = dom;
      this.ctx = dom.getContext("2d");
      this.tree = tree;
      this.line_height = 10;
      this.start = this.tree.start(1);
      this.stop = this.tree.stop(0);
      this.duration = this.stop - this.start;
      this.hiddenList = [];
      this.minDraw = 0.05;

      if (options && options.minDraw)
          this.minDraw = options.minDraw

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

    return DrawCanvas;
});
