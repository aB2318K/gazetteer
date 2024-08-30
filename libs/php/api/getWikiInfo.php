<?php

    ini_set('display_errors', 'On');
    error_reporting(E_ALL);

    $executionStartTime = microtime(true);

    $country = $_REQUEST['country'];
    $encodedCountry = str_replace(' ', '_', $country);
    $url = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|info|images&exintro&explaintext&inprop=url&titles=" . $encodedCountry;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $result = curl_exec($ch);

    curl_close($ch);

    $output['status']['code'] = "200";
    $output['status']['name'] = "ok";
    $output['status']['description'] = "success";
    $output['status']['returnedIn'] = intval((microtime(true) - $executionStartTime) * 1000) . " ms";

    $pagesData = json_decode($result, true)['query']['pages'] ?? [];

    $pageKeys = array_keys($pagesData);

    $firstKey = reset($pageKeys);
    $data = $pagesData[$firstKey] ?? [];

    $imageTitles = array_column($data['images'] ?? [], 'title');

    $imageUrls = array(); // Initialize $imageUrls outside the loop

    foreach ($imageTitles as $title) {
        $encodedTitle = str_replace(' ', '_', $title);
        $imageUrlApiUrl = "https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=" . $encodedTitle;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $imageUrlApiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $imageResult = curl_exec($ch);

        if ($imageResult === false) {
            $error = curl_error($ch);
        } else {
            // Check if the response contains a 400 error
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($httpCode === 400) {
                // Skip this image and move on to the next title
                continue;
            } else {
                // Proceed with further processing
                $imageData = json_decode($imageResult, true)['query']['pages'] ?? [];

                foreach ($imageData as $page) {
                    if (isset($page['imageinfo'][0]['url'])) {
                        $imageUrls[] = $page['imageinfo'][0]['url'];
                    }
                }
            }
        }

        curl_close($ch);
    }

    // Set $imageUrls to an empty array if there are no images
    $data['image_urls'] = $imageUrls;
    $output['data'] = $data;

    header('Content-Type: application/json; charset=UTF-8');

    // Check for JSON encoding errors
    if (json_last_error() !== JSON_ERROR_NONE) {
        $output['status']['code'] = "500";
        $output['status']['name'] = "Internal Server Error";
        $output['status']['description'] = "JSON encoding error";
        $output['data'] = null;
    }

    echo json_encode($output);

?>
