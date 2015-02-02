
$(function() {

	/**
	 * JSON song arrangement data loaded.
	 * @param {JSON} data JSON data containing the song arrangement.
	 */
	this.onDataLoaded = function(data) {
		var view = new View('canvas');

		var song = WH.Song(data);

		// var wave = WX.Wave();
		// wave.init('wavedisplay', 2);

		var osc = WX.SimpleOsc();
		osc.to(WX.Master);

		var noise = WX.Noise();
		noise.setId('noise');
		noise.to(WX.Master);
		noise.setView(view);

		var filterNoise = WX.FilterNoise();
		filterNoise.setId('filterNoise');
		filterNoise.to(WX.Master);
		filterNoise.setView(view);

		var click = WX.Click();
		click.to(WX.Master);

		var chord = WX.Chord();
		chord.to(WX.Master);

		var kick = WX.Kick();
		kick.to(WX.Master);

		var bass = WX.Bass();
		bass.to(WX.Master);

		var transport = WH.Transport();
		transport.setSong(song);
		transport.addTarget(0, noise);
		transport.addTarget(1, filterNoise);
		transport.addTarget(2, click);
		transport.addTarget(3, chord);
		transport.addTarget(4, kick);
		transport.addTarget(5, bass);

		// short start delay to allow the app to initialize
		setTimeout(function() {
			transport.start();
		}, 200);

		// pause / play by pressing space bar
		$(document).on('keyup', function(e) {
			if(e.keyCode == 32) {
				if(transport.isRunning) {
					transport.pause();
				} else {
					transport.start();
				}
			}
		}.bind(this));
	}

	$.getJSON('static/json/song.json', this.onDataLoaded.bind(this));
});