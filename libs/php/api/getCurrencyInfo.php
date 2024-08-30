<?php

    // Remove for production
    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    $apiKey = '67069b4a790b4aad9978b5dba02c1eb3';

    $base = $_REQUEST['currencyCode'];

    $majorCurrencies = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'CNY', 'NZD'];

    $url = "https://open.er-api.com/v6/latest/{$base}?apikey={$apiKey}";

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);

    $response = curl_exec($ch);

    curl_close($ch);

    $data = json_decode($response, true);

    $majorCurrencyRates = array_intersect_key($data['rates'], array_flip($majorCurrencies));

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";
    $output['data'] = $majorCurrencyRates;

    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($output, JSON_PRETTY_PRINT);
    
?>
