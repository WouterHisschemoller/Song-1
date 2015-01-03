/**
 * @author Wouter Hisschemöller
 */

(function (WH) {

	/**
	 * @constructor
	 * @param {Object} data Song data object.
	 */
	function Song(data) {
		// array of sequences that form the arrangement of the song
		this.sequences = [];
		this.sequenceIndex = -1;
		this.songLength = 0;
		this.songEvents = [];
		// initialize song structure from loaded json data
		if(data) {
			this.initFromData(data);
		}
	}

	Song.prototype = {

		/**
		 * Initialize song structure from data object.
		 * Create an array of sequences and
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
					songPosition += sequenceData.length * data.song.ticksPerBeat;
					this.songLength = songPosition;
				}
			}
		},

		/**
		 * Scan events within time range.
		 * @param {Number} start Start tick of time range.
		 * @param {Number} end End tick of time range.
		 * @param {Array} playbackQ Events that happen within the time range.
		 */
		scanEvents: function (start, end, playbackQ) {

			// convert transport time to song time
			var localStart = start % this.songLength;
			var localEnd = localStart + (end - start);
			
			// scan patterns in current sequence for events
			if(this.sequenceIndex >= 0 && this.sequenceIndex < this.sequences.length) {
				var events = this.sequences[this.sequenceIndex].scanEvents(start, localStart, localEnd, playbackQ);
			}

			// test if sequences change
			var n = this.sequences.length;
			for(var i = 0; i < n; i++) {
				var startTick = this.sequences[i].startTick;
				if (localStart <= startTick && startTick <= localEnd) {
					// add all-notes-off-on-every-channel event at end of sequence
					this.addScannedSongEvent(start + (startTick - localStart));
					// next sequence index
					this.sequenceIndex++;
				}
			}

			// test if song ends
			if (localStart <= this.songLength && this.songLength <= localEnd) {
				// add all-notes-off-on-every-channel event at end of sequence
				this.addScannedSongEvent(start + (this.songLength - localStart));
				// update scan range for restart of song
				localStart -= this.songLength;
				localEnd -= this.songLength;
				// loop back to to first sequence
				this.sequenceIndex = 0;
			}
			
			if(this.songEvents.length) {
				// scan patterns in current sequence for events
				if(this.sequenceIndex >= 0 && this.sequenceIndex < this.sequences.length) {
					var events = this.sequences[this.sequenceIndex].scanEvents(start, localStart, localEnd, playbackQ);
				}
			}
		}, 

		/**
		 * If song events happened during the last scanEvents(), store them.
		 * @param {Number} time Delay until the event should be performed.
		 */
		addScannedSongEvent: function(time) {
			this.songEvents.push(WH.MidiEvent(time, WH.MidiMessage(
				WH.MidiStatus.CONTROL_CHANGE,
				0,
				WH.MidiController.ALL_SOUND_OFF,
				0))
			);
		}, 

		/**
		 * If song events happened during the last scanEvents(), get them here.
		 * @return {Array} Array of WH.Events
		 */
		getScannedSongEvents: function() {
			var events = this.songEvents;
			this.songEvents = [];
			return events;
		}
	};

	/** 
	 * Exports
	 */
	WH.Song = function (data) {
		return new Song(data);
	};

})(WH);