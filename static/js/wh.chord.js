/**
 * Chord generates chords.
 * 
 * @wapl Chord
 * @author Wouter Hisschemöller
 * @version 0.1
 */
(function (WX, WH) {

	'use strict';

	/**
	 * ChordVoice is a single voice used by the Chord generator defined below.
	 * A ChordVoice object is used only once and then discarded.
	 * @constructor
	 */
	function ChordVoice(output) {
		this._osc = WX.OSC();
	    this._gain = WX.Gain();
	    this._osc.to(this._gain).to(output);
	}

	ChordVoice.prototype = {
		/**
		 * Start generating sound.
		 * @param {number} pitch MIDI pitch.
		 * @param {number} velocity MIDI velocity.
		 * @param {number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
      		this._osc.frequency.set(WX.mtof(pitch), time, 0);
      		this._gain.gain.set(velocity / 127, time, 0);
			this._osc.start(time);
		},

		/**
		 * Stop generating sound.
		 * @param {Number} pitch MIDI pitch, value between 0 and 128
		 * @param {Number} velocity MIDI velocity, usually 0 for note-off.
		 * @param {Number} time Time to delay action.
		 */
		noteOff: function (pitch, velocity, time) {
			this._osc.stop(time);
		}
	};

	/**
	 * @constructor
	 */
	function Chord(id, view, preset) {
	    WX.PlugIn.defineType(this, 'Generator');

	    // filter
	    this._filter = WX.Filter();
	    this._filter.Q.value = 5;
	    this._filter.to(this._output);

	    // chord start detection
	    this.time = 0;

	    // voice management
	    this.numVoices = 0;
		this.voices = [];
		for (var i = 0; i < 128; i++) {
			this.voices[i] = [];
		}
	}

 	Chord.prototype = {
 		
		info: {
			name: 'Chord',
			version: '0.0.1',
			api_version: '1.0.0-alpha',
			author: 'Wouter Hisschemöller',
			type: 'Generator',
			description: 'Chord generator'
		},

		defaultPreset: {
		},

		/**
		 * Called once when a new chord starts.
		 * Apply the filter envelope.
		 * @param {Number} time Time to delay action.
		 */
		onChordStart: function(time) {
      		this._filter.frequency.set(800, time, 0);
      		this._filter.frequency.set(50, time + WX.Transport.tick2sec(240), 1);
		}, 

		/**
		 * Start generating sound.
		 * @param {Number} pitch MIDI pitch, value between 0 and 128
		 * @param {Number} velocity MIDI velocity.
		 * @param {Number} time Time to delay action.
		 */
		noteOn: function (pitch, velocity, time) {
			time = (time || WX.now);
			var voice = new ChordVoice(this._filter);
			this.voices[pitch].push(voice);
			this.numVoices++;
			voice.noteOn(pitch, velocity, time);

			// all notes of a chord are expected to start at the same time, 
			// so a change in time indicates the start of a new chord
			if(time != this.time) {
				this.time = time;
				this.onChordStart(time);
				console.log('chord start');
			}
			console.log(pitch, time);
		},

		/**
		 * Stop generating sound.
		 * @param {Number} pitch MIDI pitch, value between 0 and 128
		 * @param {Number} velocity MIDI velocity, usually 0 for note-off.
		 * @param {Number} time Time to delay action.
		 */
		noteOff: function (pitch, velocity, time) {
			time = (time || WX.now);
			var playing = this.voices[pitch];
			for (var i = 0; i < playing.length; i++) {
				playing[i].noteOff(pitch, velocity, time);
				this.numVoices--;
			}
			this.voices[pitch] = [];
		},

		/**
		 * Receive timed data from WX.Transport.
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
							this.noteOff(data.data1, data.data2, data.time);
							break;
					}
					break;
				default: 
					return;
			}

			// this._view.onData(action, data, this._id);
		}
	};

	WX.PlugIn.extendPrototype(Chord, 'Generator');

	WX.PlugIn.register(Chord);

})(WX, WH);