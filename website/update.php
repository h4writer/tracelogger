<?php

function query( $query )
{
    global $ml;

    $args = func_get_args();
    $j = count($args);

    for($i=1; $i<$j; $i++) {
        $args[$i] = mysqli_real_escape_string($ml, $args[$i]);
    }

    if (!empty($args[1]))
        $query = call_user_func_array('sprintf', $args);

    $result = mysqli_query($ml, $query);

    // An error occured
    if ($result === FALSE) {
          $error = mysqli_error ($ml);
          $erno = mysqli_errno ($ml);

          trigger_error ($error." (query was: ".$query.")");
    }

    return $result;
}

$services = getenv("VCAP_SERVICES");
$services_json = json_decode($services,true);

$mysql_config = $services_json["mysql"][0]["credentials"];
$host = $mysql_config["hostname"];
$user = $mysql_config["user"];
$pw = $mysql_config["password"];
$db = $mysql_config["name"];

$ml = mysqli_connect($host, $user, $pw) or die("ERROR: " . mysqli_error($ml));
mysqli_select_db($ml, $db) or die("ERROR: " . mysqli_error($ml));

if (!isset($_GET['action']))
    die();

if ($_GET['action'] == "start") {
    if (!ctype_alnum($_GET['revision']))
        die(); 
    if (!ctype_alnum($_GET['engine']))
        die();
    
    $query = query("SELECT ID from EngineInfo WHERE name = '%s' LIMIT 1", $_GET['engine']);
    if (mysqli_num_rows($query) == 0) {
        query("INSERT INTO EngineInfo (name) VALUES ('%s')", $_GET['engine']);
        $engineID = mysqli_insert_id($ml);

    } else {
        $engineInfo = mysqli_fetch_assoc($query);
        $engineID = $engineInfo["ID"];
    }

    query("INSERT INTO Run (engineInfoId, revision, submitDate) VALUES ('%d', '%s', NOW())", $engineID, $_GET['revision']);
    $runID = mysqli_insert_id($ml);

    echo "id=".$runID;

    mysqli_commit($ml);
    die();
}

if ($_GET['action'] == "score") {
    if (!ctype_digit($_GET['runid']))
        die(); 
    if (!ctype_alnum($_GET['suite']))
        die();
    if (!preg_match("/^[a-zA-Z0-9-.]*$/",$_GET['script']))
        die();
    if (!ctype_alnum($_GET['subject']))
        die();
    if (!ctype_alnum($_GET['score']))
        die();

    $query = query("SELECT finished from Run WHERE ID = '%s' LIMIT 1", $_GET['runid']);
    if (mysqli_num_rows($query) == 0)
        die();
    $run = mysqli_fetch_assoc($query);
    if ($run["finished"] == 1)
        die();

    $query = query("SELECT ID from ScriptInfo WHERE suite = '%s' AND name = '%s' LIMIT 1", $_GET['suite'], $_GET['script']);
    if (mysqli_num_rows($query) == 0) {
        query("INSERT INTO ScriptInfo (suite, name) VALUES ('%s', '%s')", $_GET['suite'], $_GET['script']);
        $scriptID = mysqli_insert_id($ml);

    } else {
        $scriptInfo = mysqli_fetch_assoc($query);
        $scriptID = $scriptInfo["ID"];
    }

    query("INSERT INTO Score (runID, scriptInfoID, subject, score) VALUES ('%d', '%d', '%s', '%s')", $_GET['runid'], $scriptID, $_GET['subject'], $_GET['score']);

    mysqli_commit($ml);
    die();
}

if ($_GET['action'] == "finish") {
    if (!ctype_digit($_GET['runid']))
        die();

    query("UPDATE Run SET finished = 1 WHERE ID = '%s'", $_GET['runid']);
}
