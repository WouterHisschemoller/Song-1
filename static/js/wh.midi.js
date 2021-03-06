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

	function MidiEvent(time, message) {
		this.time = (time || 0);
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

	WH.MidiEvent = function (time, midiMessage) {
		return new MidiEvent(time, midiMessage);
	};

	/**
	 * Constants
	 */
	WH.MidiStatus = {
		NOTE_OFF: 0x80, // 128
		NOTE_ON: 0x90, // 144
		CONTROL_CHANGE: 0xB0, // 176
		SYSTEM_RESET: 0xFF, // 255, 
		META_MESSAGE: 0xFF, // 255
	};

	WH.MidiMetaStatus = {
		MARKER: 6, // start of a sequence in the song
		END_OF_TRACK: 47 // end of the last sequence in the song
	};

	WH.MidiController = {
		ALL_SOUND_OFF: 0x78, // 120, stop all sounds on a all channels
		ALL_NOTES_OFF: 0x7B // 123, stop all sounds on a specific channel
	};

})(WH);