
requirejs([
    "js/lib/pace.js",
    "js/Page.js"
], function(_, Page) {

    if (!baseUrl)
        var baseUrl = "./";

    var page = new Page();
    page.init()
})
