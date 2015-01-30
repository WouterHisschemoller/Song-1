(function (WH) {

	/**
	 * @constructor
	 * @param {Object} sequenceData Sequence data object.
	 * @param {Array} patternData Array of pattern data objects.
	 * @param {Number} startBeat Sequence start beat in song arrangement.
	 * @param {Number} lengthInBeats Sequence length measured in beats.
	 */
	function Sequence(sequenceData, patternData, startBeat, lengthInBeats) {
		this.patterns = [];
		this.startBeat = startBeat;
		this.lengthInBeats = lengthInBeats;
		if(sequenceData && patternData) {
			this.initFromData(sequenceData, patternData);
		}
	}

	Sequence.prototype = {

		/**
		 * Initialize sequence from sequenceData object
		 * and construct it's patterns with the patternData
		 * @param {Object} sequenceData Sequence data object.
		 * @param {Array} patternData Array of pattern data objects.
		 */
		initFromData: function(sequenceData, patternData) {
			for(var i = 0; i < sequenceData.patterns.length; i++) {
				for(var j = 0; j < patternData.length; j++) {
					if(sequenceData.patterns[i] == patternData[j].id) {
						var pattern = WH.Pattern(patternData[j]);
						this.patterns.push(pattern);
					}
				}
			}
		}, 

		/**
		 * Scan events within time range.
		 * @param {Number} absoluteStart Absolute start beat in Transport playback time.
		 * @param {Number} start Start of time range in beats.
		 * @param {Number} end End of time range in beats.
		 * @param {Array} playbackQ Events that happen within the time range.
		 */
		scanEvents: function (absoluteStart, start, end, playbackQ) {
			// convert song time to sequence time
			var localStart = start - this.startBeat;
			// localEnd should never be more than the length of the sequence
			// to avoid double notes when a sequence and pattern restart coincide
			var localEnd = Math.min(end - this.startBeat, this.lengthInBeats);
			// scan for events
			for (var i = 0; i < this.patterns.length; i++) {
				var events = this.patterns[i].scanEventsInTimeSpan(absoluteStart, localStart, localEnd, playbackQ);
			}
		}, 

		/**
		 * Getter for startBeat.
		 * @return {Number} startBeat Time at which this sequence starts.
		 */
		getStartBeat: function() {
			return this.startBeat;
		}
	};

	/** 
	 * Exports
	 */
	WH.Sequence = function (sequenceData, patternData, startBeat, lengthInBeats) {
		return new Sequence(sequenceData, patternData, startBeat, lengthInBeats);
	};

})(WH);