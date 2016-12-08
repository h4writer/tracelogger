define([], function() {
    function eventify(func) {
        func.events = {};
        func.on = function(name, callback) {
            if (this.events[name] === undefined)
                this.events[name] = []
            this.events[name].push(callback);
        }
        func.fire = function(name) {
            if (this.events[name] === undefined)
                this.events[name] = [];
            for (var i = 0; i < this.events[name].length; i++) {
                this.events[name][i]();
            }
        }
        func.fireAll = function(names) {
            for (var j = 0; j < names.length; j++) {
                var name = names[j]
                this.fire(name);
            }
        }
    }
    return eventify;
});
