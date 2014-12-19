/**
 * Click generates a short percussive click sound.
 * 
 * 
 * @wapl Click
 * @author Wouter Hisschemöller
 * @version 0.1
 */
(function (WX, WH) {

	'use strict';

	/**
	 * [ClickVoice description]
	 * @constructor
	 * @param {Click} generator Click generator that plays these voices.
	 * @param {AudioBuffer} buffer AudioBuffer containing the click sample.
	 * @param {[type]} [varname] [description]
	 */
	function ClickVoice(output, buffer) {
	    this._src = WX.Source();
	    this._src.buffer = buffer;
	    this._gain = WX.Gain();
	    this._gain.gain.value = 1.0;
	    this._src.to(this._gain).to(output);
	}

	ClickVoice.prototype = {
		/**
		 * Start generating sound.
		 * @param {number} pitch MIDI pitch.
		 * @param {number} velocity MIDI velocity.
		 * @param {number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
			this._src.start(time);
		},

		/**
		 * Stop generating sound.
		 * @param {number} time Time to delay action.
		 */
		noteOff: function (time) {
			this._src.stop(time);
		}
	};

	/**
	 * @constructor
	 */
	function Click(id, view, preset) {
	    WX.PlugIn.defineType(this, 'Generator');

	    this.buffer = this.createClick();
	    this.voices = [];
	    this.numVoices = 0;
	}

 	Click.prototype = {
 		
		info: {
			name: 'Click',
			version: '0.0.1',
			api_version: '1.0.0-alpha',
			author: 'Wouter Hisschemöller',
			type: 'Generator',
			description: 'Click sound generator'
		},

		defaultPreset: {
		}, 

		/**
		 * Generate a sample buffer containing the click sound.
		 * @return {AudioBuffer} Audio buffer with created click sample.
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
		 */
		createClick: function() {
			// duration in seconds
			var clickDuration = 0.001;
			var sampleDuration = 0.5;
			var clickLength = Math.floor(WX.srate * clickDuration);
			var sampleLength = Math.floor(WX.srate * sampleDuration);
			var clickFloat32 = new Float32Array(sampleLength);
			for (var i = 0; i < sampleLength; i++) {
				clickFloat32[i] = i < clickLength ? 1 : 0;
			}
			var clickBuffer = WX.Buffer(2, sampleLength, WX.srate);
			clickBuffer.getChannelData(0).set(clickFloat32, 0);
			clickBuffer.getChannelData(1).set(clickFloat32, 0);
			return clickBuffer;
		}, 

		/**
		 * Start generating sound.
		 * @param {Number} pitch MIDI pitch, value between 0 and 128
		 * @param {Number} velocity MIDI velocity.
		 * @param {Number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
			time = (time || WX.now);
			var voice = new ClickVoice(this._output, this.buffer);
			this.voices.push(voice);
			this.numVoices++;
			voice.noteOn(pitch, velocity, time);
		},

		/**
		 * Stop generating sound.
		 * @param {Number} time Time to delay action.
		 */
		noteOff: function (pitch, velocity, time) {
			time = (time || WX.now);
			var playing = this.voices[pitch];
			for (var i = 0; i < this.voices.length; i++) {
				this.voices[i].noteOff(pitch, velocity, time);
				this.numVoices--;
			}
			this.voices = [];
		},

		/**
		 * Receive timed data from WX.Transport.
		 * @param {string} action Type of event received.
		 * @param {Object} data Properties data1 {number}, data2 {number}, time {number}.
		 */
		onData: function (action, data) {
			switch (action) {
				case WH.MidiStatus.NOTE_ON:
					this.noteOn(data.data1, data.data2, data.time);
					break;
				case WH.MidiStatus.NOTE_OFF:
					this.noteOff(data.time);
					break;
				case WH.MidiStatus.CONTROL_CHANGE:
					switch(data.data1) {
						case WH.MidiController.ALL_NOTES_OFF: 
							this.noteOff(data.time);
							break;
					}
					break;
				default: 
					return;
			}

			// this._view.onData(action, data, this._id);
		}
	};

	WX.PlugIn.extendPrototype(Click, 'Generator');

	WX.PlugIn.register(Click);

})(WX, WH);