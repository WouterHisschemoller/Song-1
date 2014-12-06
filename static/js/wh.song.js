(function (WH) {

	/**
	 * @constructor
	 * @param {Object} data Song data object.
	 * @param {WX.Transport} transport Song playback engine.
	 */
	function Song(data, transport) {
		this.sequences = [];
		if(data) {
			this.initFromData(data, transport);
		}
	}

	Song.prototype = {

		/**
		 * Initialize song structure from data object.
		 * Create an array of sequences and
		 * build a song timeline pattern to add to the transport.
		 * @param {Object} data Song data object.
		 * @param {WX.Transport} transport Song playback engine.
		 */
		initFromData: function(data, transport) {

			// Initialize Transport with song settings.
			transport.init(data.song.ticksPerBeat, data.song.beatsPerMinute);

			// song timeline pattern 
			var songPattern = WH.Pattern();
			var songPosition = 0;

			// create sequences
			for(var i = 0; i < data.song.sequences.length; i++) {
				var sequenceId = data.song.sequences[i];
				var sequenceData = WH.findElement(data.sequences, 'id', sequenceId);
				if(sequenceData) {
					// create sequence
					var sequence = WH.Sequence(sequenceData, data.patterns);
					this.sequences.push(sequence);

					// add sequence start event to song timeline
					// it's a marker event (data1) with the sequence index as data (data2)
					var midiMessage = WH.MidiMessage(WH.MidiStatus.META_MESSAGE, 0, WH.MidiMetaStatus.MARKER, i);
					songPattern.push(WH.MidiEvent(songPosition, midiMessage));
					songPosition += sequenceData.length * data.song.ticksPerBeat;

					// if this is the last sequence add an end-of-track event
					if(i == data.song.sequences.length - 1) {
						var midiMessage = WH.MidiMessage(WH.MidiStatus.META_MESSAGE, 0, WH.MidiMetaStatus.END_OF_TRACK, 0);
					}
				}
			}

			// add song timeline to transport
		}
	};

	/** 
	 * Exports
	 */
	WH.Song = function (data, transport) {
		return new Song(data, transport);
	};

})(WH);