(function (WH) {

	/**
	 * @constructor
	 * @param {Object} sequenceData Sequence data object.
	 * @param {Array} patternData Array of pattern data objects.
	 */
	function Sequence(sequenceData, patternData) {
		this.patterns = [];
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
				var pattern = WH.Pattern(patternData[i]);
				this.patterns.push(pattern);
			}
		}, 

		/**
		 * Getter for patterns array.
		 * @return {Array} Array of WH.Pattern objects.
		 */
		getPatterns: function() {
			return this.patterns;
		}
	};

	/** 
	 * Exports
	 */
	WH.Sequence = function (sequenceData, patternData) {
		return new Sequence(sequenceData, patternData);
	};

})(WH);