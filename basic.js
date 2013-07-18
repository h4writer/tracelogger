var span = document.createElement("DIV");
span.className = "hover";

document.addEventListener("DOMContentLoaded", function(){
    document.body.appendChild(span);
}, false);

var i = 0

document.addEventListener('mousemove',
    function(e){
        var elem = e.target || e.srcElement;
        var x = e.pageX;
        var y = e.pageY;

        //document.title = (i++)+elem.tagName;
        //console.log(elem)

        if(elem.tagName == "SPAN") {
            span.style.left = (x+25)+"px";
            span.style.top = (y+25)+"px";
            span.style.display = "block";
            data = elem.getAttribute("info");
            if (data == null)
                data = elem.parentNode.getAttribute("info");
            span.innerHTML = data.replace(/;/g, "<br />");
        } else if (elem.tagName == "BODY") {
            span.style.display = "none";
        }
},true);

