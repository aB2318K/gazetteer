<?php

    // Remove for production
    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $isoCode = $_REQUEST['isoCode'];

    $geoJsonContent = file_get_contents('countryBorders.geo.json');

    $geoJsonData = json_decode($geoJsonContent, true);

    function getBorder($isoCode) {
        global $geoJsonData; 
        foreach ($geoJsonData['features'] as $feature) {
            if ($isoCode === $feature['properties']['iso_a2']) {
                return $feature;
            }
        }
    }

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['data'] = getBorder($isoCode); 

    echo json_encode($output); 
    
?>