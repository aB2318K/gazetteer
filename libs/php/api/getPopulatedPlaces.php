<?php

    // Remove for production
    ini_set('display_errors', 'Off');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    $isoCode = $_REQUEST['isoCode'];

    $apiUrl = "http://api.geonames.org/searchJSON";
    $username = "234abp";

    $queryParams = http_build_query([
        'country' => $isoCode,
        'featureClass' => 'P',
        'featureCode' => 'PPL',
        'username' => $username,
    ]);

    $url = "$apiUrl?$queryParams";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, $url);

    $result = curl_exec($ch);

    curl_close($ch);

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    $data = json_decode($result, true);
    
    // Sort the cities by population
    usort($data['geonames'], function ($a, $b) {
        return $b['population'] - $a['population'];
    });

    // Return the top 30 cities
    $output['data']['geonames'] = array_slice($data['geonames'], 0, 70);

    header('Content-Type: application/json; charset=UTF-8');

    echo json_encode($output);

?>