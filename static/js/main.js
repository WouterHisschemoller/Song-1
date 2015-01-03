
$(function() {

	/**
	 * 
	 */
	this.onDataLoaded = function(data) {
		var view = new View('canvas');

		var song = WH.Song(data);

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

		// Initialize Transport with song settings.
		WX.Transport.init(data.song.ticksPerBeat, data.song.beatsPerMinute);
		WX.Transport.addSong(song);
		WX.Transport.addTarget(0, noise);
		WX.Transport.addTarget(1, filterNoise);
		WX.Transport.addTarget(2, click);
		WX.Transport.addTarget(3, chord);
		WX.Transport.start();
	}

	$.getJSON('static/json/song.json', this.onDataLoaded.bind(this));
});