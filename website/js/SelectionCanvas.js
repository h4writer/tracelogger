define([], function() {

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

    return SelectionCanvas;
});

