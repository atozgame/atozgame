var ENDPOINT_URL = 'http://atozgame.co.uk/gameservice.php';
var testing = false;
var categories = [];
var currentCategoryId = 0;
var currentLetter = '';
var currentScore = 0;
var timer = new StopWatch();
var gimmesRemaining_maxWord = 10;
var gimmesRemaining_freezeTime = 10;
var gimmesRemaining_clueLetters = 10;
var gameEnabled = false;
var gameEntriesScroller, categoriesScroller;
var passEnabled = true;
var submitWordEnabled = true;
var gameEntriesContainerHeight = 0;
var passText = '[PASS]';
var hideModalOnOK = true;
var gaPlugin;
var admobid = {};
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

$.mobile.autoInitializePage = false;

var db = openDatabase( 'atozgame', 1.0, 'A to Z Game', 1024 * 1024 * 2 );

function trackEvent( successCallback, failureCallback, category, action, label, value ) {
	if ( gaPlugin ) {
		gaPlugin.trackEvent( successCallback(), failureCallback(), category, action, label, value );
	}
}

function soundsEnabled() {
	var enabled = window.localStorage.getItem('soundsEnabled');
	if ( ( enabled === 'true' ) || ( enabled === null ) ) {
		return true;
	} else {
		return false;
	}
}

function toggleSounds() {
	var enabled = soundsEnabled();
	window.localStorage.setItem( 'soundsEnabled', (!enabled).toString() );
	trackEvent( function() {}, function() {}, 'Settings', 'Sound', ( !enabled ? 'Muted' : 'Unmuted' ), 1 );
	$('.sound-toggle').toggleClass('muted');
}

function updateProgressBar( text, percent ) {
	$('#progress-bar-text').html( text );
	$('#progress-bar-bar-progress').animate( { width: percent + '%' }, 250 );
}

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
		// get latest database
		updateDatabase( function() {
			// sound toggles
			$('.sound-toggle').on( 'tap', function(e) {
				e.preventDefault();
				toggleSounds();
			} );
			// mute?
			if ( !soundsEnabled() ) {
				$('.sound-toggle').addClass('muted');
			}
			// intro button touch events
			$('#intro-button-highscores').on( 'tap', function(e) {
				e.preventDefault();
				changeScreen('highscores');
			} );
			$('#intro-button-help').on( 'tap', function(e) {
				e.preventDefault();
				changeScreen('help');
			} );
			$('#intro-button-play').on( 'tap', function(e) {
				e.preventDefault();
				changeScreen('categories');
			} );
			// help page touch events
			$('#help-panel-close').on( 'tap', function(e) {
				e.preventDefault();
				closeHelpPanel();
			} );
			// category screen touch events
			$('#select-category-button').on( 'tap', function(e) {
				e.preventDefault();
				selectedCategory();
			} );
			// back button clicks
			$('.header-bar .back-btn').on( 'tap', function(e) {
				e.preventDefault();
				backToHome();
			} );
			// init the game screen
			var keys = '';
			for ( var letter in letters ) {
				var value = letters[letter];
				if ( letter == 'Z' ) {
					// clear
					keys += '<div class="key letter-key key-alt" id="key-hyphen" data-key="hyphen"><div><em>0</em><span>-</span></div></div>';
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
			keys += '<div class="key key-long" id="key-pass" data-key="pass"><span>Pass!</span></div>';
			keys += '<div class="key key-long" id="key-space" data-key="space"><span>Space</span></div>';
			keys += '<div class="key key-long" id="key-enter" data-key="enter"><span>Enter!</span><div></div></div>';
			// other keys
			$('#keyboard').append( '<div id="keyboardInner">' + keys + '</div>' );
			$('#keyboard .key').on( 'touchend', function() {
				tapKey( $(this).data('key') );
			} );
			$('#keyboard .letter-key').on( 'touchstart', function() {
				if ( gameEnabled ) {
					$(this).addClass('key-down');
				}
			} );
			$('#keyboard').on( 'touchend', function() {
				if ( gameEnabled ) {
					$('.key-down',this).removeClass('key-down');
				}
			} );
			// in-game helper click events
			$('#game-header-btn').on( 'tap', function(e) {
				e.preventDefault();
				quitGame();
			} );
			$('#clear-word').on( 'tap', function(e) {
				e.preventDefault();
				clearWord();
			} );
			$('#word-submit-button').on( 'tap', function(e) {
				e.preventDefault();
				submitWord();
			} );
			$('#game-complete-facebook-button').on( 'tap', function(e) {
				e.preventDefault();
				postScoreToFacebook(); 
			} );
			$('#game-complete-play-again-button').on( 'tap', function(e) {
				e.preventDefault();
				$('#game-complete-panel').hide();
				doCountdown();
			} );
			$('#game-complete-another-cat-button').on( 'tap', function(e) {
				e.preventDefault();
				changeScreen('categories');
			} );
			//$('#help-panel-icon-max-word').click( useMaxWordGimme );
			//$('#help-panel-icon-freeze-time').click( useFreezeTimeGimme );
			//$('#help-panel-icon-clue-letters').click( useClueLettersGimme );
			// populate list of categories
			db.transaction( function(tx) {
				tx.executeSql( 'SELECT * FROM category ORDER BY title ASC', [], function( tx, results ) {
					var len = results.rows.length, i;
					for ( i = 0; i < len; i++ ){
						$('#category-list').append('<div class="category" onclick="selectCategory(this,' + results.rows.item(i).id + ');">' + results.rows.item(i).title + '</div>');
					}
					// button tap sounds
					$('button, .header-bar-btn').on( 'tap', function(e) {
						e.preventDefault();
						playSound('pop');
					} );
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
		// select the right Ad Id according to platform
		if( AdMob ) {
			if( /(android)/i.test(navigator.userAgent) ) { // for android
				admobid = {
					banner: 'ca-app-pub-5744843625528542/1436981712', // or DFP format "/6253334/dfp_example_ad"
					interstitial: 'ca-app-pub-5744843625528542/6102462911'
				};
			} else if(/(ipod|iphone|ipad)/i.test(navigator.userAgent)) { // for ios
				admobid = {
					banner: 'ca-app-pub-5744843625528542/4449323713', // or DFP format "/6253334/dfp_example_ad"
					interstitial: 'ca-app-pub-5744843625528542/7579196115'
				};
			}/* else { // for windows phone
				admobid = {
					banner: '', // or DFP format "/6253334/dfp_example_ad"
					interstitial: ''
				};
			}*/
			AdMob.createBanner( {
				adId: admobid.banner, 
				position: AdMob.AD_POSITION.BOTTOM_CENTER, 
				autoShow: true,
				overlap: true,
				isTesting: false,
				success: function() {
				},
				error: function() {
				}
			} );
		}
		gaPlugin = window.plugins.gaPlugin;
		gaPlugin.init( function() { /* success */ }, function() { /* failure */ }, "UA-59593790-1", 10 );
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
	if ( getCurrentDBVersion() < gameData.version ) {
		db.transaction( function(tx) {
			// Drop tables
			tx.executeSql('DROP TABLE IF EXISTS category',[]);
			tx.executeSql('DROP TABLE IF EXISTS word',[]);
			// create the category table
			tx.executeSql('CREATE TABLE category ( id unique, title, description, disputable )',[]);
			// create the word table
			tx.executeSql('CREATE TABLE word ( id unique, category_id, word, score )',[]);
			// create high score table if necessary
			tx.executeSql('CREATE TABLE IF NOT EXISTS highscores ( id unique, category_id, score, seconds_taken )',[]);
			// any ALTER statements must be wrapped in "if ( getCurrentDBVersion() < xx ) {"
			// tx.executeSql('ALTER TABLE highscores ADD COLUMN seconds_taken',[]);
			// insert category data
			updateProgressBar( 'Updating categories...', 10 );
			for ( var c in gameData.categories ) {
				tx.executeSql('INSERT INTO category ( id, title, description, disputable ) VALUES ( ?, ?, ?, ? ) ', [ parseInt( gameData.categories[c].id, 10 ), gameData.categories[c].title, gameData.categories[c].description, parseInt( gameData.categories[c].disputable, 10 ) ] );
			}
			updateProgressBar( 'Updating words...', 40 );
			setTimeout( function() {
				updateProgressBar( 'Updating words...', 70 );
				setTimeout( function() {
					updateProgressBar( 'Nearly there...', 90 );
				}, 3000 );
			}, 2000 );
			// insert word data
			for ( var w in gameData.words ) {
				tx.executeSql('INSERT INTO word ( id, category_id, word, score ) VALUES ( ?, ?, ?, ? ) ', [ parseInt( gameData.words[w].id, 10 ), parseInt( gameData.words[w].category_id, 10 ), gameData.words[w].word, parseInt( gameData.words[w].score, 10 ) ] );
			}
			// update database version
			setCurrentDBVersion( gameData.version );
			updateProgressBar( 'Get ready!', 100 );
			callback();
		} );
	} else {
		callback();
	}
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
	playSound('pop');
	getCurrentCategory( function( category ) {
		$('#category-list .selected').removeClass('selected');
		$(el).addClass('selected');
		var $desc = $('#category-description');
		$desc.slideUp( 150, function() {
			$(this).html( '<h2>' + category.title + '</h2><p>' + category.description + '</p>' ).slideDown(150);
		} );
		$('#select-category-button').addClass('active');
		$('#select-category-button').removeClass('button-disabled');
	} );
}

function doCountdown() {
	var animSpeed = 1000;
	var $countdownWrapper = $('#game-countdown-wrapper');
	$countdownWrapper.show();
	var $countdown = $('#game-countdown');
	$countdown.text('3').show().fadeOut( animSpeed, function() {
		$countdown.text('2').show().fadeOut( animSpeed, function() {
			$countdown.text('1').show().fadeOut( animSpeed, function() {
				$countdown.addClass('go').text('go!').show();
				setTimeout( function() {
					changeScreen('game');
					$countdown.removeClass('go').hide();
					$countdownWrapper.hide();
				}, animSpeed );
			} );
		} );
	} );
}

function selectedCategory() {
	var index = $('#category-list .selected').index();
	if ( index >= 0 ) {
		getCurrentCategory( function( category ) {
			trackEvent( function() {}, function() {}, 'Category', 'Selected', category.title, 1 );
			$('#game-category').html( category.title );
			fadeOut('#categories-elements');
			doCountdown();
		} );
	}
}

function fadeIn( selector ) {
	$(selector).css('opacity','');
}

function fadeOut( selector ) {
	$(selector).css('opacity','0.1');
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

function playSound( name ) {
	if ( soundsEnabled() ) {
		if ( name == 'wrong' ) {
			if ( navigator.notification ) {
				navigator.notification.vibrate(200);
			}
		} else {
			//document.getElementById('sound-' + name ).play();
			if ( typeof device != 'undefined' ) {
				if ( device.platform == 'Android' ) { 
					var src = '/android_asset/www/sounds/'; 
				} else {
					var src = './sounds/';
				}
				var media = new Media( src + '' + name + '.mp3', function() {
						/* onsuccess */
						//alert('media loaded');
					},
					function(err) {
						/* onerror */
						//alert('1 media error - ' + JSON.stringify( err ) );
					} );
				media.play();
			}
		}
	}
}

function tapKey( key ) {
	if ( gameEnabled ) {
		var word = getWord();
		playSound('click');
		switch ( key ) {
			case 'backspace':
				if ( word.length > 1 ) {
					word = word.substr( 0, word.length - 1 );
					updateWord( word );
				}
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
			case 'hyphen':
				word += '-';
				updateWord( word );
				return;
			case 'pass':
				passWord();
				break;
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
	$entry.css('float','left');
	$entry.text( word.toUpperCase() );
	var wordWidth = $entry.width();
	var containerWidth = $('#word-container').width();
	if ( wordWidth > containerWidth ) {
		$entry.css('float','right');
	}
}

function clearWord() {
	updateWord( currentLetter );
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
	if ( submitWordEnabled ) {
		submitWordEnabled = false;
		var word = getWord();
		doSubmitWord( word );
	}
}

function disputeWord( word ) {
	getCurrentCategory( function( category ) {
		if ( category.disputable ) {
			confirmModal(
				'Wait, this <strong>IS</strong> a word!',
				'If you think ' + word + ' should be added to the database for this category, go ahead and let us know!',
				function() {
					hideModalOnOK = false;
					doDisputeWord( word );
				},
				function() {
				}
			);
		} else {
			alertModal( 'Sorry...', 'This category is fact-based and so words cannot be suggested for it.', function() { }, ':(' );
		}
	} );
}

var disputeWordsCompleteIntrvl;

function doDisputeWord( word ) {
	getCurrentCategory( function( category ) {
		$.post(
			'http://www.atozgame.co.uk/disputeword.php',
			{
				word: word,
				category: category.title
			},
			function( data ) {
				var awardPoints = function() {
					updateScore( 5 );
				}
				hideModal();
				alertModal( 'Thanks!', 'Your wisdom has been received!', function() {
					clearTimeout( disputeWordsCompleteIntrvl );
					awardPoints();
				} );
				disputeWordsCompleteIntrvl = setTimeout( function() {
					hideModal();
					awardPoints();
				}, 2000 );
			},
			'json'
		)
		.fail( function(e) {
			confirmModal(
				'Uh-oh...',
				'Looks like something went wrong... Wanna try again?',
				function() {
					hideModalOnOK = false;
					$('#confirm-modal-message').html( 'Re-trying...' );
					doDisputeWord( word );
				},
				function() {
					hideModal();
				}
			);
		} );
	} );
}

var startColorRed = 234;
var startColorGreen = 236;
var startColorBlue = 238;

function addWordToList( word, score ) {
	var entryHeight = ( $(window).width() < 768 ) ? '41px' : '4.05rem';
	var speed = 500;
	var status = ( score > 0 ? 'valid' : 'invalid' );
	if ( score > 0 ) {
		var outputScore = '+' + score.toString();
	} else {
		var outputScore = '0';
	}
	var disputable = ( ( score == 0 ) && ( word != passText ) ) ? ' disputable' : '';
	var $entry = $('<div class="word-entry ' + status + '-word' + disputable + '"><div class="word-entry-inner"><div>' + word + '</div><span>' + outputScore + '</span></div></div>').css({bottom:'-' + entryHeight });
	if ( ( score == 0 ) && ( word != passText ) ) {
		$entry.click( function() {
			disputeWord( word );
		} );
	}
	var entryCount = $('#entries .word-entry').length + 1;
	var newHeight = entryCount * ( parseInt( entryHeight, 10) );
	var $entries = $('#entries');
	$entries.css( 'height', newHeight + 'px' );
	$('#entries-container')[0].scrollTop = newHeight;
	$entries.append( $entry );
	$('.word-entry',$entries).each( function( i, previousEntry ) {
		var index = ( entryCount - i ) - 1;
		var r = Math.max( 153 - ( index * 3 ), startColorRed - ( index * 17 ) );
		var g = Math.max( 162 - ( index * 2 ), startColorGreen - ( index * 14 ) );
		var b = Math.max( 174 - ( index * 1 ), startColorBlue - ( index * 11 ) );
		$(previousEntry).animate( {
			bottom: '+=' + entryHeight,
			backgroundColor: 'rgb(' + r + ',' + g + ',' + b + ')'
		}, speed );
		// next 3 lines are to prevent android render issue
		previousEntry.style.display = 'none';
		previousEntry.offsetHeight;
		previousEntry.style.display = '';
		$('.word-entry-inner',$entry).addClass('new-entry');
	} );
	getNextLetter();
}

function doSubmitWord( word ) {
	if ( word.length > 1 ) {
		word = word.toUpperCase();
		if ( word.substr(0,1) == currentLetter ) {
			db.transaction( function(tx) {
				var originalWord = word;
				word = word.replace(/ /g,'');
				word = word.replace(/-/g,'');
				if ( word.substr(-1) == 'S' ) {
					wordPlural = word.substr(0,word.length-1);
				} else {
					wordPlural = word + 'S';
				}
				tx.executeSql( 'SELECT score FROM word WHERE category_id = ? AND ( ( REPLACE( REPLACE( word, " ", "" ), "-", "" ) = ? ) OR ( REPLACE( REPLACE( word, " ", "" ), "-", "" ) = ? ) ) LIMIT 1 ', [ currentCategoryId, word, wordPlural ], function( tx, results ) {
					var score = 0;
					if ( results.rows.length > 0 ) {
						if ( results.rows.item(0).score ) {
							score = parseInt( results.rows.item(0).score, 10 );
							updateScore( score );
						} else {
							playSound('wrong');
						}
					} else {
						playSound('wrong');
					}
					addWordToList( originalWord, score );
					setTimeout( function() {
						submitWordEnabled = true;
					}, 500 );
				}, function( tx, e ) {
					setTimeout( function() {
						submitWordEnabled = true;
					}, 500 );
				} );
			} );
		} else {
			submitWordEnabled = true;
			alertModal( 'Errr...', 'Your word must begin with ' + currentLetter + '!', function() {} );
		}
	} else {
		submitWordEnabled = true;
	}
}

function passWord() {
	if ( passEnabled ) {
		passEnabled = false;
		addWordToList( passText, 0 );
		setTimeout( function() {
			passEnabled = true;
		}, 500 );
	}
}

function updateScore( points ) {
	playSound('correct');
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
			doUpdateScore( localCurrentScore );
		}, 50*i );
	}
}

function doUpdateScore( points ) {
	var $scoreContainer = $('#game-score span');
	$scoreContainer.text( points );
}

function getNextLetter() {
	if ( currentLetter == '' ) {
		nextLetter = currentLetter = 'A';
	} else {
		var nextLetter = currentLetter.charCodeAt(0) + 1;
		nextLetter = String.fromCharCode( nextLetter ).toUpperCase();
	}
	// _ is the next character after Z
	if ( nextLetter == '_' ) {
		setTimeout( gameFinished, 1500 ); // timeout so the last letter can be seen
	} else {
		db.transaction( function(tx) {
			tx.executeSql( 'SELECT COUNT(id) AS letterExists FROM word WHERE category_id = ? AND word LIKE ?', [ currentCategoryId, nextLetter+'%' ], function( tx, results ) {
				currentLetter = nextLetter;
				if ( testing && ( nextLetter == 'E' ) ) {
					gameFinished();
				} else {
					if ( results.rows.item(0).letterExists ) {
						updateWord( nextLetter );
					} else {
						if ( nextLetter == '_' ) {
							setTimeout( gameFinished, 1500 ); // timeout so the last letter can be seen
						} else {
							getNextLetter();
						}
					}
				}
			} );
		} );
	}
}

function gameFinished() {
	timer.stop();
	if( typeof AdMob != 'undefined' ) {
		AdMob.showInterstitial();
	}
	currentScore = parseInt( currentScore, 10 );
	trackEvent( function() {}, function() {}, 'Game', 'Completed', $('#game-category').text(), currentScore );
	gameEnabled = false;
	// see if this is a new high score
	db.transaction( function(tx) {
		tx.executeSql( 'SELECT score, seconds_taken FROM highscores WHERE category_id = ?', [ currentCategoryId ], function( tx, results ) {
			var newHighScore = false;
			var secondsTaken = timer.duration();
			if ( results.rows.length == 0 ) {
				newHighScore = true;
				tx.executeSql( 'INSERT INTO highscores ( score, seconds_taken, category_id ) VALUES ( ?, ?, ? )', [ currentScore, secondsTaken, currentCategoryId ] );
			} else if ( currentScore == parseInt( results.rows.item(0).score, 10 ) ) {
				if ( secondsTaken < parseInt( results.rows.item(0).seconds_taken, 10 ) ) {
					newHighScore = true;
					tx.executeSql( 'UPDATE highscores SET score = ?, seconds_taken = ? WHERE category_id = ?', [ currentScore, secondsTaken, currentCategoryId ] );
				}
			} else if ( currentScore > parseInt( results.rows.item(0).score, 10 ) ) {
				newHighScore = true;
				tx.executeSql( 'UPDATE highscores SET score = ?, seconds_taken = ? WHERE category_id = ?', [ currentScore, secondsTaken, currentCategoryId ] );
			}
			$('#game-complete-score span').text( currentScore );
			if ( newHighScore ) {
				$('#game-complete-elements h2').html('New High Score!');
			} else if ( currentScore == 0 ) {
				$('#game-complete-elements h2').html('Errr...');
			} else {
				$('#game-complete-elements h2').html('Well Done!');
			}
			fadeOut('#game-elements');
			$('#game-complete-panel').show();
		} );	
	} );
}

function quitGame() {
	if ( gameEnabled ) {
		confirmModal(
			'Really?',
			'Are you sure you want to quit this game?',
			function() {
				timer.stop();
				timer.reset();
				changeScreen('intro');
				trackEvent( function() {}, function() {}, 'Game', 'Quit', $('#game-category').text(), 1 );
			},
			function() {
			}
		);
	}
}

function alertModal( title, message, okCallback, icon ) {
	if ( typeof icon == 'undefined' ) {
		icon = '!';
	}
	$('#confirm-modal-cancel').hide();
	showModal( title, message, icon, okCallback, function() {} );
}

function confirmModal( title, message, okCallback, cancelCallback ) {
	$('#confirm-modal-cancel').show();
	showModal( title, message, '?', okCallback, cancelCallback );
}

function hideModal() {
	$('#confirm-modal-wrapper').hide();
}

function showModal( title, message, icon, okCallback, cancelCallback ) {
	if ( title && message ) {
		fadeOut('.screen:visible');
		$('#confirm-modal-icon').html( icon );
		$('#confirm-modal-title').html( title );
		$('#confirm-modal-message').html( message );
		$('#confirm-modal-ok').off('tap').on( 'tap', function(e) {
			e.preventDefault();
			okCallback();
			if ( hideModalOnOK ) {
				hideModal();
			}
			hideModalOnOK = true;
		} );
		$('#confirm-modal-cancel').off('tap').on( 'tap', function(e) {
			e.preventDefault();
			hideModalOnOK = true;
			hideModal();
			cancelCallback();
		} );
	}
	$('#confirm-modal-wrapper').show();
}

function hideModal() {
	$('#confirm-modal-wrapper').hide();
	fadeIn('.screen:visible');
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
			categoriesScroller = new iScroll( 'category-list-container' );
			break;
		case 'highscores':
			trackEvent( function() {}, function() {}, 'Screen', 'Viewed', 'High Scores', 1 );
			initHighScoreScreen();
			break;
		case 'help':
			trackEvent( function() {}, function() {}, 'Screen', 'Viewed', 'Help', 1 );
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
	doUpdateScore( currentScore );
	// clear the board
	$('#entries').empty();
	// clear the word entry box
	clearWord();
	// ensure pass is enabled
	passEnabled = true;
	// and the ability to submit
	submitWordEnabled = true;
	// reset the current letter
	currentLetter = '';
	getNextLetter();
	fadeIn('#screen-game');
	fadeIn('#game-elements');
	$('#game-complete-panel').hide();
	$('#facebookSharedMsg').hide();
	$('#game-complete-facebook-button').show();
	// reset game iscroll
	gameEntriesScroller = false;
	// set height of entries area
	gameEntriesContainerHeight = ( $('#word-entry').offset().top - $('#game-header').height() ) + 'px';
	$('#entries-viewport, #entries-container').css( 'height', gameEntriesContainerHeight );
	$('#entries').css( 'min-height', gameEntriesContainerHeight );
	gameEntriesContainerHeight = parseInt( gameEntriesContainerHeight, 10 );
	gameEnabled = true;
	// get an ad ready
	if( typeof AdMob != 'undefined' ) {
		AdMob.prepareInterstitial({adId:admobid.interstitial, autoShow:false});
	}
}

function backToHome() {
	changeScreen('intro');
}

function postScoreToFacebook() {
	getCurrentCategory( function( category ) {
		trackEvent( function() {}, function() {}, 'Social', 'Facebook', 'Clicked', 1 );
		shareToFacebook(
			'I just scored ' + currentScore + ' on the ' + category.title + ' category! #AtoZGame',
			'http://www.atozgame.co.uk/images/fbpost.png', /* image */
			'http://www.atozgame.co.uk', /* url */
			function( response ) {
				if ( response.post_id ) {
					trackEvent( function() {}, function() {}, 'Social', 'Facebook', 'Shared', 1 );
					$('#facebookSharedMsg').html('Shared!').show();
					$('#game-complete-facebook-button').hide();
				}
			},
			function( error ) {
				trackEvent( function() {}, function() {}, 'Social', 'Facebook', 'Failed: ' + msg, 1 );
			}
		);
	} );
}

String.prototype.pad = function(l, s, t){
	// t: 0 = left, 1 = right and 2 = both sides
    return s || (s = " "), (l -= this.length) > 0 ? (s = new Array(Math.ceil(l / s.length)
        + 1).join(s)).substr(0, t = !t ? l : t == 1 ? 0 : Math.ceil(l / 2))
        + this + s.substr(0, l - t) : this;
};

function convertSecondsToTime( seconds ) {
	if ( seconds ) {
		var minutes = Math.floor( ( seconds % 3600 ) / 60 );
		var seconds = Math.floor( seconds % 60 );
		return minutes + ':' + seconds.toString().pad( 2, '0', 0 );
	} else {
		return '-';
	}
}

function initHighScoreScreen() {
	db.transaction( function(tx) {
		tx.executeSql( 'SELECT category.title, COALESCE( highscores.score, 0 ) AS highscore, COALESCE( highscores.seconds_taken, 0 ) AS seconds_taken FROM category LEFT JOIN highscores ON category.id = highscores.category_id', [], function( tx, results ) {
			var html = 	'<table cellspacing="0" cellpadding="0">' +
						'<thead>' +
						'	<tr>' +
						'		<th>Category</th>' +
						'		<th class="time_taken">Time</th>' +
						'		<th class="highscore">High Score</th>' +
						'	</tr>';
						'</thead>';
						'<tbody>';
			if ( results.rows.length > 0 ) {
				for ( var i = 0; i < results.rows.length; i++ ) {
					html +=	'	<tr class="' + ( ( i % 2 == 0 ) ? 'row' : 'alt-row' ) + '">' + 
							'		<td class="category">' + results.rows.item(i).title + '</td>' +
							'		<td class="time_taken">' + convertSecondsToTime( results.rows.item(i).seconds_taken ) + '</td>' +
							'		<td class="highscore">' + results.rows.item(i).highscore + '</td>' +
							'	</tr>';
				}
			} else {
				html +=	'	<tr>' + 
						'		<td colspan="2">No scores found</td>' +
						'	</tr>';
			}
			html += '</tbody>';
			html += '</table>';
			$('#highscoresTable').html( html );
		} );
	} );
}

function passEverything() {
	var its = 0;
	function s() {
		if ( its < 25 ) {
		   passWord();
		   its++;
		   setTimeout( s, 500 );
		}
	}
	s();
}

function shareToFacebook( message, image, url, success, failure ) {
	facebookConnectPlugin.showDialog(
		{
			method: 'feed',
			link: url,
			name: 'The A to Z Game App',
			caption: 'Download from atozgame.co.uk!',
			description: message,
			picture: image
		},
		success,
		failure
	);
}