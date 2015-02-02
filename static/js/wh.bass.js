/**
 * Bass generates bass sounds.
 * It's a sine oscillator with a very short attack and short release
 * followed by a waveshaper distortion.
 * 
 * @wapl Bass
 * @author Wouter Hisschemöller
 * @version 0.1
 */
(function (WX, WH) {

	'use strict';

	/**
	 * BassVoice is a single voice used by the Bass generator defined below.
	 * A BassVoice object is used only once and then discarded.
	 * @constructor
	 */
	function BassVoice(output) {
		this._osc = WX.OSC();
	    this._amp = WX.Gain();
	    this._amp.gain.value = 0.0;
	    this._osc.to(this._amp).to(output);
	}

	BassVoice.prototype = {
		
		/**
		 * Start generating sound.
		 * @param {number} pitch MIDI pitch.
		 * @param {number} velocity MIDI velocity.
		 * @param {number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
			this._amp.gain.set(0.0, time);
			this._amp.gain.set((velocity / 127), [time, 0.002], 3);
			this._osc.frequency.set(WX.mtof(pitch - 15), time, 0);
			this._osc.start(time);
		},

		/**
		 * Stop generating sound.
		 * @param {Number} pitch MIDI pitch, value between 0 and 128
		 * @param {Number} velocity MIDI velocity, usually 0 for note-off.
		 * @param {Number} time Time to delay action.
		 */
		noteOff: function (pitch, velocity, time) {
			// short release to avoid clicks
			this._amp.gain.set(0.0, [time, 0.05], 3);
			this._osc.stop(time + 0.2);
		}
	};

	/**
	 * @constructor
	 */
	function Bass(preset) {
		WX.PlugIn.defineType(this, 'Generator');

		// a bit of distortion
		this._shaper = WX.WaveShaper();
		this._shaper.curve = this.createDistortionCurve(10);
		this._shaper.to(this._output);

	    // voice management
	    this.numVoices = 0;
		this.voices = [];
		for (var i = 0; i < 128; i++) {
			this.voices[i] = [];
		}
	};

 	Bass.prototype = {
 		
		info: {
			name: 'Bass',
			version: '0.0.1',
			api_version: '1.0.0-alpha',
			author: 'Wouter Hisschemöller',
			type: 'Generator',
			description: 'Bass generator'
		},

		defaultPreset: {
		}, 

		/**
		 * Creates a distortion curve to be used by the waveshaper effect.
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode.curve
		 * @see http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion
		 * @param {Number} amount Higher number increases distortion.
		 * @return {Float32Array} Curve describing the distortion. (?)
		 */
		createDistortionCurve: function(amount) {
			var k = typeof amount === 'number' ? amount : 50,
				n_samples = 44100,
				curve = new Float32Array(n_samples),
				deg = Math.PI / 180,
				i = 0,
				x;

			for ( ; i < n_samples; ++i ) {
				x = i * 2 / n_samples - 1;
				curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
			}
			return curve;
		}, 

		/**
		 * Start generating sound.
		 * @param {Number} pitch MIDI pitch.
		 * @param {Number} velocity MIDI velocity.
		 * @param {Number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
			time = (time || WX.now);
			var voice = new BassVoice(this._shaper);
			this.voices[pitch].push(voice);
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
			if(playing.length) {
				playing.shift().noteOff(pitch, velocity, time);
				this.numVoices--;
			}
		},

		/**
		 * Stop all currently playing notes.
		 * @param {Number} time Time to delay action.
		 */
		allNotesOff: function(time) {
			for(var i = 0; i < this.voices.length; i++) {
				var playing = this.voices[i];
				if(playing.length) {
					for (var j = 0; j < playing.length; j++) {
						playing[j].noteOff(i, 0, time);
						this.numVoices--;
					}
					this.voices[i] = [];
				}
			}
		}, 

		/**
		 * Receive timed data from WH.Transport.
		 * @param {String} action Type of event received.
		 * @param {Object} data Properties data1 {Number}, data2 {Number}, time {Number}.
		 */
		onData: function (action, data) {
			switch (action) {
				case WH.MidiStatus.NOTE_ON:
					this.noteOn(data.data1, data.data2, data.time);
					break;
				case WH.MidiStatus.NOTE_OFF:
					this.noteOff(data.data1, data.data2, data.time);
					break;
				case WH.MidiStatus.CONTROL_CHANGE:
					switch(data.data1) {
						case WH.MidiController.ALL_NOTES_OFF: 
							this.allNotesOff(data.time);
							break;
					}
					break;
				default: 
					return;
			}

			// this._view.onData(action, data, this._id);
		}
 	};

	WX.PlugIn.extendPrototype(Bass, 'Generator');

	WX.PlugIn.register(Bass);

})(WX, WH);