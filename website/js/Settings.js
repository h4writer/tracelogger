define([
    "js/eventify.js"
], function(eventify) {

    function Settings() {
        this.relative = true;
        this.absoluteunit = 10000;
        this.drawcutoff = 0.05;

        this.initDOM();

        eventify(this);
    }

    Settings.prototype.initDOM = function() {
        var a = document.createElement("a");
        a.innerHTML = "settings";
        a.href = "#";
        a.className = "nav";
        a.onclick = function() {
            this.settingspopup.style.display = "block";
        }.bind(this)
        document.body.insertBefore(a, document.getElementsByTagName("h1")[0].nextSibling);

        var dom = ` 
          <h2>Settings</h2>
          <p>Timings:
              <select>
                  <option {{absolute}}>absolute</option>
                  <option {{relative}}>relative</option>
              </select>
          </p>
          <p>Absolute unit: <input type='text' value='{{absoluteunit}}' /> ops/unit</p>
          <p>Min draw size for graph: <input type='text' value='{{drawcutoff}}' /> px</p>
          <p><input type='button' value='close' /></p>
        `;

        var settings = this;
        dom = dom.replace("{{absolute}}", settings.relative ? "" : "SELECTED");
        dom = dom.replace("{{relative}}", settings.relative ? "SELECTED" : "");
        dom = dom.replace("{{absoluteunit}}", settings.absoluteunit);
        dom = dom.replace("{{drawcutoff}}", settings.drawcutoff);

        this.settingspopup = document.createElement("div");
        this.settingspopup.id = "settingspopup"
        this.settingspopup.className = "popup"
        this.settingspopup.innerHTML = dom;
        document.body.appendChild(this.settingspopup);

        var nsettings = {};
        this.settingspopup.getElementsByTagName("select")[0].onchange = function() {
            nsettings.relative = this.value == "relative"
        }
        this.settingspopup.getElementsByTagName("input")[0].onchange = function() {
            nsettings.absoluteunit = this.value
        }
        this.settingspopup.getElementsByTagName("input")[1].onchange = function() {
            nsettings.drawcutoff = this.value
        }
        this.settingspopup.getElementsByTagName("input")[2].onclick = function() {
            var fireEvents = [];
            if (typeof nsettings.relative != "undefined" &&
                nsettings.relative != settings.relative)
            {
                settings.relative = nsettings.relative;
                fireEvents.push("relative");
            }
            if (typeof nsettings.absoluteunit != "undefined" &&
                nsettings.absoluteunit != settings.absoluteunit)
            {
                settings.absoluteunit = nsettings.absoluteunit;
                fireEvents.push("absoluteunit");
            }
            if (typeof nsettings.drawcutoff != "undefined" &&
                nsettings.drawcutoff != settings.drawcutoff)
            {
                settings.drawcutoff = nsettings.drawcutoff;
                fireEvents.push("drawcutoff");
            }
            if (fireEvents.length > 0) {
                fireEvents.push("change");
                this.fireAll(fireEvents);
            }

            this.settingspopup.style.display = "none";

        }.bind(this)

    }
    return Settings
});
