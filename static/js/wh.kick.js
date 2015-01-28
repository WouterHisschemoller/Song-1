/**
 * Kick drum generator.
 * The kick drum sound is generated only once at startup. 
 * The prerendered sound is stored in a buffer.
 * The buffer is played back for each kick sound.
 * This makes the sound less flexible but it's easier on the processor.
 * 
 * @wapl Kick
 * @author Wouter Hisschemöller
 * @version 0.1
 */
(function (WX, WH) {

	'use strict';

	/**
	 * KickVoice is a single voice used by the Kick generator defined below.
	 * A KickVoice object is used only once and then discarded.
	 * 
	 * @constructor
	 * @param {Kick} generator Kick generator that plays these voices.
	 * @param {AudioBuffer} buffer AudioBuffer containing the kick sample.
	 */
	function KickVoice(output, buffer) {
	    this._src = WX.Source();
	    this._src.buffer = buffer;
	    this._gain = WX.Gain();
	    this._src.to(this._gain).to(output);
	}

	KickVoice.prototype = {
		/**
		 * Start generating sound.
		 * @param {number} pitch MIDI pitch.
		 * @param {number} velocity MIDI velocity.
		 * @param {number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
	    	this._gain.gain.value = velocity / 127;
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
	function Kick(id, view, preset) {
	    WX.PlugIn.defineType(this, 'Generator');

	    this.voices = [];
	    this.numVoices = 0;
	    this.buffer;
	    this.createBuffer();
	}

 	Kick.prototype = {
 		
		info: {
			name: 'Kick',
			version: '0.0.1',
			api_version: '1.0.0-alpha',
			author: 'Wouter Hisschemöller',
			type: 'Generator',
			description: 'Kick drum sound generator'
		},

		defaultPreset: {
		}, 

		/**
		 * Generate a sample buffer containing the kick sound.
		 * @return {AudioBuffer} Audio buffer with created kick sample.
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer
		 */
		createBuffer: function() {
			// duration in seconds
			var sampleDuration = 0.4;
			// duration in samples
			var sampleLength = Math.floor(WX.srate * sampleDuration);
			var offlineCtx = new OfflineAudioContext(2, sampleLength, WX.srate);

			var bodyFadeGain = offlineCtx.createGain();
			bodyFadeGain.gain.setValueAtTime(1, offlineCtx.currentTime);
			bodyFadeGain.gain.exponentialRampToValueAtTime(0.001, offlineCtx.currentTime + sampleDuration);
			bodyFadeGain.connect(offlineCtx.destination);

			var bodyOsc = offlineCtx.createOscillator();
			bodyOsc.frequency.setValueAtTime(660, offlineCtx.currentTime);
			bodyOsc.frequency.exponentialRampToValueAtTime(44, offlineCtx.currentTime + 0.03);
			bodyOsc.connect(bodyFadeGain);

			var clickFadeGain = offlineCtx.createGain();
			clickFadeGain.gain.setValueAtTime(0.4, offlineCtx.currentTime);
			clickFadeGain.gain.exponentialRampToValueAtTime(0.00001, offlineCtx.currentTime + 0.001);
			clickFadeGain.connect(offlineCtx.destination);

			var clickOsc = offlineCtx.createOscillator();
			clickOsc.frequency.setValueAtTime(8000, offlineCtx.currentTime);
			clickOsc.frequency.exponentialRampToValueAtTime(2000, offlineCtx.currentTime + 0.001);
			clickOsc.connect(clickFadeGain);

			var noiseFadeGain = offlineCtx.createGain();
			noiseFadeGain.gain.setValueAtTime(0.005, offlineCtx.currentTime);
			noiseFadeGain.gain.exponentialRampToValueAtTime(0.0001, offlineCtx.currentTime + 0.1);
			noiseFadeGain.connect(offlineCtx.destination);

			var noise = offlineCtx.createBufferSource();
		    noise.buffer = this.createGaussian(0.4);
			noise.connect(noiseFadeGain);
			
			bodyOsc.start(offlineCtx.currentTime);
			clickOsc.start(offlineCtx.currentTime);
			noise.start(offlineCtx.currentTime);

			offlineCtx.startRendering();
			offlineCtx.oncomplete = function(e) {
				this.buffer = e.renderedBuffer;
			}.bind(this);
		}, 

		/**
		 * Pre-generation of gaussian white noise.
		 * @see http://www.musicdsp.org/showone.php?id=113
		 * 
		 * @param {number} duration Duration of noise in seconds.
		 * @return {AudioNode} WA Buffer object.
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
		 * @param {Number} pitch MIDI pitch, value between 0 and 128
		 * @param {Number} velocity MIDI velocity.
		 * @param {Number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
			if(!this.buffer) {
				return;
			}
			time = (time || WX.now);
			var voice = new KickVoice(this._output, this.buffer);
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

	WX.PlugIn.extendPrototype(Kick, 'Generator');

	WX.PlugIn.register(Kick);

})(WX, WH);