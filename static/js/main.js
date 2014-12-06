
$(function() {

	/**
	 * 
	 */
	this.onDataLoaded = function(data) {
		var view = new View('canvas');

		var song = WH.Song(data, WX.Transport);

		var osc = WX.SimpleOsc();
		osc.to(WX.Master);

		var simpleNoise = WX.SimpleNoise();
		simpleNoise.setId('simpleNoise');
		simpleNoise.to(WX.Master);
		simpleNoise.setView(view);

		var filterNoise = WX.FilterNoise();
		filterNoise.setId('filterNoise');
		filterNoise.to(WX.Master);
		filterNoise.setView(view);

		var pattern1 = WH.Pattern(data.patterns[0]);
		var pattern2 = WH.Pattern(data.patterns[1]);

		WX.Transport.addTarget(0, simpleNoise);
		WX.Transport.addTarget(1, filterNoise);
		WX.Transport.addPattern(pattern1);
		WX.Transport.addPattern(pattern2);
		WX.Transport.setLoop(0, data.song.ticksPerBeat * 16);
		WX.Transport.start();
	}

	$.getJSON('static/json/song.json', this.onDataLoaded.bind(this));
});