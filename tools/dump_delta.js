loadRelativeToScript('engine.js')

/**
 * This tool dumps a tree textual representation, which contains each entry
 * prefixed by the time taken by each entry.
 */
var textmap = JSON.parse(read(data["dict"]))
var array = read(data["tree"], 'binary');
var tree = new DataTree(array.buffer, textmap);

function dump(prefix, ids) {
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];

        var delta = tree.stop(id) - tree.start(id);
        if (i == ids.length - 1) {
            if (prefix.length >= 1)
                prefix = prefix.slice(0, -1) + "'";
        }
        print(prefix + "-", delta, tree.text(id));
        if (i == ids.length - 1) {
            if (prefix.length >= 1)
                prefix = prefix.slice(0, -1) + " ";
        }

        if (tree.hasChilds(id))
            dump(prefix + "   |", tree.childs(id));
    }
}

dump("", tree.childs(0))
