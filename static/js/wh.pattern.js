(function (WH) {

	/**
	 * @constructor
	 */
	function Pattern(data) {
		this.events = {};
		this.size = 0;
		if(data) {
			this.initFromData(data);
		}
	}

	Pattern.prototype = {

		/**
		 * Initialize pattern from data object
		 * @param {Object} data Pattern data object.
		 */
		initFromData: function(data) {
			for(var i = 0; i < data.events.length; i++) {
				var e = data.events[i];
				this.push(WH.MidiEvent(Math.floor(e.deltaTime * 480), WH.MidiMessage(e.type, e.channel, e.data1, e.data2)));
			}
		},

		/**
		 * Add an event to the pattern.
		 * @param {MidiEvent} event MIDI Event.
		 * @return {String} ID of the event.
		 */
		push: function (event) {
			var id = WH.getUid4();
			while (this.events.hasOwnProperty(id)) {
				id = WH.getUid4();
			}
			this.events[id] = event;
			this.size++;
			return id;
		}, 

		/**
		 * Find events to be played within a time span
		 * NOTE: this returns event, not event id
		 * 
		 * @param {Number} start Start time in ticks.
		 * @param {Number} end End time in ticks.
		 * @return {Array} An array with the events to be played within the time span.
		 */
		scanEventsInTimeSpan: function (start, end) {
			var bucket = [];
			for (var id in this.events) {
				var event = this.events[id];
				if (event) {
					if (start <= event.tick && event.tick <= end) {
						// add new event with time relative to time span
						bucket.push(WH.MidiEvent((event.tick - start), event.message));
					}
				}
			}
			return (bucket.length > 0) ? bucket : null;
		},
	};

	/** 
	 * Exports
	 */
	WH.Pattern = function (data) {
		return new Pattern(data);
	};

})(WH);