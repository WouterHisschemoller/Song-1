(function (WH) {

	/**
	* @param data1 {Number} pitch
	* @param data2 {Number} velocity
	*/
	function MidiMessage(type, channel, data1, data2) {
		this.type = (type || 0);
		this.channel = (channel || 0);
		this.data1 = (data1 || 0);
		this.data2 = (data2 || 0);
	}

	MidiMessage.prototype = {
	};

	function MidiEvent(tick, message) {
		this.tick = (tick || 0);
		this.message = (message || 0);
	}

	MidiEvent.prototype = {
	};

	/** 
	 * Exports
	 */
	WH.MidiMessage = function (type, channel, data1, data2) {
		return new MidiMessage(type, channel, data1, data2);
	};

	WH.MidiEvent = function (tick, midiMessage) {
		return new MidiEvent(tick, midiMessage);
	};

	/**
	 * Constants
	 */
	WH.MidiStatus = {
		NOTE_OFF: 128, 
		NOTE_ON: 144, 
		SYSTEM_RESET: 255, 
		META_MESSAGE: 255
	};

	WH.MidiMetaStatus = {
		MARKER: 6, 
		END_OF_TRACK: 47
	};

})(WH);