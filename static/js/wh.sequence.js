(function (WH) {

	/**
	 * @constructor
	 * @param {Object} sequenceData Sequence data object.
	 * @param {Array} patternData Array of pattern data objects.
	 * @param {Number} startTick Sequence start tick in song arrangement.
	 */
	function Sequence(sequenceData, patternData, startTick) {
		this.patterns = [];
		this.startTick = startTick;
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
		 * @param {Number} absoluteStart Absolute start tick in Transport playback time.
		 * @param {Number} start Start tick of time range.
		 * @param {Number} end End tick of time range.
		 * @param {Array} playbackQ Events that happen within the time range.
		 */
		scanEvents: function (absoluteStart, start, end, playbackQ) {
			// convert song time to sequence time
			var localStart = start - this.startTick;
			var localEnd = end - this.startTick;
			// scan for events
			for (var i = 0; i < this.patterns.length; i++) {
				var events = this.patterns[i].scanEventsInTimeSpan(absoluteStart, localStart, localEnd, playbackQ);
			}
		}, 

		/**
		 * Getter for startTick.
		 * @return {Number} startTick Time at which this sequence starts.
		 */
		getStartTick: function() {
			return this.startTick;
		}
	};

	/** 
	 * Exports
	 */
	WH.Sequence = function (sequenceData, patternData, startTick) {
		return new Sequence(sequenceData, patternData, startTick);
	};

})(WH);