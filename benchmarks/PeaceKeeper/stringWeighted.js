/** 
 * String tests based on profiled data.
 */
var stringWeighted = {
	
	version: 1,

	init: function() {
	},
	
	run: function() {
		
		var s0 = "Nulla blandit congue odio. Cras rutrum nulla a est. Sed eros ligula, blandit in, aliquet id.";
		var s1 = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
		var s2 = "Proin varius justo vitae dolor.";
		var s3 = "Aliquam sed eros. Maecenas viverra. Duis risus enim, rhoncus posuere, sagittis tincidunt.";
		var s4 = "Ullamcorper at, purus. Quisque in lectus vitae tortor rhoncus dictum. Ut molestie semper sapien. ";
		var s5 = "Suspendisse potenti. Sed quis elit. Suspendisse potenti. Aenean sodales.";
		var s6 = "Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. ";
		var s7 = "Phasellus pulvinar venenatis augue. Suspendisse mi. Suspendisse id velit. ";
		var s8 = "Proin eleifend pharetra augue. Praesent vestibulum metus vitae pede.";
		var s9 = "Cras augue lectus, venenatis sed, molestie viverra, ornare at, justo. ";
		
		// Higlight word.
		var r = "tortor";
		var r2 = "<b>tortor</b>";
		s0.replace(r, r2);
		s1.replace(r, r2);
		s2.replace(r, r2);
		s3.replace(r, r2);
		s4.replace(r, r2);
		s5.replace(r, r2);
		s6.replace(r, r2);
		s7.replace(r, r2);
		s8.replace(r, r2);
		s9.replace(r, r2);
		
		// Split to words.
		var words = s0.split(" ");
		var words = s1.split(" ");
		var words = s2.split(" ");
		var words = s3.split(" ");
		var words = s4.split(" ");
		var words = s5.split(" ");
		var words = s6.split(" ");
		var words = s7.split(" ");
		var words = s8.split(" ");
		var words = s9.split(" ");
		
		// Look for words.
		var f0 = s0.indexOf("odio");
		var f1 = s1.indexOf("dolor");
		var f2 = s2.indexOf("vitae");
		var f3 = s3.indexOf("eros");
		var f4 = s4.indexOf("ad");
		
	}
	
}

for (var i=0; i<10000; i++) {
  stringWeighted.run();
}
