/**
 * @author Wouter Hisschemöller
 */

(function (WH) {

	/**
	 * @constructor
	 * @param {Object} data Song data object.
	 * @param {WX.Transport} transport Song playback engine.
	 */
	function Song(data, transport) {
		// array of sequences that form the arrangement of the song
		this.sequences = [];
		// the channel on which Transport sends song events to Song
		this.channel = 100;
		// initialize song structure from loaded json data
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

			// channel number on which WX.Transport send events to WH.Song
			this.channel = data.song.songChannel;

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
					var midiMessage = WH.MidiMessage(WH.MidiStatus.META_MESSAGE, this.channel, WH.MidiMetaStatus.MARKER, i);
					songPattern.push(WH.MidiEvent(songPosition, midiMessage));
					songPosition += sequenceData.length * data.song.ticksPerBeat;

					// if this is the last sequence add an end-of-track event
					if(i == data.song.sequences.length - 1) {
						var midiMessage = WH.MidiMessage(WH.MidiStatus.META_MESSAGE, this.channel, WH.MidiMetaStatus.END_OF_TRACK, 0);
						songPattern.push(WH.MidiEvent(songPosition, midiMessage));
					}
				}
			}

			// add song timeline to transport
			transport.addSongPattern(songPattern);

			// add Song to Transport as if it were a generator
			// so it receives events to trigger sequence changes
			transport.addTarget(this.channel, this);
		},

		/**
		 * Receive timed data from WX.Transport.
		 * @param {string} action Type of event received.
		 * @param {Object} data Properties data1 {number}, data2 {number}, time {number}.
		 */
		onData: function (action, data) {
			switch (action) {
				case WH.MidiStatus.META_MESSAGE:
					switch (data.data1) {
						case WH.MidiMetaStatus.MARKER: 
							this.switchSequences(data.data2);
							break;
						case WH.MidiMetaStatus.END_OF_TRACK: 
							console.log('end-of-track: ', data.data2);
							break;
					}
					break;
				default: 
					return;
			}
		}, 

		/**
		 * Stop and remove the patterns from the old sequence and add the new ones.
		 * @param {Number} nextSequenceIndex Index of the next sequence to play.
		 */
		switchSequences: function(nextSequenceIndex) {
			WX.Log.info('nextSequenceIndex: ', nextSequenceIndex);

		}
	};

	/** 
	 * Exports
	 */
	WH.Song = function (data, transport) {
		return new Song(data, transport);
	};

})(WH);