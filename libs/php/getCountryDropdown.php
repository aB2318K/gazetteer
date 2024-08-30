<?php

    // Remove for production
    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $geoJsonContent = file_get_contents('countryBorders.geo.json');

    $geoJsonData = json_decode($geoJsonContent, true);

    $isoCodeAndName = array();
    foreach ($geoJsonData['features'] as $feature) {
        $isoCodeAndName[] = array(
            'iso_a2' => $feature['properties']['iso_a2'],
            'name' => $feature['properties']['name']
        );
    }

    // Sort the country data alphabetically by country name
    usort($isoCodeAndName, function($a, $b) {
        return strcmp($a['name'], $b['name']);
    });

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['data'] = $isoCodeAndName;

    header('Content-Type: application/json; charset=UTF-8');

    echo json_encode($output);

?>
