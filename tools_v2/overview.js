loadRelativeToScript("engine.js")
var textmap = JSON.parse(read(data["dict"]))
var corrections = JSON.parse(read(data["corrections"]))
var array = read(data["tree"], 'binary');
var tree = new DataTree(array.buffer, textmap);

var fullOverview = new Overview(tree, {});
fullOverview.engineOverview = corrections.engineOverview;
fullOverview.scriptOverview = corrections.scriptOverview;
fullOverview.scriptTimes = corrections.scriptTimes;
fullOverview.init();

print(JSON.stringify({engineOverview:fullOverview.engineOverview, scriptOverview:fullOverview.scriptOverview, scriptTimes:fullOverview.scriptTimes}));
