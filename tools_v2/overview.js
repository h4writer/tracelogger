loadRelativeToScript("engine.js")
var textmap = JSON.parse(read(data["dict"]))
var array = read(data["tree"], 'binary');
var tree = new DataTree(array.buffer, textmap);

var fullOverview = new Overview(tree, {});
if (data["corrections"]) {
    var corrections = JSON.parse(read(data["corrections"]))
    fullOverview.engineOverview = corrections.engineOverview;
    fullOverview.engineAmount = corrections.engineAmount;
    fullOverview.scriptOverview = corrections.scriptOverview;
    fullOverview.scriptTimes = corrections.scriptTimes;
}
fullOverview.init();

print(JSON.stringify({
    engineOverview: fullOverview.engineOverview,
    engineAmount: fullOverview.engineAmount,
    scriptOverview: fullOverview.scriptOverview,
    scriptTimes: fullOverview.scriptTimes
}));
