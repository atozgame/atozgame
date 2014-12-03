<?php
// USE importwords.php IN atozgame.co.uk INSTEAD!

/*
$dev = true;
if ( $dev ) {
	$hostname = 'localhost';
	$dbUsername = 'root';
	$dbPassword = '';
	$dbName = 'atozgame';
} else {
}

$dbh = mysql_connect($hostname,$dbUsername,$dbPassword,$dbName) or die("Unable to connect to MySQL");
$selected = mysql_select_db("$dbName",$dbh) or die("Could not select $dbName");

function getScore( $word ) {
	return 12;
}

$result = mysql_query('SELECT * FROM word WHERE score IS NULL');
while( $row = mysql_fetch_assoc($result) ) {
	$score = getScore( $row['word'] );
	$sql = 'UPDATE word SET score = ' . $score . ' WHERE id = ' . $row['id'];
	mysql_query( $sql );
	print $sql . '<br>';
}

print 'DONE';
*/