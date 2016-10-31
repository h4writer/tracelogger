loadRelativeToScript('engine.js')

/**
 * This tool dumps a flat textual representation
 * of the binary tree. 
 */
var textmap = JSON.parse(read(data["dict"]))
var array = read(data["tree"], 'binary');
var tree = new DataTree(array.buffer, textmap);

function dump(ids) {
   for (var i=0; i<ids.length; i++) {
       var id = ids[i];

       print(tree.start(id), "START", tree.text(id));

       if (tree.hasChilds(id))
           dump(tree.childs(id))

       print(tree.stop(id), "STOP", tree.text(id));
   }
}

dump(tree.childs(0), 0)
