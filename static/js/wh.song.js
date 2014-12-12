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
		this.sequenceIndex = -1;
		this.songPattern = WH.Pattern();
		this.songLength = 0;
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

			var songPosition = 0;

			// create sequences
			for(var i = 0; i < data.song.sequences.length; i++) {
				var sequenceId = data.song.sequences[i];
				var sequenceData = WH.findElement(data.sequences, 'id', sequenceId);
				if(sequenceData) {
					// create sequence
					var sequence = WH.Sequence(sequenceData, data.patterns, songPosition);
					this.sequences.push(sequence);

					// add sequence start event to song timeline
					// it's a marker event (data1) with the sequence index as data (data2)
					var midiMessage = WH.MidiMessage(WH.MidiStatus.META_MESSAGE, this.channel, WH.MidiMetaStatus.MARKER, i);
					this.songPattern.push(WH.MidiEvent(songPosition, midiMessage));
					songPosition += sequenceData.length * data.song.ticksPerBeat;

					// if this is the last sequence add an end-of-track event
					if(i == data.song.sequences.length - 1) {
						var midiMessage = WH.MidiMessage(
							WH.MidiStatus.META_MESSAGE, 
							this.channel, 
							WH.MidiMetaStatus.END_OF_TRACK, 
							0);
						this.songPattern.push(WH.MidiEvent(songPosition, midiMessage));
						this.songLength = songPosition;
					}
				}
			}

			// add Song to Transport
			this.transport.addSong(this);
		},

		/**
		 * Scan events within time range.
		 * @param {Number} start Start tick of time range.
		 * @param {Number} end End tick of time range.
		 * @return {Array} Events that happen within the time range.
		 */
		scanEvents: function (start, end) {

			// convert transport time to song time
			var localStart = start % this.songLength;
			var localEnd = localStart + (end - start);
		
			var playbackQ = [];
			
			// scan patterns in current sequence for events
			if(this.sequenceIndex >= 0 && this.sequenceIndex < this.sequences.length) {
				var events = this.sequences[this.sequenceIndex].scanEvents(localStart, localEnd);
				playbackQ = playbackQ.concat(events);
			}

			// scan for song arrangement events
			var events = this.songPattern.scanEventsInTimeSpan(localStart, localEnd);
			if (events) {
				for (var i = 0; i < events.length; i++) {
					var event = events[i];
					var message = event.message;
					switch (message.type) {
						case WH.MidiStatus.META_MESSAGE:
							switch (message.data1) {
								case WH.MidiMetaStatus.MARKER: 
									// TODO: add all-notes-off-on-every-channel event at end of sequence

									// this.switchSequences(message.data2, message.tick);
									this.sequenceIndex++;
									break;
								case WH.MidiMetaStatus.END_OF_TRACK: 
									// update scan range for restart of song
									localStart -= this.songLength;
									localEnd -= this.songLength;
									// loop back to to first sequence
									this.sequenceIndex = 0;
									break;
							}
							break;
					}
				}
			
				// scan patterns in current sequence for events
				if(this.sequenceIndex >= 0 && this.sequenceIndex < this.sequences.length) {
					var events = this.sequences[this.sequenceIndex].scanEvents(localStart, localEnd);
					playbackQ = playbackQ.concat(events);
				}
			}

			return playbackQ;
		}
	};

	/** 
	 * Exports
	 */
	WH.Song = function (data, transport) {
		return new Song(data, transport);
	};

})(WH);