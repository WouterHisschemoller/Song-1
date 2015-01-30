(function(WX, WH) {

	/**
	 * @constructor
	 */
	function Transport(song) {

		// pulses per quarter note
		this.PPQN = 480;
		// seconds per pulse
		this.SPP = 0.0;

		// NOTES:
		// - absolute time: time expressed in audioContext time
		// - sec: linear time in seconds
		// - pulse: musical time, minimum unit of MBT timebase (varies on BPM)
		// * if not specified in signature, it handles as pulse (musical time)
		// * however, all the internal calculation should be in seconds

		// origin in absolute time and now reference
		// absOrigin is origin of timeline, in terms of audioContext time;
		// so absOrigin is '0' position of playhead in linear time
		this.absOrigin = 0.0;
		this.absOldNow = 0.0;

		// time references, lookahead in seconds
		this.now = 0.0;
		this.loopStart = 0.0;
		this.loopEnd = 0.0;
		this.lookahead = 0.0;

		// scan start and end time in seconds
		this.scanStart = 0.0;
		this.scanEnd = this.lookahead;
		this.needsScan = true;

		// playback queue, connected notelists, views
		this.playbackQ = [];
		// plugin target
		this.targets = [];
		// mui element: pianoroll or score
		this.views = [];
		// song
		this.song;

		// switches
		this.isRunning = false;
		this.isLoop = false;

		// initialise with a default empty song
		this.setSong(song || WH.Song());
		// initiate loop
		this._loop();
	}

	Transport.prototype = {

		/**
		 * utilities
		 */
		
		pulse2sec: function (pulse) {
			return pulse * this.SPP;
		},

		sec2pulse: function (sec) {
			return sec / this.SPP;
		},

		/**
		 * setter and getter
		 */

		getAbsTimeInSec: function (pulse) {
			return this.absOrigin + this.pulse2sec(pulse);
		},

		getNowInSec: function () {
			return this.now;
		},

		getNow: function () {
			return this.sec2pulse(this.now);
		},

		getLoopDurationInSec: function() {
			return this.loopEnd - this.loopStart;
		},

		getLoopDuration: function() {
			return this.sec2pulse(this.getLoopDurationInSec());
		}, 

		/**
		 * Set the tempo in beats per second.
		 */
		setTempoChange: function (bpm, factor) {
			// recalculate pulse in seconds
			var beatInSeconds = 60.0 / bpm;
			this.SPP = beatInSeconds / this.PPQN;
			// lookahead is 32 pulse (1/64th note)
			this.lookahead = this.SPP * 16;
			// update time references based on tempo change
			this.now *= factor;
			this.loopStart *= factor;
			this.loopEnd *= factor;
			this.absOrigin = WX.now - this.now;
		},

		/**
		 * Move the playhead to the position in seconds.
		 * @param {Number} sec The new playback position in seconds.
		 */
		setNowInSec: function (sec) {
			// update now and absolute origin
			this.now = sec;
			this.absOrigin = WX.now - this.now;
			// get pulse of current linear now
			var pulse = this.sec2pulse(this.now);
		},

		/**
		 * Move the playhead to the position in pulses.
		 * @param {Number} pulse The new playback position in pulses.
		 */
		setNow: function (pulse) {
			this.setNowInSec(this.pulse2sec(pulse));
		},

		/**
		 * Set or unset looping.
		 * Omit one of the parameters to stop looping.
		 * @param {Number} start Loop start position in pulses.
		 * @param {Number} end Loop end position in pulses.
		 */
		setLoop: function (start, end) {
			if(start != null && end != null) {
				this.loopStart = this.pulse2sec(start);
				this.loopEnd = this.pulse2sec(end);
				this.isLoop = true;
			} else {
				this.loopStart = 0.0;
				this.loopEnd = 0.0;
				this.isLoop = false;
			}
		},

		/**
		 * Repaint loop, usually at 60 FPS or 16.67 ms interval.
		 */
		_loop: function () {
			// advance when transport is running
			this.step();
			// update any linked view
			this.updateView();
			// next
			requestAnimationFrame(this._loop.bind(this));
		},

		/**
		 * Find, schedule and play events, advance play position.
		 * NEED REDESIGN: scan and schedule
		 */
		step: function () {
			// only transport if in 'play'
			if (this.isRunning) {
				// advancing, gets new absolute now
				var absNow = WX.now;
				this.now += (absNow - this.absOldNow);
				this.absOldNow = absNow;

				// scan notes and throw them into playbackQ
				this.scanEvents();

				// set up next scan if reached the end (check for every 16.7ms)
				this.setScanRange();

				// play events found within scanned timespan 
				this.sendData();

				// clear playbackQ
				this.flushPlaybackQ();

				// handle looping
				if (this.isLoop) {
					// if the end of the loop occurs within the lookahead time
					if (this.loopEnd - (this.now + this.lookahead) < 0) {
						// set time to loop start time minus the bit to go until loop end,
						// which means to set back time one loop length
						this.setNowInSec(this.loopStart - (this.loopEnd - this.now));
						this.setScanRange(true);
					}
				}
			}
		},

		/**
		 * Scan events in time range and advance playhead in each pattern.
		 */ 
		scanEvents: function () {
			if (this.needsScan) {
				this.needsScan = false;

				if(this.song) {
					// get song arrangement events
					this.song.scanEvents(this.scanStart, this.scanEnd, this.playbackQ);

					// convert song time in beats to transport time in pulses
					var bpm = this.song.getBPM();
					for (var i = 0; i < this.playbackQ.length; i++) {
						var midiEvent = this.playbackQ[i];
						midiEvent.time = midiEvent.time * this.PPQN;
					}

					// if a new sequence started during this time range, 
					// there will be song events
					// get the events and add them to the playbackQ for all channels
					var songEvents = this.song.getScannedSongEvents();
					for (var i = 0; i < songEvents.length; i++) {
						var event = songEvents[i];
						if(event.message.type == WH.MidiStatus.CONTROL_CHANGE &&
							event.message.data1 == WH.MidiController.ALL_SOUND_OFF) {
					 		for (channel in this.targets) {
								// note: put all-note-off events at start of queue so they
								// won't stop events that start on the same pulse
					 			this.playbackQ.unshift(WH.MidiEvent(event.time, WH.MidiMessage(
					 				WH.MidiStatus.CONTROL_CHANGE,
									channel,
									WH.MidiController.ALL_NOTES_OFF,
									0))
								);
							}
						}
					}
				}
			}
		}, 

		/**
		 * Test if the end of the scan range is reached
		 * Set the timespan to scan for next events play.
		 * @param {Boolean} forced Move scanning timespan to now. Useful when playback position is moved.
		 */
		setScanRange: function (forced) {
			if (forced) {
				this.scanStart = this.now;
				this.scanEnd =  this.scanStart + this.lookahead;
				this.needsScan = true;
			} else if (this.scanEnd - this.now <- 0.0167) {
				this.scanStart = this.scanEnd;
				this.scanEnd = this.now + this.lookahead;
				this.needsScan = true;
			}
		},

		/**
		 * Send events to the generators on their channels.
		 */
		sendData: function () {
			for (var i = 0; i < this.playbackQ.length; i++) {
				var event = this.playbackQ[i];
				var start = this.absOrigin + this.pulse2sec(this.now + event.time);
				this.targets[event.message.channel].onData(event.message.type, {
					data1: event.message.data1,
					data2: event.message.data2,
					time: start
				});
			}
		}, 

		/**
		 * Stop all playing sounds on all instruments immediately.
		 * Use this as a MIDI Panic function.
		 */
		sendAllNotesOffImmediately: function() {
	 		for (var i = 0; i < this.targets.length; i++) {
	 			this.targets[i].onData(WH.MidiStatus.CONTROL_CHANGE, {
	 				data1: WH.MidiController.ALL_NOTES_OFF, 
	 				data2: 0, 
	 				time: 0});
			}
		},

		/**
		 * Clear all events from queue.
		 */
		flushPlaybackQ: function () {
			this.playbackQ.length = 0;
		},

		/**
		 * Getter to test if transport is currently playing.
		 * @return {Boolean} True if playback is running.
		 */
		isRunning: function () {
			return this.isRunning;
		},

		/**
		 * Start playback.
		 */
		start: function () {
			// flush queue and reset scanner position
			this.flushPlaybackQ();
			// arrange time references
			var absNow = WX.now;
			this.absOrigin = absNow - this.now;
			this.absOldNow = absNow;
			// toggle switch
			this.isRunning = true;
			this.setScanRange(true);
		},

		/**
		 * Pause playback.
		 */
		pause: function () {
			this.isRunning = false;
			this.flushPlaybackQ();
			this.sendAllNotesOffImmediately();
		},

		/** 
		 * Rewind to start.
		 */ 
		rewind: function () {
			this.setNowInSec(0.0);
			this.setScanRange(true);
		},

		/**
		 * Set the song to play.
		 * @param {WH.Song} song Song object 
		 */
		setSong: function (song) {
			// get tempo change factor if a current song is replaced
			var factor = this.song ? (this.song.getBPM() / song.getBPM()) : 1;
			// set song
			this.song = song;
			// update time references
			this.setTempoChange(this.song.getBPM(), factor);
		},

		/**
		 * Add a new view.
		 */
		addView: function (muiElement) {
			this.views.push(muiElement);
			muiElement._transport = this;
		},

		/**
		 * update views
		 */
		updateView: function () {
			// send data to update view and controller (polymer element)
			for (var i = 0; i < this.views.length; i++) {
				this.views[i].setPlayhead(this.sec2pulse(this.now));
			}
		},

		/**
		 * Add a generator plugin to a channel.
		 */
		addTarget: function (channel, plugin) {
			this.targets[channel] = plugin;
		}
	};

	/** 
	 * Exports
	 */
	WH.Transport = function () {
		return new Transport();
	};

})(WX, WH);
