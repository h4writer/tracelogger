/**
   Test form input against regular expressions. 
 */
var stringValidateForm = {
	
	version: 1,

	init: function() {
	},
	
	run: function() {
	
		// pw strength
		input = "password1";
		result = /^(?=.{8,})(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*\\W).*$/g.test(input);
		result = /^(?=.{7,})(((?=.*[A-Z])(?=.*[a-z]))|((?=.*[A-Z])(?=.*[0-9]))|((?=.*[a-z])(?=.*[0-9]))).*$/g.test(input);
		result = /(?=.{6,}).*/g.test(input);

		// email
		input = "jaakko.alajoki@futuremark.com";
		result = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(input);

		// phone
		input = "050 342 1252";
		result = /^\([1-9]\d{2}\)\s?\d{3}\-\d{4}$/.test(input);
	
	}
	
}

for (var i=0; i<100000; i++) {
  stringValidateForm.run();
}
