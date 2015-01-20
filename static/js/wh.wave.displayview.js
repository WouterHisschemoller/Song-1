
// The audio wave display.
function DisplayView(canvas, eventAggregator) {
	this.canvas = canvas;
	this.eventAggregator = eventAggregator;
	this.initialize();
}

DisplayView.prototype = {

	initialize: function() {
		//this.eventAggregator = this.options.eventAggregator;
		//this.model.bind('change:selectedID', this.updateSound, this);
		try {
			this.context = this.canvas[0].getContext('2d');
		}
		catch(exception) {
			alert( 'HTML canvas tag not supported. Exception: ' + exception );
		}
		this.canvas.on('mousedown', function(e){
			this.mouseDownHandler(e);
		}.bind(this));
		this.canvas.on('dblclick', function(e){
			this.mouseDoubleClickHandler();
		}.bind(this));
		$(document).on('mousemove', function(e){
			this.mouseMoveHandler(e);
		}.bind(this));
		$(document).on('mouseup', function(){
			this.mouseUpHandler();
		}.bind(this));
		
		// create a second canvas
		this.waveCanvas = document.createElement('canvas');
		this.waveCanvas.width = this.canvas.width();
		this.waveCanvas.height = this.canvas.height();
		this.waveContext = this.waveCanvas.getContext('2d');
		this.waveContext.drawImage(this.canvas[0], 0, 0);

		this.width = this.canvas.width();
		this.height = this.canvas.height();
		this.mouseIsDown = false;
		this.xAtMouseDown = 0;
		this.previousMouseY = 0;
		this.sound = null;
		this.filledGraphicTreshold = 40;
		this.numSamplesTotal = 0;
		this.firstSampleInView = 0;
		this.zoomCenterPosition = 0.5;
		this.sampleAtZoomCenter = 0;
		this.verticalZoomLevel = 0;
		this.minSamplesPerPixel = 1;
		this.maxSamplesPerPixel = 0;
		this.currentSamplesPerPixel = 1;
		this.pollingInterval = 1;
		this.numPolledSamples = 0;
		this.samplesToSkip = 0;
		this.numSamplesInView = 0;
		this.verticalZoomAmount = 0;
		this.displayMiddleL = 0;
		this.displayMiddleR = 0;
		this.displayAmplitudeHeight = 0;
	}, 
	render: function() {
		this.context.clearRect(0, 0, this.width, this.height);
		this.context.fillStyle = '#feb';
		this.context.fillRect(0, 0, this.width, this.height);
		
		this.waveContext.clearRect(0, 0, this.width, this.height);
		this.waveContext.strokeStyle = '#933';
		this.waveContext.lineWidth = 2;
		this.waveContext.beginPath();
		this.waveContext.moveTo(0, this.displayMiddleL);
		
		if(this.sound === null) {
			return;
		}
		
		var drawFill = this.currentSamplesPerPixel > this.filledGraphicTreshold;
		
		switch(this.sound.numberOfChannels)
		{
			case 1:
				if(drawFill) this.drawMonoAsFill();
				else this.drawMonoAsLine();
				break;
			case 2:
			default: 
				if(drawFill) this.drawStereoAsFill();
				else this.drawStereoAsLine();
				break;
		}
		
		this.context.drawImage(this.waveCanvas, 0, 0);
	}, 

	/**
	 * Wave view needs to update.
	 */
	invalidate: function() {
		this.render();
	}, 

	/**
	 * Update the display with a new changed sound.
	 * @param {Array} sound Array of Float32Arrays.
	 */
	updateSound: function(sound) {
		// var newSound = this.model.getSelectedSound();
		
		if(sound === this.sound) {
			return;
		}
		
		if(sound === null) {
			this.clear();
			return;
		}
		
		this.sound = sound;
		this.numSamplesTotal = this.sound.channels[0].length;
		this.firstSampleInView = 0;
		this.zoomCenterPosition = 0.5;
		this.sampleAtZoomCenter = this.firstSampleInView 
			+ Math.round(this.numSamplesTotal * this.zoomCenterPosition);
		this.verticalZoomLevel = 0;
		
		this.updateSizes(true);
		this.invalidate();
		
		this.eventAggregator.trigger('HORIZONTAL_ZOOM_CHANGE', this.getTotalWidth());
		this.eventAggregator.trigger('POSITION_CHANGE', this.getPosition());
		this.eventAggregator.trigger('UPDATE_INFO', 
			this.firstSampleInView, 
			this.numSamplesInView, 
			this.numSamplesTotal);
	}, 

	/**
	 * Clear all display properties.
	 */
	clear: function() {
		this.maxSamplesPerPixel = 1;
		this.currentSamplesPerPixel = 1;
		this.pollingInterval = 1;
		this.firstSampleInView = 0;
		this.numSamplesInView = 0;
		this.numSamplesTotal = 0;
		this.zoomCenterPosition = 0.5;
		this.sampleAtZoomCenter = 0;
		this.verticalZoomAmount = this.displayMiddleL;
		this.sound = null;
		this.context.clearRect(0, 0, this.width, this.height);
		this.waveContext.clearRect(0, 0, this.width, this.height);
		
		this.invalidate();
	}, 

	/**
	 * Update sizes of the new sound to draw.
	 * @param  {Boolean} isNewSound True if this is a completely new sound, not a redraw.
	 */
	updateSizes: function(isNewSound) {
		if(this.sound === null) {
			return;
		}
		
		if(this.sound.numberOfChannels == 1) {
			this.displayMiddleL = this.height / 2;
			this.displayMiddleR = this.height / 2;
			this.displayAmplitudeHeight = this.height / 2;
		}
		else {
			this.displayMiddleL = this.height * 0.25;
			this.displayMiddleR = this.height * 0.75;
			this.displayAmplitudeHeight = this.height / 4;
		}
		
		this.maxSamplesPerPixel = this.numSamplesTotal / this.width;
		
		// TODO: old / new width issue
		var oldWidth = this.width;
		
		if(isNewSound) {
			this.setCurrentSamplesPerPixel(this.maxSamplesPerPixel);
		}
		else {
			this.setCurrentSamplesPerPixel((oldWidth / this.width) 
				* this.currentSamplesPerPixel);
		}
		
		this.verticalZoomAmount = this.displayMiddleL;
	}, 

	/**
	 * Sets the zoom level of the display. Measured in how many samples one 
	 * horizontal pixel of the display represents.
	 * @param {Number} samplesPerPixel How much horizontal screen space one sample will take.
	 */
	setCurrentSamplesPerPixel: function(samplesPerPixel) {
		if(samplesPerPixel == this.currentSamplesPerPixel) {
			return;
		}
		
		// the new zoom level
		this.currentSamplesPerPixel = Math.max(this.minSamplesPerPixel, samplesPerPixel);
		this.currentSamplesPerPixel = Math.min(samplesPerPixel, this.maxSamplesPerPixel);
		this.numSamplesInView = this.currentSamplesPerPixel * this.width;
		
		// the new position
		this.firstSampleInView = this.sampleAtZoomCenter
							   - (this.numSamplesInView * this.zoomCenterPosition);
		this.firstSampleInView = Math.max(0, this.firstSampleInView);
		this.firstSampleInView = Math.min(this.firstSampleInView, 
								 this.numSamplesTotal - this.numSamplesInView);
		
		// polling stuff
		this.pollingInterval = Math.max(1, this.currentSamplesPerPixel / 20);
		this.numPolledSamples = Math.floor(this.numSamplesInView / this.pollingInterval);
		this.samplesToSkip = Math.round(this.pollingInterval - 1);

		this.eventAggregator.trigger('HORIZONTAL_ZOOM_CHANGE', this.getTotalWidth());
		this.eventAggregator.trigger('POSITION_CHANGE', this.getPosition());
		this.eventAggregator.trigger('UPDATE_INFO', 
			this.firstSampleInView, 
			this.numSamplesInView, 
			this.numSamplesTotal);
		
		this.invalidate();
	}, 
	drawMonoAsFill: function() {
		var samplePosition = 0;
		var vectorIndex = 0;
		var pixelsPerPoint = 2;
		var nextPixelSamplePosition = this.currentSamplesPerPixel * pixelsPerPoint;
		var numPoints = this.width / pixelsPerPoint;
		var positiveAmplitude = 0.0;
		var negativeAmplitude = 0.0;
		var positives = [];
		var negatives = [];
		var samples = this.sound.channels[0];
		
		// Search for amplitudes.
		for(var i = 0; i < this.numPolledSamples; i++)
		{
			// Read the left channel.
			var amplitude = samples[Math.floor(this.firstSampleInView + samplePosition)];
			
			// Store only highest positive and negative amplitude.
			if(amplitude > 0) {
				positiveAmplitude = Math.max(positiveAmplitude, amplitude);
			}
			else {
				negativeAmplitude = Math.min(negativeAmplitude, amplitude);
			}
			
			// If all sample polling for the current pixel(s) is done store the result.
			if(samplePosition >= nextPixelSamplePosition)
			{
				positives[vectorIndex] = positiveAmplitude;
				negatives[vectorIndex] = negativeAmplitude;
				vectorIndex ++;
				
				// Prepare for next pixel / loop iteration.
				nextPixelSamplePosition += this.currentSamplesPerPixel * pixelsPerPoint;
				positiveAmplitude = 0;
				negativeAmplitude = 0;
			}
			
			samplePosition += this.pollingInterval;
		}
		
		this.waveContext.fillStyle = '#ff9933'; // alpha = 0.4
		
		// Draw positive left.
		for(i = 0; i < numPoints; i++)
		{
			var xPos = i * pixelsPerPoint;
			var yPos = this.displayMiddleL + 
				Math.min((positives[i] * this.verticalZoomAmount), this.displayAmplitudeHeight);
			this.waveContext.lineTo(xPos, yPos);
		}
		
		// Draw negative left.
		for(i = numPoints - 1; i >= 0; i--)
		{
			xPos = i * pixelsPerPoint;
			yPos = this.displayMiddleL + 
				Math.max((negatives[i] * this.verticalZoomAmount), -this.displayAmplitudeHeight);
			this.waveContext.lineTo(xPos, yPos);
		}
		
		this.waveContext.fill();
		this.waveContext.stroke();
	}, 
	drawMonoAsLine: function() {
		var samplePosition = 0;
		var nextPixelSamplePosition = this.currentSamplesPerPixel;
		var pixelIndex = 0;
		var positiveWaveHeight = 0.0;
		var negativeWaveHeight = 0.0;
		var samples = this.sound.channels[0];
		
		for(var i = 0; i < this.numPolledSamples; i++) {
			// Read the left channel.
			var amplitude = samples[Math.floor(this.firstSampleInView + samplePosition)];
			
			// Store only highest positive and negative amplitude.
			if(amplitude > 0) {
				positiveWaveHeight = Math.max(positiveWaveHeight, amplitude);
			}
			else {
				negativeWaveHeight = Math.min(negativeWaveHeight, amplitude);
			}
			
			// If all sample polling for the current pixel is done draw the result.
			if(samplePosition >= nextPixelSamplePosition)
			{
				// Zoomed in: Draw waveform as line.
				if(positiveWaveHeight > (negativeWaveHeight * -1)) {
					this.waveContext.lineTo(
						pixelIndex, 
						this.displayMiddleL + 
						Math.min((positiveWaveHeight * this.verticalZoomAmount), 
							this.displayAmplitudeHeight)
						);
				}
				else {
					this.waveContext.lineTo(
						pixelIndex, 
						this.displayMiddleL + 
						Math.max((negativeWaveHeight * this.verticalZoomAmount),
							-this.displayAmplitudeHeight)
						);
				}
				
				// Prepare for next pixel / loop iteration.
				nextPixelSamplePosition += this.currentSamplesPerPixel;
				positiveWaveHeight = 0;
				negativeWaveHeight = 0;
				pixelIndex++;
			}
			
			samplePosition += this.pollingInterval;
		}
		
		this.waveContext.stroke();
	}, 
	drawStereoAsFill: function() {
		var samplePosition = 0;
		var vectorIndex = 0;
		var pixelsPerPoint = 2;
		var nextPixelSamplePosition = this.currentSamplesPerPixel * pixelsPerPoint;
		var numPoints = this.width / pixelsPerPoint;
		var positiveAmplitudeL = 0.0;
		var negativeAmplitudeL = 0.0;
		var positiveAmplitudeR = 0.0;
		var negativeAmplitudeR = 0.0;
		var positiveL = [];
		var negativeL = [];
		var positiveR = [];
		var negativeR = [];
		var samplesL = this.sound.channels[0];
		var samplesR = this.sound.channels[1];
		
		// Search for amplitudes.
		for(var i = 0; i < this.numPolledSamples; i++) {
			// Read the channels.
			var index = Math.floor(this.firstSampleInView + samplePosition);
			var amplitudeL  = samplesL[index];
			var amplitudeR  = samplesR[index];
			
			// Store only highest positive and negative amplitude.
			if(amplitudeL > 0) positiveAmplitudeL = Math.max(positiveAmplitudeL, amplitudeL);
			else negativeAmplitudeL = Math.min(negativeAmplitudeL, amplitudeL);
			if(amplitudeR > 0) positiveAmplitudeR = Math.max(positiveAmplitudeR, amplitudeR);
			else negativeAmplitudeR = Math.min(negativeAmplitudeR, amplitudeR);
			
			// If all sample polling for the current pixel(s) is done store the result.
			if(samplePosition >= nextPixelSamplePosition)
			{
				positiveL[vectorIndex] = positiveAmplitudeL;
				negativeL[vectorIndex] = negativeAmplitudeL;
				positiveR[vectorIndex] = positiveAmplitudeR;
				negativeR[vectorIndex] = negativeAmplitudeR;
				vectorIndex ++;
				
				// Prepare for next pixel / loop iteration.
				nextPixelSamplePosition += this.currentSamplesPerPixel * pixelsPerPoint;
				positiveAmplitudeL = 0;
				negativeAmplitudeL = 0;
				positiveAmplitudeR = 0;
				negativeAmplitudeR = 0;
			}
			
			samplePosition += this.pollingInterval;
		}
		
		this.waveContext.fillStyle = '#ff9933'; // alpha = 0.4
		
		// Draw positive left.
		for(i = 0; i < numPoints; i++)
		{
			var xPos = i * pixelsPerPoint;
			var yPos = this.displayMiddleL + Math.min((positiveL[i] * this.verticalZoomAmount), this.displayAmplitudeHeight);
			this.waveContext.lineTo(xPos, yPos);
		}
		
		// Draw negative left.
		for(i = numPoints - 1; i >= 0; i--)
		{
			xPos = i * pixelsPerPoint;
			yPos = this.displayMiddleL + Math.max((negativeL[i] * this.verticalZoomAmount), -this.displayAmplitudeHeight);
			this.waveContext.lineTo(xPos, yPos);
		}
		
		// Draw positive right.
		for(i = 0; i < numPoints; i++)
		{
			xPos = i * pixelsPerPoint;
			yPos = this.displayMiddleR + Math.min((positiveR[i] * this.verticalZoomAmount), this.displayAmplitudeHeight);
			this.waveContext.lineTo(xPos, yPos);
		}
		
		// Draw negative right.
		for(i = numPoints - 1; i >= 0; i--)
		{
			xPos = i * pixelsPerPoint;
			yPos = this.displayMiddleR + Math.max((negativeR[i] * this.verticalZoomAmount), -this.displayAmplitudeHeight);
			this.waveContext.lineTo(xPos, yPos);
		}
		
		this.waveContext.fill();
		this.waveContext.stroke();
	}, 
	drawStereoAsLine: function() {
		var nextPixelSamplePosition = this.currentSamplesPerPixel;
		var samplePosition = 0;
		var pixelIndex = 0;
		var positiveWaveHeightL = 0.0;
		var negativeWaveHeightL = 0.0;
		var positiveWaveHeightR = 0.0;
		var negativeWaveHeightR = 0.0;
		var leftX = 0;
		var leftY = this.displayMiddleL;
		var rightX = 0;
		var rightY = this.displayMiddleR;
		var samplesL = this.sound.channels[0];
		var samplesR = this.sound.channels[1];
		
		for(var i = 0;i < this.numPolledSamples;++i) {
			// Read the channels.
			var index = Math.floor(this.firstSampleInView + samplePosition);
			var amplitudeL = samplesL[index];
			var amplitudeR = samplesR[index];
			
			// Store only highest positive and negative amplitude.
			if(amplitudeL > 0) positiveWaveHeightL = Math.max(positiveWaveHeightL, amplitudeL);
			else negativeWaveHeightL = Math.min(negativeWaveHeightL, amplitudeL);
			if(amplitudeR > 0) positiveWaveHeightR = Math.max(positiveWaveHeightR, amplitudeR);
			else negativeWaveHeightR = Math.min(negativeWaveHeightR, amplitudeR);
			
			// If all sample polling for the current pixel is done draw the result.
			if(samplePosition >= nextPixelSamplePosition)
			{
				// Zoomed in: Draw waveform as line.
				if(positiveWaveHeightL > (negativeWaveHeightL * -1))
				{
					this.waveContext.moveTo(leftX, leftY);
					leftX = pixelIndex;
					leftY = this.displayMiddleL + Math.min((positiveWaveHeightL * this.verticalZoomAmount), this.displayAmplitudeHeight);
					this.waveContext.lineTo(leftX, leftY);
					
					this.waveContext.moveTo(rightX, rightY);
					rightX = pixelIndex;
					rightY = this.displayMiddleR + Math.min((positiveWaveHeightR * this.verticalZoomAmount), this.displayAmplitudeHeight);
					this.waveContext.lineTo(rightX, rightY);
				}
				else {
					this.waveContext.moveTo(leftX, leftY);
					leftX = pixelIndex;
					leftY = this.displayMiddleL + Math.max((negativeWaveHeightL * this.verticalZoomAmount), -this.displayAmplitudeHeight);
					this.waveContext.lineTo(leftX, leftY);
					
					this.waveContext.moveTo(rightX, rightY);
					rightX = pixelIndex;
					rightY = this.displayMiddleR + Math.max((negativeWaveHeightR * this.verticalZoomAmount), -this.displayAmplitudeHeight);
					this.waveContext.lineTo(rightX, rightY);
				}
				
				pixelIndex++;
				
				// Prepare for next pixel / loop iteration.
				nextPixelSamplePosition += this.currentSamplesPerPixel;
				positiveWaveHeightL = 0;
				negativeWaveHeightL = 0;
				positiveWaveHeightR = 0;
				negativeWaveHeightR = 0;
			}
			
			samplePosition += this.pollingInterval;
		}
		
		this.waveContext.stroke();
	}, 
	mouseDownHandler: function(event) {
		this.mouseIsDown = true;
		this.xAtMouseDown = event.pageX - this.canvas.offset().left;
		this.previousMouseY = event.pageY - this.canvas.offset().top;
		this.zoomCenterPosition = this.xAtMouseDown / this.width;
		this.sampleAtZoomCenter = this.firstSampleInView + 
			Math.round(this.numSamplesInView * this.zoomCenterPosition);
	}, 
	mouseMoveHandler: function(event) {
		if(this.mouseIsDown === false || this.sound === null ) {
			return;
		}
		
		var mouseX = event.pageX - this.canvas.offset().left;
		var mouseY = event.pageY - this.canvas.offset().top;
		
		// The distance the mouse was dragged.
		var distanceX = mouseX - this.xAtMouseDown;
		var distanceY = mouseY - this.previousMouseY;
		this.previousMouseY = mouseY;
		
		// The new zoom level.
		this.currentSamplesPerPixel -= (distanceY * this.currentSamplesPerPixel * 0.01);
		this.currentSamplesPerPixel = Math.max(this.minSamplesPerPixel, 
			Math.min(this.currentSamplesPerPixel, this.maxSamplesPerPixel));
		this.numSamplesInView = this.currentSamplesPerPixel * this.width;
		
		// The new position.
		this.zoomCenterPosition = (this.xAtMouseDown + distanceX) / this.width;
		this.firstSampleInView = this.sampleAtZoomCenter - (this.numSamplesInView * this.zoomCenterPosition);
		this.firstSampleInView = Math.max(0, Math.min(this.firstSampleInView, this.numSamplesTotal - this.numSamplesInView));
		
		// Polling stuff.
		this.pollingInterval = Math.max(1, this.currentSamplesPerPixel / 20);
		this.numPolledSamples = Math.floor(this.numSamplesInView / this.pollingInterval);
		this.samplesToSkip = Math.round(this.pollingInterval - 1);
		
		if(this.mouseIsDown) 
		{
			this.eventAggregator.trigger('HORIZONTAL_ZOOM_CHANGE', this.getTotalWidth());
			this.eventAggregator.trigger('POSITION_CHANGE', this.getPosition());
			this.eventAggregator.trigger('UPDATE_INFO', 
				this.firstSampleInView, 
				this.numSamplesInView, 
				this.numSamplesTotal);
		}
		
		this.invalidate();
	}, 
	mouseUpHandler: function() {
		this.mouseIsDown = false;
	}, 
	mouseDoubleClickHandler: function() {
		if( this.sound !== null ) {
			this.setCurrentSamplesPerPixel(this.maxSamplesPerPixel);
		}
	}, 
	getHorizontalZoomLevel: function() {
		// normalized and squared
		var value = (this.currentSamplesPerPixel - this.minSamplesPerPixel) / 
					(this.maxSamplesPerPixel - this.minSamplesPerPixel);
		var valueUnscaled = Math.sqrt(value);
		return valueUnscaled;
	}, 
	getTotalWidth: function() {
		return this.numSamplesTotal / this.currentSamplesPerPixel; 
	}, 
	getPosition: function() {
		return ( this.firstSampleInView / this.numSamplesTotal ) * this.width;
	}, 
	setPosition: function(position) {
		this.firstSampleInView = ( position / this.width ) * this.numSamplesTotal;
		this.eventAggregator.trigger('UPDATE_INFO', 
				this.firstSampleInView, 
				this.numSamplesInView, 
				this.numSamplesTotal);
				
		this.invalidate();
	}
};
