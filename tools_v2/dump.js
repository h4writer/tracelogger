loadRelativeToScript('engine.js')

/**
 * This tool dumps a textual representation
 * of the binary tree. 
 */
var textmap = JSON.parse(read(data["dict"]))
var array = read(data["tree"], 'binary');
var tree = new DataTree(array.buffer, textmap);

function dump(ids, depth) {
   for (var i=0; i<ids.length; i++) {
       var id = ids[i];
       var output = "";
       for (var j=0; j<depth; j++)
           output += "-"
       output += tree.text(id)
       print(output)
       if (tree.hasChilds(id))
           dump(tree.childs(id), depth+1)
   }
}

dump(tree.childs(0), 0)
