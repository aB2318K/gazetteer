<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    $apiKey = 'pub_36871273d941411637d319f394dc89e8aa2e9';
    $countryCode = $_REQUEST['countryCode']; 

    $url = "https://newsdata.io/api/1/news?country={$countryCode}&apikey={$apiKey}&image=1&size=5";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $result = curl_exec($ch);

    curl_close($ch);

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
    $output['data'] = json_decode($result, true);

    header('Content-Type: application/json; charset=UTF-8');

    echo json_encode($output);

?>
