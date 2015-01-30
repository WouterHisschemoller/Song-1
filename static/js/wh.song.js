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
		this.beatsPerMinute = 0;
		this.secondsPerBeat = 0;
		this.oldBPM = 0;
		if(data) {
			// initialize song structure from loaded json data
			this.initFromData(data);
		} else {
			this.setBPM(120);
		}
	}

	Song.prototype = {

		/**
		 * Initialize song structure from data object.
		 * Create an array of sequences and
		 * @param {Object} data Song data object.
		 */
		initFromData: function(data) {

			this.setBPM(data.song.beatsPerMinute);

			// create sequences
			var songPosition = 0;
			for(var i = 0; i < data.song.sequences.length; i++) {
				var sequenceId = data.song.sequences[i];
				var sequenceData = WH.findElement(data.sequences, 'id', sequenceId);
				if(sequenceData) {
					// create sequence
					var sequenceLength = sequenceData.length;
					var sequence = WH.Sequence(sequenceData, data.patterns, songPosition, sequenceLength);
					this.sequences.push(sequence);
					songPosition += sequenceLength;
					this.songLength = songPosition;
				}
			}
		},

		/**
		 * Scan events within time range.
		 * @param {Number} start Start of time range in seconds.
		 * @param {Number} end End of time range in seconds.
		 * @param {Array} playbackQ Events that happen within the time range.
		 */
		scanEvents: function (start, end, playbackQ) {

			// convert time in seconds to time in beats
			var start = this.secToBeat(start);
			var end = this.secToBeat(end);
			
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
				var startBeat = this.sequences[i].getStartBeat();
				if (localStart <= startBeat && startBeat <= localEnd) {
					// add all-notes-off-on-every-channel event at end of sequence
					this.addScannedSongEvent(start + (startBeat - localStart));
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
		}, 

		/**
		 * Getter for BPM.
		 * @return {Number} Song tempo in Beats Per Minute.
		 */
		getBPM: function() {
			return this.beatsPerMinute;
		}, 

		/**
		 * Set BPM and update related variables.
		 * @param {Number} Song tempo in Beats Per Minute.
		 * @return {Number} Factor by which the playback speed has changed.
		 */
		setBPM: function(beatsPerMinute) {
			var factor = this.beatsPerMinute / beatsPerMinute;
			this.beatsPerMinute = beatsPerMinute;
			this.secondsPerBeat = 60 / this.beatsPerMinute;
			return factor;
		}, 

		/**
		 * Convert seconds to beats.
		 * @param  {Number} sec Number of seconds
		 * @return {Number} Number of beats.
		 */
		secToBeat: function(sec) {
			return sec / this.secondsPerBeat;
		}
	};

	/** 
	 * Exports
	 */
	WH.Song = function (data) {
		return new Song(data);
	};

})(WH);