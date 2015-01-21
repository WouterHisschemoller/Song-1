/**
 * @wapl Wave
 * @author Wouter Hisschemöller
 * @version 0.1
 */
(function (WX, WH) {

	'use strict';

	/**
	 * @constructor
	 */
	function Wave(preset) {
		WX.PlugIn.defineType(this, 'Processor');
	}

 	Wave.prototype = {
 		
		info: {
			name: 'Wave',
			version: '0.0.1',
			api_version: '1.0.0-alpha',
			author: 'Wouter Hisschemöller',
			type: 'Processor',
			description: 'Wave display analyser'
		},

		defaultPreset: {
		}, 

		/**
		 * [init description]
	 	 * @param {String} canvasId Id of HTML5 canvas element.
	 	 * @param {Number} recordDuration Length of the recording in seconds.
		 */
		init: function(canvasId, recordDuration) {
			// canvas to draw on
			this.canvas = $('#' + canvasId);
			// get canvas rendering context
			this.canvasCtx = this.canvas[0].getContext('2d');

			// 
			this.events = $.extend({}, WH.Events);
			// 
			this.displayView = new DisplayView(this.canvas, this.events);

			// record duration in samples
			this.sampleLength = Math.floor(WX.srate * recordDuration);
			
			// 
			this.sound = {
				// array to hold all the recorded samples
				channels: [new Float32Array(this.sampleLength)], 
				numberOfChannels: 1, 
				float32Index: 0
			}

			// script processor node to handle incoming audio
			this.processor = WX._ctx.createScriptProcessor(4096, 2, 2);
			console.log('WAVE ScriptProcessorNode created.');
			// capture the waveform
			this.processor.onaudioprocess = this.onAudioProcess.bind(this);
			// pipe the incoming audio to the processor, nd on to the output
			this._input.to(this.processor).to(this._output);
		}, 

		/**
		 * Capture the sound wave from the input.
		 * @param {Event} audioProcessingEvent [description]
		 */
		onAudioProcess: function(audioProcessingEvent) {
			// input buffer with 4096 samples of audio
			var inputBuffer = audioProcessingEvent.inputBuffer; 
			// output buffer contains the samples that will be played
			var outputBuffer = audioProcessingEvent.outputBuffer;
			// loop through the output channels
			for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
				var inputData = inputBuffer.getChannelData(channel);
				var outputData = outputBuffer.getChannelData(channel);
				// loop through the 4096 samples
				for (var sample = 0; sample < inputBuffer.length; sample++) {
					// make output equal to the input, audio just passes through
					outputData[sample] = inputData[sample];
					// only draw the first channel
					if(channel == 0) {
						// until the end of the recording is reached
						if(this.sound.float32Index <= this.sampleLength) {
							if(this.sound.float32Index == this.sampleLength) {
								// end of recording, render the result
								this.render();
							} else {
								// add sample to the recording
								this.sound.channels[0][this.sound.float32Index] = inputData[sample];
							}
							this.sound.float32Index++;
						}
					}
				}
			}
		}, 

		/**
		 * Draw the sound wave on the canvas.
		 */
		render: function() {
			this.displayView.updateSound(this.sound);
		}
	};

	WX.PlugIn.extendPrototype(Wave, 'Processor');
	WX.PlugIn.register(Wave);

})(WX, WH);