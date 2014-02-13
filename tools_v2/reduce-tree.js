loadRelativeToScript("engine.js")
var textmap = JSON.parse(read(data["dict"]))
var array = read(data["tree"], 'binary');
var tree = new DataTree(array.buffer, textmap);
var threshold = (tree.stop(0) - tree.start(0))/640000 // accurency of 0.1px when graph shown on 1600 width display (1600*400)

// Reduce the tree information
function visitItem(parent, id) {
  if (tree.stop(id) - tree.start(id) >= threshold) {
    var nId = cTree.addChild(parent, tree.start(id), tree.stop(id), tree.textId(id));
    var childs = tree.childs(id);
    for (var i=0; i<childs.length; i++) {
      visitItem(nId, childs[i]);
    }
  }
}

var cTree = new CreateDataTree(tree.size(), tree.stop(0));
var childs = tree.childs(0);
for (var i=0; i<childs.length; i++) {
  visitItem(0, childs[i]);
}
for (var i=0; i < cTree.size(); i++) {
  print(cTree.tree.view.getUint8(i))
}
