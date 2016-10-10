
define([], function() {
    function GetUrlValue(VarSearch){
        var SearchString = window.location.search.substring(1);
        var VariableArray = SearchString.split('&');
        for(var i = 0; i < VariableArray.length; i++){
            var KeyValuePair = VariableArray[i].split('=');
            if(KeyValuePair[0] == VarSearch){
                return KeyValuePair[1];
            }
        }
        return "";
    }

    function lastModified(file, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", baseUrl + file);
        xhr.onload = function getHeaderTime() {
            callback(this.getResponseHeader("Last-Modified"));
        }
        xhr.send();
    }

    function percent(double) {
      return Math.round(double*10000)/100;
    }

    return {
        GetUrlValue: GetUrlValue,
        lastModified: lastModified,
        percent: percent
    }
});
