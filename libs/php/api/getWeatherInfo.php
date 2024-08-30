<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    $cityName = $_REQUEST['cityName'];

    $encodedCity = str_replace(' ', '_', $cityName);

    $apiKey = 'e4f89f2b08dc44739cd163029242401';

    $url = "https://api.weatherapi.com/v1/forecast.json?key={$apiKey}&q={$encodedCity}&days=3&aqi=no&alerts=no";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $url);

    $result = curl_exec($ch);
    $decode = json_decode($result, true);

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
    $output['data'] = $decode;

    curl_close($ch);

    header('Content-Type: application/json; charset=UTF-8');

    echo json_encode($output);

?>
