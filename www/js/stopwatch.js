function StopWatch() {
	var startTime = null;
	var stopTime = null;
	var running = false;
	var interval;
	var $timeContainer = $('#game-timer');
	
	this.start = function(){
		if (running == true)
			return;
		else if (startTime != null)
			stopTime = null;
		running = true;    
		startTime = getTime();// - 3598000;
		var tmr = this;
		interval = setInterval( function() {
			tmr.tick();
		}, 250 );
	}

	this.stop = function(){
		if (running == false)
			return;
		stopTime = getTime();
		running = false;
		clearInterval( interval );
	}
	
	this.pause = this.stop;
	
	this.restart = function() {
		if ( ( running == true ) || ( stopTime == null ) )
			return;
		running = true;  
		stopTime = null;	
		var tmr = this;
		interval = setInterval( function() {
			tmr.tick();
		}, 250 );
	}

	this.duration = function(){
		if (startTime == null) {
			return 0;
		}
		if (stopTime == null) {
			var tmpStopTime = getTime();
		} else {
			var tmpStopTime = stopTime;
		}
		return (tmpStopTime - startTime) / 1000;
	}
	
	this.reset = function() {
		this.updateTime( 0, 0, 0 );
	}

	this.tick = function() {
		var duration = this.duration();
		var hours = ( Math.floor( duration / 3600 ) );
		var minutes = ( Math.floor( ( duration % 3600 ) / 60 ) );
		var seconds = ( Math.floor( duration % 60 ) );
		this.updateTime( hours, minutes, seconds );
	}
	
	this.updateTime = function( hours, minutes, seconds ) {
		$timeContainer.text( hours.toString().pad(2,'0',0) + ':' + minutes.toString().pad(2,'0',0) + ':' + seconds.toString().pad(2,'0',0) );
	}
	
	this.isRunning = function() {
		return running;
	}

	function getTime(){
		var day = new Date();
		return day.getTime();
	}
}