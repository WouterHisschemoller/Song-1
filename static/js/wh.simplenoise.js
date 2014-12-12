/**
 * SimpleNoise generates noise and is triggered by MIDI style events.
 * It doesn't use pitch information.
 * 
 * @wapl SimpleNoise
 * @author Wouter Hisschemöller
 * @version 0.1
 */
(function (WX, WH) {

	'use strict';

	/**
	 * REQUIRED: plug-in constructor
	 * @constructor
	 */
	function SimpleNoise(id, view, preset) {

	    // REQUIRED: adding necessary modules
	    WX.PlugIn.defineType(this, 'Generator');

	    this._bufferGaus = this.createGaussian(9.73);

	    this._noise = WX.Source();
	    this._noise.buffer = this.createGaussian(10.0);
	    this._noise.loopStart = Math.random() * 10.0;
	    this._noise.loop = true;
		this._amp = WX.Gain();
		this._amp.gain.value = 0.0;
	    this._noise.to(this._amp).to(this._output);
	    this._noise.start(0);
	}

	/** 
	 * REQUIRED: plug-in prototype
	 */
 	SimpleNoise.prototype = {
 		// REQUIRED: plug-in info
		info: {
			name: 'SimpleNoise',
			version: '0.0.1',
			api_version: '1.0.0-alpha',
			author: 'Wouter Hisschemöller',
			type: 'Generator',
			description: 'Noise source'
		},

		// REQUIRED: plug-in default preset
		defaultPreset: {
			oscType: 'Noise'
		},

		setId: function(id) {
			this._id = id;
		}, 

		setView: function(view) {
			this._view = view;
		}, 

		/**
		 * Pre-generation of gaussian white noise.
		 * @see http://www.musicdsp.org/showone.php?id=113
		 * 
		 * @param {number} duration - Duration of noise in seconds.
		 * @return {AudioNode} - WA Buffer object.
		 * @see http://www.w3.org/TR/webaudio/#Buffer
		 */
		createGaussian: function (duration) {
			var length = Math.floor(WX.srate * duration);
			var noiseFloat32 = new Float32Array(length);
			for (var i = 0; i < length; i++) {
				var r1 = Math.log(Math.random()), r2 = Math.PI * Math.random();
				noiseFloat32[i] = Math.sqrt(-2.0 * r1) * Math.cos(2.0 * r2) * 0.5;
			}
			var noiseBuffer = WX.Buffer(2, length, WX.srate);
			noiseBuffer.getChannelData(0).set(noiseFloat32, 0);
			noiseBuffer.getChannelData(1).set(noiseFloat32, 0);
			return noiseBuffer;
		}, 

		/**
		 * Start generating sound.
		 * 
		 * @param {number} pitch - MIDI pitch.
		 * @param {number} velocity - MIDI velocity.
		 * @param {number} time - time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
			time = (time || WX.now);
			this._amp.gain.set((velocity / 127) / 3, [time, 0.00], 3);
		},

		/**
		 * Stop generating sound.
		 * 
		 * @param {number} time Time to delay action.
		 */
		noteOff: function (time) {
			time = (time || WX.now);
			this._amp.gain.set(0.0, [time, 0.00], 3); // AudioParam.set(value, time, rampType)
		},

		/**
		 * Receive timed data from WX.Transport.
		 * 
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

			this._view.onData(action, data, this._id);
		}
 	};

	// REQUIRED: extending plug-in prototype with modules
	WX.PlugIn.extendPrototype(SimpleNoise, 'Generator');

	// REQUIRED: registering plug-in into WX ecosystem
	WX.PlugIn.register(SimpleNoise);

})(WX, WH);