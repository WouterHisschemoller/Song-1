(function (WH) {

	/**
	 * @constructor
	 */
	function Pattern(data) {
		this.events = {};
		this.size = 0;
		this.length = 0;
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

			this.length = data.length * 480;

			for(var i = 0; i < data.events.length; i++) {

				// create event from data
				var event = data.events[i];
				switch(event[0]) {
					case 'note': 
						// note-on
						this.push(WH.MidiEvent(
							Math.floor(event[1] * 480), 
							WH.MidiMessage(
								WH.MidiStatus.NOTE_ON, 
								data.channel, 
								event[3], 
								event[4])));
						// note-off
						this.push(WH.MidiEvent(
							Math.floor((event[1] + event[2]) * 480), 
							WH.MidiMessage(
								WH.MidiStatus.NOTE_OFF, 
								data.channel, 
								event[3], 
								0)));
						break;
				}
			}

			// add end-of-track meta event
			this.push(WH.MidiEvent(
				Math.floor(this.length), 
				WH.MidiMessage(
					WH.MidiStatus.META_MESSAGE, 
					data.channel, 
					WH.MidiMetaStatus.END_OF_TRACK, 
					0)));
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
		 * If the pattern is shorter than the sequence, the pattern will loop.
		 * 
		 * @param {Number} absoluteStart Absolute start tick in Transport playback time.
		 * @param {Number} start Start time in ticks.
		 * @param {Number} end End time in ticks.
		 * @param {Array} playbackQ Events that happen within the time range.
		 */
		scanEventsInTimeSpan: function (absoluteStart, start, end, playbackQ) {

			// convert sequence time to pattern time
			var localStart = start % this.length;
			var localEnd = localStart + (end - start);

			// if the pattern restarts within the current time span, 
			// scan the bit at the start of the next loop as well
			var secondEnd = 0;
			if(localEnd > this.length) {
				var secondStart = 0;
				secondEnd = localEnd - this.length;
			}

			// get the events
			for (var id in this.events) {
				var event = this.events[id];
				if (event) {
					if (localStart <= event.tick && event.tick <= localEnd) {
						// add new event with time relative to time span
						this.addEventToQueue(WH.MidiEvent((absoluteStart + (event.tick - localStart)), event.message), playbackQ);
					}
					if(secondEnd && secondStart <= event.tick && event.tick <= secondEnd) {
						// add new event with time relative to time span
						this.addEventToQueue(WH.MidiEvent((absoluteStart + (event.tick - secondStart)), event.message), playbackQ);
					}
				}
			}
		},

		/**
		 * Add an event to the playback queue.
		 * @param {WH.MidiEvent} event The MIDI event to play.
		 * @param {Array} playbackQ Events that happen within the time range.
		 */
		addEventToQueue: function(event, playbackQ) {
			// note-off events to the start of the queue so they're handled first.
			if(event.message.type == WH.MidiStatus.NOTE_OFF) {
				playbackQ.unshift(event);
			} else {
				playbackQ.push(event);
			}
		}
	};

	/** 
	 * Exports
	 */
	WH.Pattern = function (data) {
		return new Pattern(data);
	};

})(WH);