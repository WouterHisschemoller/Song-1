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
		this.transport = transport;
		// array of sequences that form the arrangement of the song
		this.sequences = [];
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
		 */
		initFromData: function(data) {

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
			this.transport.addSongPattern(songPattern);

			// add Song to Transport
			this.transport.addSong(this);
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
							this.switchSequences(data.data2, data.time);
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
		 * @param {Number} time Delay in milliseconds to wait until the switch.
		 */
		switchSequences: function(nextSequenceIndex, time) {
			console.info('Song switchSequences nextSequenceIndex: ', nextSequenceIndex);
			// stop the patterns of the current sequence
			this.transport.clearPatterns();
			// add the patterns of the next sequence to the Transport
			var patterns = this.sequences[nextSequenceIndex].getPatterns();
			this.transport.addPatterns(patterns);
		}
	};

	/** 
	 * Exports
	 */
	WH.Song = function (data, transport) {
		return new Song(data, transport);
	};

})(WH);