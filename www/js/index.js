var ENDPOINT_URL = 'http://atozgame.co.uk/gameservice.php';
var categories = [];
//var currentCategory = 'Animals';
var currentCategoryId = 0;
var currentLetter = '';
var clickType = 'mousedown';
var currentScore = 0;
var timer = new StopWatch();
var gimmesRemaining_maxWord = 10;
var gimmesRemaining_freezeTime = 10;
var gimmesRemaining_clueLetters = 10;
var gameEnabled = false;
var gameEntriesScroller, categoriesScroller;
var letters = new Array();
letters['Q'] = 10;
letters['W'] = 5;
letters['E'] = 1;
letters['R'] = 3;
letters['T'] = 2;
letters['Y'] = 3;
letters['U'] = 1;
letters['I'] = 1;
letters['O'] = 1;
letters['P'] = 3;
letters['A'] = 1;
letters['S'] = 2;
letters['D'] = 4;
letters['F'] = 4;
letters['G'] = 5;
letters['H'] = 3;
letters['J'] = 6;
letters['K'] = 5;
letters['L'] = 3;
letters['Z'] = 10;
letters['X'] = 10;
letters['C'] = 4;
letters['V'] = 8;
letters['B'] = 5;
letters['N'] = 2;
letters['M'] = 2;

var db = openDatabase( 'atozgame', 1.0, 'A to Z Game', 1024 * 1024 * 2 );

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
		// get latest database
		updateDatabase( function() {
			// back button clicks
			$('.header-bar .back-btn').click( backToHome );
			// change click event type for mobile devices
			if ('ontouchstart' in document.documentElement) {
				clickType = 'touchstart';
			}
			// init the game screen
			var keys = '';
			for ( var letter in letters ) {
				var value = letters[letter];
				if ( letter == 'Z' ) {
					// clear
					keys += '<div class="key key-alt" id="key-clear" data-key="clear"><span></span></div>';
				}
				keys += '<div class="key letter-key" id="key-' + letter + '" data-key="' + letter + '"><div><em>' + value + '</em><span>' + letter + '</span></div></div>';
				if ( letter == 'P' || letter == 'L' ) {
					keys += '<br />';
				}
				if ( letter == 'M' ) {
					// backspace
					keys += '<div class="key key-alt" id="key-backspace" data-key="backspace"><span></span></div>';
				}
			}
			keys += '<br />';
			//keys += '<div class="key key-long" id="key-gimme" data-key="gimme" onclick="showHelpPanel();"><span class="gimme">Gimme!</span><div></div></div>';
			keys += '<div class="key key-long" id="key-pass" data-key="pass" onclick="passWord();"><span>Pass!</span></div>';
			keys += '<div class="key key-long" id="key-space" data-key="space"><span>Space</span></div>';
			keys += '<div class="key key-long" id="key-enter" data-key="enter"><span>Enter</span><div></div></div>';
			// other keys
			$('#keyboard').append( '<div id="keyboardInner">' + keys + '</div>' );
			$('#keyboard .key').bind( clickType, function() {
				tapKey( $(this).data('key') );
			} );
			$('#keyboard .letter-key')
				.bind( clickType, function() {
					if ( gameEnabled ) {
						$(this).addClass('key-down');
					}
				} );
			$('#keyboard')
				.bind( 'mouseup touchend', function() {
					if ( gameEnabled ) {
						$('.key-down',this).removeClass('key-down');
					}
				} );
			// in-game helper click events
			//$('#help-panel-icon-max-word').click( useMaxWordGimme );
			//$('#help-panel-icon-freeze-time').click( useFreezeTimeGimme );
			//$('#help-panel-icon-clue-letters').click( useClueLettersGimme );
			// populate list of categories
			db.transaction( function(tx) {
				tx.executeSql( 'SELECT * FROM category ORDER BY title ASC', [], function( tx, results ) {
				alert('callback');
					var len = results.rows.length, i;
					for ( i = 0; i < len; i++ ){
						$('#category-list').append('<div class="category" onclick="selectCategory(this,' + results.rows.item(i).id + ');">' + results.rows.item(i).title + '</div>');
					}
					// hide splash screen
					setTimeout( function() {
						changeScreen('intro');
					}, 100 );
				} );
			} );
		} );
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
    }
};

function getCurrentDBVersion() {
	var ver = window.localStorage.getItem('currentDBVersion');
	if ( ver ) {
		return ver;
	} else {
		return 0;
	}
}
function setCurrentDBVersion( version ) {
	window.localStorage.setItem( 'currentDBVersion', version );
}

//setCurrentDBVersion(0);

function updateDatabase( callback ) {
	// check to make sure the database is installed
	//if ( getCurrentDBVersion() < gameData.version ) {
		db.transaction( function(tx) {
			// Drop tables
			tx.executeSql('DROP TABLE IF EXISTS category',[],function(){alert('drop cat success');},function(){alert('drop cat fail');});
			tx.executeSql('DROP TABLE IF EXISTS word',function(){alert('drop word success');},function(){alert('drop word fail');});
			// create the category table
			tx.executeSql('CREATE TABLE category ( id unique, title )',function(){alert('create cat success');},function(){alert('create cat fail');});
			// create the word table
			tx.executeSql('CREATE TABLE word ( id unique, category_id, word, score )',function(){alert('create word success');},function(){alert('ceate word fail');});
			// insert category data
			for ( var c in gameData.categories ) {
				//(function() {
					var cat = gameData.categories[c].title;
					tx.executeSql('INSERT INTO category ( id, title ) VALUES ( ?, ? ) ', [ parseInt( gameData.categories[c].id, 10 ), cat ], function() {
						alert('inserted ' + cat );
					}, function(a,err) {
						alert( err.message );
					} );
				//})();
			}
			// insert word data
			for ( var w in gameData.words ) {
				tx.executeSql('INSERT INTO word ( id, category_id, word, score ) VALUES ( ?, ?, ?, ? ) ', [ parseInt( gameData.words[w].id, 10 ), parseInt( gameData.words[w].category_id, 10 ), gameData.words[w].word, parseInt( gameData.words[w].score, 10 ) ] );
			}
			// update database version
			setCurrentDBVersion( gameData.version );
			callback();
		} );
	//} else {
	//	alert('no change');
	//	callback();
	//}
	/*
	var connection = 'wifi';
	if ( connection != 'none' ) {
		var currentVersion = getCurrentDBVersion();
		// try and get the latest database
		$.ajax( {
			url: ENDPOINT_URL,
			type: 'post',
			async: false,
			timeout: 20,
			data: {
				version: currentVersion
			},
			dataType: 'json',
			error: function( jqXHR, textStatus, errorThrown ) {
				// TODO: something
			},
			success: function( data, textStatus, jqXHR ) {
				if ( parseFloat( data.version ) > currentVersion ) {
					// newer version, set the data
					setCurrentDBVersion( parseFloat( data.version ) );
				}
			}
		} );
	}
	*/
}

function getCurrentCategory( callback ) {
	db.transaction( function(tx) {
		tx.executeSql( 'SELECT * FROM category WHERE id = ?', [ currentCategoryId ], function( tx, results ) {
			callback( results.rows.item(0) );
		} );
	} );
}

function selectCategory( el, id ) {
	currentCategoryId = id;
	$('#category-list .selected').removeClass('selected');
	$(el).addClass('selected');
	$('#select-category-button').addClass('active');
}

function selectedCategory() {
	var index = $('#category-list .selected').index();
	if ( index >= 0 ) {
		getCurrentCategory( function( category ) {
			$('#game-category').html( category.title );
			fadeOut('#categories-elements');
			var animSpeed = 1000;
			var $countdown = $('#game-countdown');
			$countdown.text('3').show().fadeOut( animSpeed, function() {
				$countdown.text('2').show().fadeOut( animSpeed, function() {
					$countdown.text('1').show().fadeOut( animSpeed, function() {
						$countdown.addClass('go').text('GO!').show();
						setTimeout( function() {
							changeScreen('game');
							$countdown.removeClass('go').hide();
						}, animSpeed );
					} );
				} );
			} );
		} );
	}
}

function fadeIn( selector ) {
	$(selector).css('opacity','');
}

function fadeOut( selector ) {
	$(selector).css('opacity','0.4');
}

/*
function getGimmeCountAvailable() {
	return gimmesRemaining_clueLetters + gimmesRemaining_maxWord + gimmesRemaining_freezeTime;
}

function useFreezeTimeGimme() {
	if ( gimmesRemaining_freezeTime > 0 ) {
		timer.pause();
		setTimeout( function() {
			timer.restart();
		}, 5000 );
		gimmesRemaining_freezeTime--;
		updateGimmesRemaining();
		closeHelpPanel();
	} else {
		showNoGimmesRemainingMessage();
	}
}

function useClueLettersGimme() {
	if ( gimmesRemaining_clueLetters > 0 ) {
		var bestWord = getBestWordForLetter();
		if ( bestWord.length == 3 ) {
			bestWord = bestWord.substr( 0, 2 );
		} else if ( bestWord.length > 2 ) {
			bestWord = bestWord.substr( 0, 3 );
		}
		updateWord( bestWord );
		gimmesRemaining_clueLetters--;
		updateGimmesRemaining();
		closeHelpPanel();
	} else {
		showNoGimmesRemainingMessage();
	}	
}

function useMaxWordGimme() {
	if ( gimmesRemaining_maxWord > 0 ) {
		var bestWord = getBestWordForLetter();
		gimmesRemaining_maxWord--;
		updateGimmesRemaining();
		closeHelpPanel();
		doSubmitWord( bestWord );
	} else {
		showNoGimmesRemainingMessage();
	}
}

function getBestWordForLetter() {
	var category = currentCategory;
	var foundLetter = false;
	var maxScore = 0;
	var bestWord = '';
	for ( var word in category.words ) {
		if ( category.words[word].substr(0,1).toUpperCase() == currentLetter ) {
			foundLetter = true;
			score = getWordValue( category.words[word] );
			if ( score > maxScore ) {
				maxScore = score;
				bestWord = category.words[word];
			}
		} else {
			if ( foundLetter ) {
				break;
			}
		}
	}
	return bestWord;
}

function updateGimmesRemaining() {
	$('#help-panel-max-word').html( gimmesRemaining_maxWord );
	$('#help-panel-freeze-time').html( gimmesRemaining_freezeTime );
	$('#help-panel-clue-letters').html( gimmesRemaining_clueLetters );
	$('#key-gimme div').html( getGimmeCountAvailable() + ' available' );
}

function showNoGimmesRemainingMessage() {
	alert('Oops!  You have none of these Gimmes available!  You can purchase more from the Gimme Store!');
}
*/

function showHelpPanel() {
	if ( gameEnabled ) {
		$('#help-panel').show();
	}
}

function closeHelpPanel() {
	$('#help-panel').hide();
}

function tapKey( key ) {
	if ( gameEnabled ) {
		var word = getWord();
		switch ( key ) {
			case 'backspace':
				word = word.substr( 0, word.length - 1 );
				updateWord( word );
				break;
			case 'gimme':
				break;
			case 'enter':
				submitWord();
				return;
			case 'space':
				if ( ( word != '' ) && ( word.substr( word.length - 1, 1 ) != ' ' ) ) {
					word += ' ';
					updateWord( word );
				}
				break;
			case 'clear':
				clearWord();
				return;
			default:
				word += key;
				updateWord( word );
				break;
		}
	}
}

function getWordContainer() {
	return $('#word');
}

function getWord() {
	var $entry = getWordContainer();
	return $entry.text();
}

function updateWord( word ) {
	var $entry = getWordContainer();
	$entry.text( word.toUpperCase() );
}

function clearWord() {
	updateWord('');
}

function getWordValue( word ) {
	var wordSplit = word.toUpperCase().split('');
	var score = 0;
	for ( var l in wordSplit ) {
		score += letters[ wordSplit[l] ];
	}
	return score;
}

function submitWord() {
	var word = getWord();
	doSubmitWord( word );
}

function addWordToList( word, score ) {
	var entryHeight = 41;
	var speed = 500;
	var status = ( score > 0 ? 'valid' : 'invalid' );
	var $entry = $('<div class="word-entry latest-entry"><div class="word-entry-inner ' + status + '-word"><div>' + word + '</div><span>' + score.toString() + '</span></div></div>').css({bottom:'-' + entryHeight + 'px'});
	clearWord();
	$('#entries').append( $entry );
	setTimeout( function() {
		var entryCount = $('#entries .word-entry').length;
		$('#entries .word-entry').each( function( i, previousEntry ) {
			var opacity = $(previousEntry).css('opacity');
			if ( opacity > 0.5 ) {
				opacity -= 0.075;
			}
			$(previousEntry).animate( {
				bottom: '+=' + entryHeight + 'px',
				opacity: opacity
			}, speed, function() {
				if ( i == ( entryCount - 1 ) ) {
					$('#entries .word-entry:last').css({opacity:1});
					setTimeout( function() {
						gameEntriesScroller.refresh();
					}, 0 );
				}
			} );
			$('.word-entry-inner',$entry).addClass('new-entry');
			$entry.removeClass('latest-entry');
		} );
	}, 100 );
	getNextLetter();
}

function doSubmitWord( word ) {
	if ( word.length > 1 ) {
		word = word.toUpperCase();
		if ( word.substr(0,1) == currentLetter ) {
			db.transaction( function(tx) {
				tx.executeSql( 'SELECT score FROM word WHERE category_id = ? AND word = ?', [ currentCategoryId, word ], function( tx, results ) {
					var score = 0;
					if ( results.rows.length > 0 ) {
						if ( results.rows.item(0).score ) {
							score = parseInt( results.rows.item(0).score, 10 );
							updateScore( score );
						}
					}
					addWordToList( word, score );
				}, function( tx, e ) {
					console.dir( e );
				} );
			} );
		} else {
			alert('Your word must begin with ' + currentLetter + '!');
		}
	}
}

function passWord() {
	addWordToList( '[PASS]', 0 );
}

function updateScore( points ) {
	var $scoreContainer = $('#game-score span');
	// show the score "puff"
	var $puff = $('<div class="score-puff">+' + points + '</div>');
	$('#entries').append( $puff );
	/*
	$puff.animate( {
		bottom: 100,
		opacity: 0
	}, 1000, 'swing', function() {
		$(this).remove();
	} );
	*/
	$puff.addClass('score-puff-anim');
	setTimeout( function() {
		$puff.remove();
	}, 1500 );
	var localCurrentScore = currentScore;
	currentScore += points;
	// update the current score
	for ( var i = 0; i < points; i++ ) {
		setTimeout( function() {
			localCurrentScore++;
			doUpdateScore( $scoreContainer, localCurrentScore );
		}, 50*i );
	}
}

function doUpdateScore( $scoreContainer, points ) {
	$scoreContainer.text( points );
}

function getNextLetter() {
	if ( currentLetter == '' ) {
		nextLetter = currentLetter = 'A';
	} else {
		var nextLetter = currentLetter.charCodeAt(0) + 1;
		nextLetter = String.fromCharCode( nextLetter ).toUpperCase();
	}
	db.transaction( function(tx) {
		tx.executeSql( 'SELECT COUNT(id) AS letterExists FROM word WHERE category_id = ? AND word LIKE ?', [ currentCategoryId, nextLetter+'%' ], function( tx, results ) {
			currentLetter = nextLetter;
			if ( results.rows.item(0).letterExists ) {
				$('#current-letter').html( nextLetter );
			} else {
				if ( nextLetter == 'Z' ) {
					gameFinished();
				} else {
					getNextLetter();
				}
			}
		} );
	} );
}

function gameFinished() {
	gameEnabled = false;
	$('#game-complete-score span').text( currentScore );
	if ( parseInt( currentScore, 10 ) == 0 ) {
		$('#game-complete-elements h2').html('Errr...');
	} else {
		$('#game-complete-elements h2').html('Well Done!');
	}
	fadeOut('#game-elements');
	$('#game-complete-panel').show();
}

function quitGame() {
	if ( gameEnabled ) {
		if ( confirm( 'Are you sure you want to quit this game?' ) ) {
			timer.stop();
			timer.reset();
			changeScreen('intro');
		}
	}
}

function changeScreen( screen ) {
	gameEnabled = false;
	$('.screen:visible').hide();
	$('#screen-' + screen).show();
	window.scrollTo( 0, 0 );
	switch ( screen ) {
		case 'game':
			startGame();
			break;
		case 'categories':
			fadeIn('#categories-elements');
			categoriesScroller = new iScroll( 'category-list-container', { hScrollbar: false, vScrollbar: false, snap: 'div' } );
			break;
	}
}

function startGame() {
	// update gimmes remaining
	//updateGimmesRemaining();
	// start the timer
	timer.start();
	// reset the score
	currentScore = 0;
	// clear the board
	$('#entries').empty();
	// reset the current letter
	currentLetter = '';
	getNextLetter();
	fadeIn('#game-elements');
	$('#game-complete-panel').hide();
	setTimeout( function() {
		gameEntriesScroller = new iScroll( 'entries-viewport', { hScrollbar: false, vScrollbar: false } );
	}, 500 );
	gameEnabled = true;
}

function backToHome() {
	changeScreen('intro');
}

function postScoreToFacebook() {
	alert('doesn\'t work yet!');
}

String.prototype.pad = function(l, s, t){
	// t: 0 = left, 1 = right and 2 = both sides
    return s || (s = " "), (l -= this.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + this + s.substr(0, l - t) : this;
};