define([], function() {
    function request (files, callback, error_cb) {
        var count = 0;
        var received = new Array(files.length);

        for (var i = 0; i < files.length; i++) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', baseUrl + files[i], true);
            if (files[i].substring(files[i].length-3) == ".tl")
                xhr.responseType = 'arraybuffer';
            xhr.onload = (function (index) {
                return function (data, textStatus, jqXHR) {
                    received[index] = this.response;
                    count++;
                    if (count == files.length)
                        callback(received);
                };
            })(i);
            if (error_cb) {
                xhr.onerror = (function (file) {
                    return function (data, textStatus, jqXHR) {
                        error_cb(baseUrl + file);
                    };
                })(files[i]);
            }
            xhr.send();
        }
    }

    return request
});
