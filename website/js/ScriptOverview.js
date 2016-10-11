define([
    "js/utils.js"
], function(utils) {
    function ScriptOverview(overview, settings) {
        this.overview = overview;
        this.settings = settings;

        this.overviewFinished = false;
        this.drawingFull = false;
        this.paused = false;

        // When the settings change recalculate the overview.
        // Note: actual only needed on "relative" and "absoluteunit" change.
        this.settings.on("change", () => {
            if (this.overviewFinished)
                this.quickDraw();
            else
                this.fullDraw();
        });

        // Reset.
        this.overview.on("reset", () => {
            this.overviewFinished = false;
            this.drawingFull = false;
            this.paused = false;
        });

        // Quick draw (max every 100ms)
        // and stop drawing as soon as it takes longer than 100ms.
        var lastDraw = new Date();
        this.overview.on("chunk", () => {
            if (this.drawingFull || this.paused)
                return;
            var curtime = new Date();
            if (curtime - lastDraw > 100) {
                this.quickDraw();
                lastDraw = curtime;
                if (new Date() - curtime > 100) {
                    this.paused = true;
                    this.quickdrawingpaused.style.display = "block";
                }
            }
        });

        // Full draw.
        this.overview.on("finish", () => {
            this.overviewFinished = true;
            this.fullDraw()
        });

        this.initDOM();
    }

    ScriptOverview.prototype.initDOM = function() {
        var dom = document.getElementById("scriptOverview");

        var output = `
            <h2>Script Overview</h2>
            <div id='quickdrawing'>
                Calculating the script overview ...
                <button>Click here to create pretty table of preliminary data.</button>
                <div id='quickdrawingpaused'>
                    Updating the view has been paused ...
                    <button>Unpause</button>
                </div>
            </div>
            <div id='fulldrawing'>
                The data in this table is outdated ...
                <button>Update</button>
            </div>
            <div id='scriptOverviewContent'></div>
        `;

        dom.innerHTML = output;

        this.content = document.getElementById("scriptOverviewContent");
        this.quickdrawing = document.getElementById("quickdrawing");
        this.quickdrawingpaused = document.getElementById("quickdrawingpaused");
        this.fulldrawing = document.getElementById("fulldrawing");
        document.getElementById("quickdrawing").getElementsByTagName("button")[0].onclick = () => {
            this.drawingFull = true;
            this.fullDraw();
        };
        document.getElementById("quickdrawingpaused").getElementsByTagName("button")[0].onclick = () => {
            this.paused = false;
            this.quickdrawingpaused.style.display = "none";
        };
        document.getElementById("fulldrawing").getElementsByTagName("button")[0].onclick = () => {
            this.fullDraw();
        };
        this.quickdrawing.style.display = "none";
        this.fulldrawing.style.display = "none";
     }

    ScriptOverview.prototype.quickDraw = function() {
        this.quickdrawing.style.display = "block";
        this.quickdrawingpaused.style.display = "none";
        this.fulldrawing.style.display = "none";

        var total = 0;
        for (var i in this.overview.engineOverview) {
            total += this.overview.engineOverview[i];
        }

        var output = "<pre>";
        for (var script in this.overview.scriptOverview) {
            if (!this.overview.scriptTimes[script]["IonCompilation"])
                this.overview.scriptTimes[script]["IonCompilation"] = 0

            var script_total = 0;
            for (var j in this.overview.scriptOverview[script]) {
                if (j != script)
                    script_total += this.overview.scriptOverview[script][j];
            }

            var row = "{{script}}\t{{called}}\t{{compiled}}\t{{time}}\t{{spend}}<br />";
            row = row.replace("{{script}}", script);
            row = row.replace("{{called}}", this.overview.scriptTimes[script][script]);
            row = row.replace("{{compiled}}", this.overview.scriptTimes[script]["IonCompilation"]);

            if (this.settings.relative)
                row = row.replace("{{time}}", utils.percent(script_total/total)+"%");
            else
                row = row.replace("{{time}}", Math.round(script_total/this.settings.absoluteunit));

            var spend = "";
            for (var j in this.overview.scriptOverview[script]) {
                if (j != script) {
                    if (this.settings.relative)
                        spend += ""+j+": "+utils.percent(this.overview.scriptOverview[script][j]/script_total)+"%, ";
                    else
                        spend += ""+j+": "+Math.round(this.overview.scriptOverview[script][j]/this.settings.absoluteunit)+", ";
                }
            }
            row = row.replace("{{spend}}", spend);
            output += row;
        }

        output += "</pre>";
        this.content.innerHTML = output;
    }

    ScriptOverview.prototype.fullDraw = function () {
        if (this.overviewFinished) {
            this.quickdrawing.style.display = "none";
            this.fulldrawing.style.display = "none";
        } else {
            this.quickdrawing.style.display = "none";
            this.fulldrawing.style.display = "block";
        }

        this.content.innerHTML = "<table id='scriptOverviewTable'></table>";

        var overview = document.getElementById("scriptOverviewTable");
        var thead = overview.createTHead();
        var row = thead.insertRow(0);
        row.insertCell(0).innerHTML = "Script";
        row.insertCell(1).innerHTML = "Times called";
        row.insertCell(2).innerHTML = "Times compiled";
        row.insertCell(3).innerHTML = "Total time";
        row.insertCell(4).innerHTML = "Spend time";
        row.cells[1].className = "sorttable_numeric";
        row.cells[2].className = "sorttable_numeric";
        row.cells[3].className = "sorttable_numeric";
        var tbody = overview.createTBody();
        sorttable.makeSortable(overview);

        var scriptOverviewTable = []

        var total = 0;
        for (var i in this.overview.engineOverview) {
           total += this.overview.engineOverview[i];
        }

        for (var script in this.overview.scriptOverview) {
            if (!this.overview.scriptTimes[script]["IonCompilation"])
                this.overview.scriptTimes[script]["IonCompilation"] = 0
            if (!(script in scriptOverviewTable)) {
                var overview = document.getElementById("scriptOverviewTable").tBodies[0];
                var row = overview.insertRow(overview.rows.length);
                row.insertCell(0);
                row.insertCell(1);
                row.insertCell(2);
                row.insertCell(3);
                row.insertCell(4);
                scriptOverviewTable[script] = row;
            }

            scriptOverviewTable[script].cells[0].innerHTML = script;
            scriptOverviewTable[script].cells[1].innerHTML = this.overview.scriptTimes[script][script];
            scriptOverviewTable[script].cells[2].innerHTML = this.overview.scriptTimes[script]["IonCompilation"];

            var script_total = 0;
            for (var j in this.overview.scriptOverview[script]) {
                if (j != script)
                    script_total += this.overview.scriptOverview[script][j];
            }


            if (this.settings.relative)
                scriptOverviewTable[script].cells[3].innerHTML = utils.percent(script_total/total)+"%";
            else
                scriptOverviewTable[script].cells[3].innerHTML = Math.round(script_total/this.settings.absoluteunit);

            var output = "";
            for (var j in this.overview.scriptOverview[script]) {
                if (j != script) {
                    if (this.settings.relative)
                        output += ""+j+": "+utils.percent(this.overview.scriptOverview[script][j]/script_total)+"%, ";
                    else
                        output += ""+j+": "+Math.round(this.overview.scriptOverview[script][j]/this.settings.absoluteunit)+", ";
                }
            }
            scriptOverviewTable[script].cells[4].innerHTML = output;
        }
    }

    return ScriptOverview;
});
