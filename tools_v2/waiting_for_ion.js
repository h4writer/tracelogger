loadRelativeToScript("engine.js")

var textmap = JSON.parse(read(data["dict"]))
var array = read(data["tree"], 'binary');
var tree = new DataTree(array.buffer, textmap);

/**
 * This tool computes the time we are waiting for an 
 * IonScript to be ready after deciding to start ion compiling.
 * 
 * Note: the result is not the time we could have been faster.
 * It is an indication. One assumes IonMonkey executes 10x to 100x
 * times faster than Baseline. As a result the time spend could 
 * (conservative) be executed 10x faster.
 */

if (data["corrections"]) {
    print("corrections file not supported.")
    exit();
}

function iterate(tree, id) {
    var scriptname = tree.text(parent_id);

    /* Mark we started compiling a script. */
    if (tree.text(id) == "IonCompilation") {
        // We always log the script name and afterwards that we started compiling.
        var scriptname = tree.text(parent_id);
        compiling[scriptname] = true;
    }

    var last_parent_id = parent_id;

    /* Iterate the childs of this log item. */
    var childs = tree.childs(id);
    for (var i = 0; i < childs.length; i++) {
        parent_id = id; 
        total_time -= tree.stop(childs[i]) - tree.start(childs[i]);
        iterate(tree, childs[i]);
    }

    /* Compute total time, exclusive childs time. */
    var total_time = tree.stop(id) - tree.start(id);
    for (var i = 0; i < childs.length; i++) {
        total_time -= tree.stop(childs[i]) - tree.start(childs[i]);
    }

    parent_id = last_parent_id;

    if (tree.text(id) == "Interpreter" || tree.text(id) == "Baseline") {
        // We always log the script name and afterwards that we started compiling.
        var scriptname = tree.text(parent_id);
        if (compiling[scriptname]) {
            waiting_for_ion += total_time;
            if (!waited[scriptname])
                waited[scriptname] = 0;
            waited[scriptname] += total_time;
        }
    }

    /* Mark we ended compiling a script. */
    if (tree.text(id) == "IonLinking") {
        // We always log the script name and afterwards that we started compiling.
        var scriptname = tree.text(parent_id);
        compiling[scriptname] = false;
    }
}

var compiling = {};
var waiting_for_ion = 0;
var waited = {};
var parent_id = 0;

iterate(tree, 0);

var total_time = tree.stop(0) - tree.start(0);
print("Waited for ion: " + waiting_for_ion, "("+waiting_for_ion/total_time+"%)") 
print("out of execution time: " + total_time) 
print("--------------------")
var keys = Object.keys(waited);
keys.sort(function(a,b) {return waited[b] - waited[a]});
for (var i = 0; i < keys.length; i++) {
    print (keys[i] + ": " + waited[keys[i]], "("+waited[keys[i]]/waiting_for_ion+"%)");
}
