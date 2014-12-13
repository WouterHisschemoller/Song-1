(function(WX) {

	/**
	 * @constructor
	 */
	function Transport(BPM) {
		this.BPM = BPM || 120;
		this.oldBPM = BPM;

		this.TICKS_PER_BEAT = 480;

		// beats, ticks in seconds
		this.BIS = 0.0;
		this.TIS = 0.0;

		// NOTES:
		// - absolute time: time expressed in audioContext time
		// - sec: linear time in seconds
		// - tick: musical time, minimum unit of MBT timebase (varies on BPM)
		// * if not specified in signature, it handles as tick (musical time)
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

		// init BPM and initiate loop
		this.setBPM(BPM);
		this._loop();
	}

	Transport.prototype = {

		/**
		 * utilities
		 */

		tick2sec: function (tick) {
			return tick * this.TIS;
		},

		sec2tick: function (sec) {
			return sec / this.TIS;
		},

		/**
		 * setter and getter
		 */

		getAbsTimeInSec: function (tick) {
			return this.absOrigin + this.tick2sec(tick);
		},

		getBPM: function () {
			return this.BPM;
		},

		getNowInSec: function () {
			return this.now;
		},

		getNow: function () {
			return this.sec2tick(this.now);
		},

		getLoopDurationInSec: function() {
			return this.loopEnd - this.loopStart;
		},

		getLoopDuration: function() {
			return this.sec2tick(this.getLoopDurationInSec());
		}, 

		/**
		 * Initialize the Transport.
		 * @param {Number} tpb Ticks Per Beat.
		 * @param {Number} bpm Beats Per Minute.
		 */
		init: function(tpb, bpm) {
			this.TICKS_PER_BEAT = tpb;
			this.setBPM(bpm);
		}, 

		/**
		 * Set the sequencer note placement precision in Ticks Per Beat.
		 * @param {Number} tpb Ticks Per Beat.
		 */
		setTicksPerBeat: function(TPB) {
			this.TICKS_PER_BEAT = TPB;
			this.setBPM(this.BPM);
		}, 

		/**
		 * Set the tempo in beats per second.
		 * @param {Number} BPM Beats Per Second.
		 */
		setBPM: function (BPM) {
			this.BPM = BPM;
			var factor = this.oldBPM / this.BPM;
			this.oldBPM = this.BPM;
			// recalcualte beat in seconds, tick in seconds
			this.BIS = 60.0 / this.BPM;
			this.TIS = this.BIS / this.TICKS_PER_BEAT;
			// lookahead is 32 ticks (1/64th note)
			this.lookahead = this.TIS * 16;
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
			// get tick of current linear now
			var tick = this.sec2tick(this.now);
		},

		/**
		 * Move the playhead to the position in ticks.
		 * @param {Number} tick The new playback position in ticks.
		 */
		setNow: function (tick) {
			this.setNowInSec(this.tick2sec(tick));
		},

		/**
		 * Set or unset looping.
		 * Omit one of the parameters to stop looping.
		 * @param {Number} start Loop start position in ticks.
		 * @param {Number} end Loop end position in ticks.
		 */
		setLoop: function (start, end) {
			if(start != null && end != null) {
				this.loopStart = this.tick2sec(start);
				this.loopEnd = this.tick2sec(end);
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
				// start and end time in ticks
				var start = this.sec2tick(this.scanStart);
				var end = this.sec2tick(this.scanEnd);
				var events = this.song.scanEvents(start, end);
				this.playbackQ = this.playbackQ.concat(events);
				this.needsScan = false;
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
				var event = this.playbackQ[i], 
				start = this.absOrigin + this.tick2sec(this.now + event.tick);
				this.targets[event.message.channel].onData(event.message.type, {
					data1: event.message.data1,
					data2: event.message.data2,
					time: start
				});
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
		},

		/** 
		 * Rewind to start.
		 */ 
		rewind: function () {
			this.setNowInSec(0.0);
			this.setScanRange(true);
		},

		/**
		 * 
		 * @param {WH.Song} song Song object 
		 */
		addSong: function (song) {
			this.song = song;
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
				this.views[i].setPlayhead(this.sec2tick(this.now));
			}
		},

		/**
		 * Add a generator plugin to a channel.
		 */
		addTarget: function (channel, plugin) {
			this.targets[channel] = plugin;
		}
	};

	WX.Transport = new Transport(120);

})(WX);
