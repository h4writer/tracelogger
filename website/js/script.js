/* TL */
var TLClass = function (){};

/* Request to load a particular page */
TLClass.prototype.request = function (page, callback) {
    var url = window.location.protocol + '//' +
              window.location.host +
              window.location.pathname;
    if (url[url.length - 1] != '/')
        url += '/';
    url += 'data/';

    var success = function (data, textStatus, jqXHR) {
        callback(data);
    };

    $.ajax(url + page, {
      async: true,
      success: success,
      cache: false
    });
};

/* Init the frontpage graphs */
TLClass.prototype.frontPage = function () {
  this.reset();
  for (var j=0; j < TLData["suites"].length; j++) {
    for (var i=0; i < TLData["engines"].length; i++) {
      var graph = new TLGraph(TLData["engines"][i], TLData["suites"][j]);
      $("#content .contentWidth").append(graph.dom);
    }
  }
};

/* Init the page showing a particular suite */
TLClass.prototype.suitePage = function (engineId, suiteName) {
  this.reset();

  $("#content .contentWidth").append("<div><a href='?'>&lt; back</a></div>");

  var engine = undefined;
  for (var i=0; i < TLData["engines"].length; i++) {
    if (TLData["engines"][i]["ID"] == engineId) {
      engine = TLData["engines"][i];
      break;
    }
  }

  if (!engine)
    return;

  for (var i=0; i < TLData["suites"].length; i++) {
    if (TLData["suites"][i]["name"] == suiteName) {
      for (var j=0; j < TLData["suites"][i]["scripts"].length; j++) {
        var graph = new TLGraph(engine, TLData["suites"][i], TLData["suites"][i]["scripts"][j]);
        $("#content .contentWidth").append(graph.dom);
      }
      break;
    }
  }
};

/* Reset the page */
TLClass.prototype.reset = function () {
  $("#content .contentWidth").html("");
}


/* Graph */
var TLGraph = function(engine, suite, script) {
  if (!script)
    script = 0;

  this.engine = engine;
  this.suite = suite;
  this.script = script;
  this.dom = $("<div class='graph'>"+
               "<div class='graph_title'>"+
               "<h2>"+this.suite["name"]+" - "+this.engine["name"]+(script?" - "+script["name"]:"")+"</h2>"+
               (!script?"<a href='?engine="+engine["ID"]+"&suite="+suite["name"]+"' class='more'>View individual scripts</a>":
                        "<a href='tracelogger.html?data=data-"+suite["name"]+"-"+engine["name"]+"-"+script["name"]+".json' class='more'>View details</a>")+
               "</div>"+
               "<div class='placeholder' style='width:550px; height:350px'></div>"+
               "</div>");
  this.loading = true;

  var page = "front-"+this.engine["ID"]+"-"+this.suite["name"]+(script?"-"+script["name"]:"")+".json";
  TL.request(page, this.init.bind(this));
};

TLGraph.prototype.init = function(data) {
  this.placeholder = this.dom.find(".placeholder");
  var plot = $.plot(this.placeholder, data, {
	    series: {
		    stackpercent: true,
		    lines: {
			    show: true,
			    fill: true,
			    steps: false,
		    },
		    bars: {
			    show: false,
			    barWidth: 0.6
		    },
        points: {
          show: true
        }
	    },
      legend: {
        sorted:"reverse",
        position: "nw"
      },
      grid: {
        hoverable: true,
        clickable: true,
		    autoHighlight: false
      },
	    crosshair: {
		    mode: "x"
	    },
      xaxis: { mode: "time" },
      yaxis: { max:100 }  // so the yaxis is from 0 to 100
    }
  );

  // fix the widths so they don't jump around
  var legends = this.placeholder.find(".legendLabel");
  legends.each(function () {
	  $(this).css('width', $(this).width());
    $(this).text($(this).text().replace(/=.*/, ""));
  });

  var updateLegendTimeout = null;
  var latestPosition = null;

  var updateLegend = function() {
	  updateLegendTimeout = null;
	  var pos = latestPosition;

	  var axes = plot.getAxes();
	  if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
		  pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) {
		  return;
	  }

	  var i, j, dataset = plot.getData();

    // Get total
    var total = 0
	  for (i = 0; i < dataset.length; ++i) {
		  var series = dataset[i];

		  // Find the nearest points, x-wise
		  for (j = 0; j < series.data.length; ++j) {
			  if (series.data[j][0] > pos.x) {
				  break;
			  }
		  }
      if (j != 0)
		    total += series.data[j - 1][1];
	  }

	  for (i = 0; i < dataset.length; ++i) {
		  var series = dataset[i];

		  // Find the nearest points, x-wise
		  for (j = 0; j < series.data.length; ++j) {
			  if (series.data[j][0] > pos.x) {
				  break;
			  }
		  }

      var p1 = (j == 0) ? 0 : series.data[j - 1][1];
		  legends.eq(dataset.length-i-1).text(series.label.replace(/=.*/, "= " + (p1*100/total).toFixed(2))+"%");
	  }
  }

  this.placeholder.bind("plothover",  function (event, pos, item) {
	  latestPosition = pos;
	  if (!updateLegendTimeout) {
		  updateLegendTimeout = setTimeout(updateLegend, 50);
	  }
  });

  this.loading = false;
}

function getParameters() {
  var searchString = window.location.search.substring(1),
      params = searchString.split("&"),
      hash = {};

  if (searchString == "") return {};
  for (var i = 0; i < params.length; i++) {
    var val = params[i].split("=");
    hash[unescape(val[0])] = unescape(val[1]);
  }
  return hash;
}

var TL;
$(function() {
  TL = new TLClass();

  var params = getParameters();
  if (params["engine"] && params["suite"]) {
    TL.suitePage(params["engine"]*1, params["suite"]);
    return;
  }

  TL.frontPage()
});

