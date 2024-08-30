import { getLocation } from "./getCurrentLocation.js";

$('#loader-wrapper').fadeIn();

var streets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012"
});

var satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
});

var basemaps = {
  "Streets": streets,
  "Satellite": satellite
};

var map = L.map("map", {
  layers: [streets]
});

var airportMarkers = L.markerClusterGroup({
  disableClusteringAtZoom: 12,
  polygonOptions: {
    fillColor: '#fff',
    color: '#000',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5
  }
});

var populatedPlacesMarkers = L.markerClusterGroup({
  disableClusteringAtZoom: 12,
  polygonOptions: {
    fillColor: '#fff',
    color: '#000',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5
  }
});



(async function () {
  
  try {

    const userCoordinates = await getLocation();
    const userLat = userCoordinates.latitude;
    const userLng = userCoordinates.longitude;

    map.setView([userLat, userLng], 6);

    var layerControl = L.control.layers(basemaps, null, null, {
      collapsed: false 
    }).addTo(map);

    // Add marker cluster layers to the layer control with custom names
    layerControl.addOverlay(airportMarkers, "Airports");
    layerControl.addOverlay(populatedPlacesMarkers, "Cities");

    $.ajax({
      url: './libs/php/getCountryDropdown.php',
      method: 'GET',
      dataType: 'json',

      success: async function (data) {

        const defaultIsoCode = await setDefaultCountry();        
        const dropdown = $('#countrySelect');

        $.each(data.data, function (index, country) {
          const option = $('<option>', {
            value: country.iso_a2,
            text: country.name
          });
    
          dropdown.append(option);
    
          if (defaultIsoCode === country.iso_a2) {
            option.prop('selected', true);
          }
        });
    
        dropdown.on('change', function () {

          var selectedIsoCode = $(this).val();

          updateCountryBorders(selectedIsoCode, map);

        });

      },

      error: function (error) {
        //console.error('Error fetching country data:', error);
      }

    });
    
  } catch (error) {
    //console.error('Error getting user location:', error);
  }

})();

function updateCountryBorders(isoCode, map) {
  getRestCountryInfo(isoCode);
  getNews(isoCode);

  airportMarkers.clearLayers();
  
  populatedPlacesMarkers.clearLayers();

  map.eachLayer(function (layer) {
    if (layer instanceof L.Marker && layer.getPopup() && layer.getPopup().getContent() !== 'Your location') {
      map.removeLayer(layer);
    }
  });
  
  showAirportMarkers(isoCode);
  showPopulatedPlaces(isoCode);

  $.ajax({
    url: './libs/php/getCountryBorders.php',
    method: 'GET',
    dataType: 'json',
    data: {
      isoCode: isoCode
    },

    success: function (result) {

      if (result.data) {
        let geojsonFeature = result.data.geometry;
        let featureStyle = {
          color: 'brown',
          weight: 2,
          opacity: 1,
          fillColor: 'grey',
          fillOpacity: 0.2
        };

        if (map.countryLayer) {
          map.removeLayer(map.countryLayer);
        }

        let border = L.geoJSON(geojsonFeature, {
          style: featureStyle
        }).addTo(map);

        // Update the countryLayer variable
        map.countryLayer = border;

        map.fitBounds(border.getBounds());

        // Check if loader is visible and content is not displayed before fading out loader and showing content
        if ($('#loader-wrapper').is(':visible') && !$('#content').hasClass('show')) {
          $('#loader-wrapper').fadeOut();
          $('#content').addClass('show');
        }
      } else {
        //console.error('No country data found for the provided ISO code.');
      }
    },
    error: function (status, error) {
      //console.error('Error fetching country borders:', error);
    }
  });
}


async function setDefaultCountry() {
  const userCoordinates = await getLocation();
  try {
    const result = await $.ajax({
      url: './libs/php/api/getCountryByCoordinates.php',
      method: 'GET',
      dataType: 'json',
      data: {
        lat: userCoordinates.latitude,
        lng: userCoordinates.longitude,
      }
    });

    if (result.data) {
      const defaultIsoCode = result.data.results[0].components['ISO_3166-1_alpha-2'];
      updateCountryBorders(defaultIsoCode, map);
      return defaultIsoCode;
    } else {
      //throw new Error('Failed to get user country');
    }
  } catch (error) {
    //throw new Error('AJAX request failed');
  }
}

function getRestCountryInfo(isoCode) {
  $.ajax({
    url: './libs/php/api/getRestCountries.php',
    method: 'GET',
    dataType: 'json',
    data: {
      isoCode: isoCode
    },
    success: function (result) {
      if (result.data) {
        const countryData = result.data[0];

        $('#countryName').text(countryData.name.common);
        $('#capital').text(countryData.capital[0]);

        for (const currencyCode in countryData.currencies) {
          const currency = countryData.currencies[currencyCode];
          $('#currency').text(`${currency.name} (${currency.symbol})`);
          break;
        };

        $('#region').text(countryData.region);
        $('#population').text(countryData.population.toLocaleString());

        let timezoneText = "";

        if (isoCode === "GB") {
          timezoneText = "UTC+00:00";
        } else if (isoCode === "US") {
          const validTimezones = [
            "UTC-10:00",
            "UTC-09:00",
            "UTC-08:00",
            "UTC-07:00",
            "UTC-06:00",
            "UTC-05:00",
            "UTC-04:00",
          ];
          const filteredTimezones = countryData.timezones.filter((tz) =>
            validTimezones.includes(tz)
          );
          timezoneText = filteredTimezones.join(', ');
        } else if (isoCode === "FR") {
          timezoneText = "UTC+01:00, UTC+02:00"; // France observes CET and CEST
        } else if (isoCode === "DK") {
          timezoneText = "UTC+01:00, UTC+00:00"; // Denmark observes CET and WET
        } else if (isoCode === "NZ") {
          timezoneText = "UTC+12:00, UTC+12:45, UTC+13:00"; // New Zealand time zones
        } else {
          timezoneText = countryData.timezones.join(', ');
        }   
        
        $('#timezones').text(timezoneText);        
        $('#languages').text(Object.values(countryData.languages).join(', '));
        $('#area').text(countryData.area.toLocaleString() + ' km²');

        const borders = countryData.borders;

        if (borders && borders.length > 0) {
            $('#borders').text(borders.join(', '));
        } else {
            $('#borders').text('No borders');
        }

        $('#flag').html(`<img src="${countryData.flags.png}" alt="Flag">`);

        getWeatherInfo(countryData.capital[0], isoCode);
        getCurrencyRates(Object.keys(countryData.currencies)[0]);
        getImages(countryData.name.common);
        getWiki(countryData.name.common);
      }
    },
    error: function (status, error) {
      //console.error('Error fetching rest country info:', error);
    }
  });
}

function getWeatherInfo(cityName, isoCode) {
  $.ajax({
      url: './libs/php/api/getWeatherInfo.php',
      method: 'GET',
      dataType: 'json',
      data: {
          cityName: cityName,
          isoCode: isoCode
      },
      success: function(result) {
          if (result.status.code === "200" && result.data) {
              const weatherData = result.data;
              $('#cityName').text(weatherData.location.name);
              
              // Today
              $('#todayIcon').attr('src', weatherData.current.condition.icon);
              $('#todayConditions').text(weatherData.current.condition.text);
              $('#todayMaxTemp').text(numeral(weatherData.forecast.forecastday[0].day.maxtemp_c).format('0'));
              $('#todayMinTemp').text(numeral(weatherData.forecast.forecastday[0].day.mintemp_c).format('0'));

              const day1 = weatherData.forecast.forecastday[1];
              const day2 = weatherData.forecast.forecastday[2];

              // Format the dates using Date.js
              const tomorrowDate = Date.parse(day1.date).toString('ddd dS');
              const dayAfterTomorrowDate = Date.parse(day2.date).toString('ddd dS');

              // Day 1 (Tomorrow)
              $('#day1Date').text(tomorrowDate);
              $('#day1Icon').attr('src', day1.day.condition.icon);
              $('#day1MaxTemp').text(numeral(day1.day.maxtemp_c).format('0'));
              $('#day1MinTemp').text(numeral(day1.day.mintemp_c).format('0'));

              // Day 2 (Day after tomorrow)
              $('#day2Date').text(dayAfterTomorrowDate);
              $('#day2Icon').attr('src', day2.day.condition.icon);
              $('#day2MaxTemp').text(numeral(day2.day.maxtemp_c).format('0'));
              $('#day2MinTemp').text(numeral(day2.day.mintemp_c).format('0'));

          } else {
              //console.error('Error fetching weather info:', result.status.description);
          }
      },
      error: function(status, error) {
          //console.error('AJAX request failed:', error);
      }
  });
}


function getCurrencyRates(currencyCode) {
  $.ajax({
      url: './libs/php/api/getCurrencyInfo.php',
      method: 'GET',
      data: {
          currencyCode: currencyCode
      },
      dataType: 'json',
      success: function (data) {
          if (data.status.code === '200') {
              $('#currencyCode').text(currencyCode);

              $('#currencySelect').empty();

              // Add new options dynamically
              $('#currencySelect').append($('<option>', {
                  value: data.data['USD'],
                  text: 'USD - United States Dollar'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['EUR'],
                  text: 'EUR - Euro'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['JPY'],
                  text: 'JPY - Japanese Yen'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['GBP'],
                  text: 'GBP - British Pound'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['CHF'],
                  text: 'CHF - Swiss Franc'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['CAD'],
                  text: 'CAD - Canadian Dollar'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['AUD'],
                  text: 'AUD - Australian Dollar'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['CNY'],
                  text: 'CNY - Chinese Yuan'
              }));

              $('#currencySelect').append($('<option>', {
                  value: data.data['NZD'],
                  text: 'NZD - New Zealand Dollar'
              }));

          } else {
              //console.error('Error fetching currency rates:', data.status.description);
          }
      },
      error: function (error) {
          //console.error('AJAX request failed:', error);
      }
  });
}

function getNews(isoCode) {
  $.ajax({
      url: './libs/php/api/getNews.php',
      method: 'GET',
      dataType: 'json',
      data: {
          countryCode: isoCode
      },
      success: function (result) {
          const modalBody = $('#newsModal').find('.modal-body');
          modalBody.empty();

          if (result.status.code === '200' && result.data.totalResults > 0) {
              const newsResults = result.data.results.slice(0, 4);
              const newsCount = newsResults.length;

              const renderedTitles = new Set(); // Set to store rendered article titles

              $.each(newsResults, function (i, news) {
                  // Check if the title is already rendered
                  if (!renderedTitles.has(news.title)) {
                      // Remove 'http://' or 'https://' from the beginning of the source_url
                      const cleanSourceUrl = news.source_url.replace(/^(?:https?:\/\/)?/i, '');

                      const newsItem = `
                          <table class="table table-borderless ${i === newsCount - 1 ? 'mb-0' : 'mb-4'}">
                              <tr>
                                  <td rowspan="2" width="50%">
                                      <img class="img-fluid rounded" src="${news.image_url}" alt="News Image">
                                  </td>
                                  <td>
                                      <a href="${news.link}" class="fw-bold fs-6 text-black" target="_blank">${news.title}</a>
                                  </td>
                              </tr>
                              <tr>
                                  <td class="align-bottom pb-0">
                                      <p class="fw-light fs-6 mb-1">${cleanSourceUrl}</p>
                                  </td>
                              </tr>
                          </table>
                          ${i !== newsCount - 1 ? '<hr>' : ''}
                      `;
                      modalBody.append(newsItem);
                      renderedTitles.add(news.title); // Add title to rendered titles set
                  }
              });
          } else {
              //console.error('No news data found for the provided ISO code.');
              modalBody.html('<p>No news available.</p>');
          }
      },
      error: function (status, error) {
          //console.error('Error fetching news:', error);
      }
  });
}


function getImages(countryName) {
  $.ajax({
    url: './libs/php/api/getWikiInfo.php',
    type: 'GET',
    data: { country: countryName },
    dataType: 'json',

    success: function (response) {

      if (response.status.code === '200') {
        var imageUrls = response.data.image_urls;
              // Clear existing content
              $('#imageTableBody').empty();

              imageUrls.forEach(function (imageUrl, index) {

                var imageRow = `
                <tr>
                <td><img src="${imageUrl}" class="img-fluid" id="wikiImage" alt="Image ${index + 1}"></td>
                </tr>
                `;
                  $('#imageTableBody').append(imageRow);
              });
        } else {
          //console.error('Error fetching images:', response.status.description);
        }
    },
    error: function (error) {
      //console.error('Error:', error);
    }
  });
}

function getWiki(countryName) {
  $.ajax({
    url: './libs/php/api/getWikiInfo.php',
    type: 'GET',
    data: { country: countryName },
    dataType: 'json',

    success: function (response) {

      if (response.status.code === '200') {
        const info = response.data.extract;
        const link = response.data.fullurl;
              $('#wikiInfoContent').empty();
              $('#wikiLink').empty();
              $('#wikiInfoContent').text(info);
              $('#wikiLink').html(`<a href="${link}" target="_blank">Click here to visit the wikipedia page</a>`);
            } else {
              //console.error('Error fetching Wikipedia information:', response.status.description);
            }
      },
        error: function (error) {
            //console.error('Error:', error);
        }
  });
}

function showAirportMarkers(isoCode) {
  $.ajax({
    url: './libs/php/api/getAirportCoordinates.php',
    method: 'GET',
    dataType: 'json',
    data: {
      isoCode: isoCode
    },

    success: function (result) {

      if (result.status.code === '200' && result.data.geonames.length > 0) {
        result.data.geonames.forEach(function (airport) {

          var airportIcon = L.ExtraMarkers.icon({
            prefix: 'fa',
            icon: 'fa-plane',
            iconColor: 'white',
            markerColor: 'blue-dark',
            shape: 'penta'
          });
        

          var marker = L.marker([airport.lat, airport.lng], { icon: airportIcon })
            .bindTooltip(airport.name, { direction: 'top', sticky: true })
            .addTo(airportMarkers);

          airportMarkers.addLayer(marker);

        });

        map.addLayer(airportMarkers);

      } else {
        //console.error('No airport data found for the provided ISO code.');
      }

    },

    error: function (status, error) {
      //console.error('Error fetching airport coordinates:', error);
    }
  });

}

function showPopulatedPlaces(isoCode) {
  $.ajax({
    url: './libs/php/api/getPopulatedPlaces.php',
    method: 'GET',
    dataType: 'json',
    data: {
      isoCode: isoCode
    },

    success: function(result) {

      if (result.status.code === '200' && result.data.geonames.length > 0) {
        result.data.geonames.forEach(function(place) {

          var cityIcon = L.ExtraMarkers.icon({
            prefix: 'fa',
            icon: 'fa-city',
            markerColor: 'red',
            shape: 'square'
          });
          
          var popupContent = "<div class='col text-center'><strong>" + place.toponymName + "</strong>";

          if (place.population > 0) {
            popupContent += "<br><i>(" + place.population.toLocaleString() + ")</i>";
          }

          popupContent += "</div>";

          var marker = L.marker([place.lat, place.lng], { icon: cityIcon })
            .bindTooltip(popupContent, { direction: 'top', sticky: true })
            .addTo(populatedPlacesMarkers);

          populatedPlacesMarkers.addLayer(marker);
        
        });

       map.addLayer(populatedPlacesMarkers);

      } else {
        //console.error('No place data found for the provided ISO code.');
      }

    },
    error: function(xhr, status, error) {
      //console.error('Error fetching place coordinates:', error);
    }

  });

}

//currency converter
$(document).ready(function() {
  $('#fromAmount').on('input', function() {
      var inputValue = parseFloat($(this).val());
      var currencyRate = parseFloat($('#currencySelect').val());
      var convertedAmount = isNaN(inputValue) || isNaN(currencyRate) ? 0 : inputValue * currencyRate;
      $('#toAmount').val(convertedAmount.toFixed(2)); 
  });

  $('#currencySelect').on('change', function() {
      $('#fromAmount').trigger('input');
  });

  $('#currencyModal').on('show.bs.modal', function () {
      // Reset the input value to 1
      $('#fromAmount').val(1);

      // Trigger the input event to recalculate the result
      $('#fromAmount').trigger('input');
  });

  // Reset result when the currency modal is closed
  $('#currencyModal').on('hide.bs.modal', function () {
      // Reset the result
      $('#toAmount').val("");

      // Reset the currency select option to default
      $('#currencySelect').val($('#currencySelect option:first').val());
  });
});


L.easyButton("fa-info", function (btn, map) {
  $("#countryInfoModal").modal("show");
}).addTo(map);


L.easyButton("fa-cloud", function (btn, map) {
  $('#weatherModal').modal('show');
}).addTo(map);

L.easyButton("fa-coins", function (btn, map) {
  $('#currencyModal').modal('show');
}).addTo(map);

L.easyButton("fa-newspaper", function (btn, map) {
  $('#newsModal').modal('show');
}).addTo(map);

L.easyButton("fa-images", function (btn, map) {
  $('#imagesModal').modal('show');
}).addTo(map);

L.easyButton("fa-info-circle", function (btn, map) {
  $('#wikiInfoModal').modal('show');
}).addTo(map);


