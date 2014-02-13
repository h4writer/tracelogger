/**
 * Array operaions based on profiled data.
 */
var arrayWeighted = {
	
	version: 1,
	

	init: function() {
	
	},
	
	run: function() {
	
		
		// Create arrays.
		var a = ["Afghanistan","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan"];
		var b = ["Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia-Herzegovina","Botswana","Bouvet Island","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi"];
		var c = ["Cambodia","Cameroon","Canada","Cape Verde","Cayman Islands","Central African Republic","Chad","Chile","China","Christmas Island","Cocos (Keeling) Islands","Colombia","Comoros","Congo, Democratic Republic of the (Zaire)","Congo, Republic of","Cook Islands","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic"];
		var d = ["Denmark","Djibouti","Dominica","Dominican Republic"];
		var e = ["Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia"];
		var f = ["Falkland Islands","Faroe Islands","Fiji","Finland","France","French Guiana"];
		var g = ["Gabon","Gambia","Georgia","Germany","Ghana","Gibraltar","Greece","Greenland","Grenada","Guadeloupe (French)","Guam (USA)","Guatemala","Guinea","Guinea Bissau","Guyana"];
		var h = ["Haiti","Holy See","Honduras","Hong Kong","Hungary"];
		var i = ["Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast (Cote D`Ivoire)"];
		var j = ["Jamaica","Japan","Jordan"];
		var k = ["Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan"];
		var l = ["Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg"];
		var m = ["Macau","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Martinique (French)","Mauritania","Mauritius","Mayotte","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Montserrat","Morocco","Mozambique","Myanmar"];
		var n = ["Namibia","Nauru","Nepal","Netherlands","Netherlands Antilles","New Caledonia (French)","New Zealand","Nicaragua","Niger","Nigeria","Niue","Norfolk Island","North Korea","Northern Mariana Islands","Norway"];
		var o = ["Oman"];
		var p = ["Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Pitcairn Island","Poland","Polynesia (French)","Portugal","Puerto Rico"];
		var q = ["Qatar"];
		var r = ["Reunion","Romania","Russia","Rwanda"];
		var s = ["Saint Helena","Saint Kitts and Nevis","Saint Lucia","Saint Pierre and Miquelon","Saint Vincent and Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Suriname","Svalbard and Jan Mayen Islands","Swaziland","Sweden","Switzerland","Syria"];
		var t = ["Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste (East Timor)","Togo","Tokelau","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Turks and Caicos Islands","Tuvalu"];
		var u = ["Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan"];
		var v = ["Vanuatu","Venezuela","Vietnam","Virgin Islands"];
		var w = ["Wallis and Futuna Islands"];
		var y = ["Yemen"];
		var z = ["Zambia","Zimbabwe"];
		
		// Push to main list.
		var countries = new Array();
		countries.push(a);
		countries.push(b);
		countries.push(c);
		countries.push(d);
		countries.push(e);
		countries.push(f);
		countries.push(g);
		countries.push(h);
		countries.push(i);
		countries.push(j);
		countries.push(k);
		countries.push(l);
		countries.push(m);
		countries.push(n);
		countries.push(o);
		countries.push(p);
		countries.push(q);
		countries.push(r);
		countries.push(s);
		countries.push(t);
		countries.push(u);
		countries.push(v);
		countries.push(w);
		countries.push(y);
		countries.push(z);
		
		// Slice first three from vocals.
		var as = a.slice(0, 3);
		var es = e.slice(0, 3);
		var is = i.slice(0, 3);
		var os = o.slice(0, 1);
		var us = u.slice(0, 3);
		var ys = y.slice(0, 1);

		var bs = b.slice(0, 3);
		var cs = c.slice(0, 3);
		
		// Join these to strings.
		var as = as.join(",");
		var es = es.join(",");
		var is = is.join(",");
		var os = os.join(",");
		var us = us.join(",");
		var ys = ys.join(",");

		// Concat the most rare names.
		var rare = new Array();
		rare.concat(o);
		rare.concat(q);
		rare.concat(y);

		// Pop the rare ones.
		var or = o.pop();
		var qr = q.pop();
		var yr = y.pop();
		
		// Remove items from the list.
		s.splice(0, 10);
		
	}
	
}

for (var i=0; i<10000; i++) {
  arrayWeighted.run();
}
