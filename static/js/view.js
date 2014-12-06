
/**
 * @construcor
 * @param {string} canvasId Id of HTML5 canvas element.
 */
function View(canvasId) {
	this._transport = null;

	this.stage = new createjs.Stage(canvasId);
	this.noiseShape = new createjs.Shape();
}

/**
 * Receive timed data from WX.Transport.
 * 
 * @param {string} action - Type of event that's received.
 * @param {Object} data - MIDI data with properties data1 {number}, data2 {number}, time {number}.
 * @param {string} generatorId - Type of event that's received.
 */
View.prototype.onData = function (action, data, generatorId) {
	switch (generatorId) {
		case 'simpleNoise': 
			switch (action) {
				case WH.MidiStatus.NOTE_ON:
					// use data2 (velocity) for lightness.
					// optimize for light grey at velocities between 0 and 25.
					var lightness = 95 - (Math.max(0, Math.min(data.data2, 25)) / 2);
					this.noiseShape.graphics.clear();
 					this.noiseShape.graphics.beginFill('hsl(0, 0%, ' + lightness + '%)').drawRect(10, 10, 100, 100);
				 	this.stage.addChild(this.noiseShape);
					break;
				case WH.MidiStatus.NOTE_OFF:
				 	this.stage.removeChild(this.noiseShape);
					break;
			}
			break;
	}

	this.stage.update();
}