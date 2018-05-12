mapboxgl.accessToken = 'pk.eyJ1IjoicHJlbmVvbmQiLCJhIjoiY2o1ZGxlbGMxMGxicTJxcnlqMXdoYXZtciJ9.myreL4tEUijFKkauE1ysbA';

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/streets-v9', // stylesheet location
    center: [14.42076, 50.08804], // starting position [lng, lat]
    zoom: 12 // starting zoom
});

var isRoutePlanned = false;

var featureList = [];

var originIconElm = document.getElementById("originMarker");
originIconElm.addEventListener("animationend", e => {
    e.target.classList.remove("apply-shake");
});

var destinationIconElm = document.getElementById("destinationMarker");
destinationIconElm.addEventListener("animationend", e => {
    e.target.classList.remove("apply-shake");
});

var originInput = document.getElementById("originInput");
originInput.addEventListener('input', autoComplete);
originInput.addEventListener('keyup', function(e) {
    if (e.keyCode === 13) inputDidConfirmed(e)
})

var destinationInput = document.getElementById("destinationInput");
destinationInput.addEventListener('input', autoComplete);
destinationInput.addEventListener('keyup', function(e) {
    if (e.keyCode === 13) inputDidConfirmed(e)
})


var planRouteBtnElm = document.getElementById("planRouteBtn")
planRouteBtnElm.addEventListener("click", planRoute);

var modeIcons = document.querySelectorAll('.modeIcon');

modeIcons.forEach(item => {
        item.addEventListener('click', function () {
            this.classList.toggle('enabled')
            planRouteBtnElm.disabled = false;
        });
});

var originComplete = new Awesomplete(originInput, {});
var destinationComplete = new Awesomplete(destinationInput, {});


Awesomplete.$.bind(originInput, {
    "awesomplete-select": e => inputDidConfirmed(e)
})

Awesomplete.$.bind(destinationInput, {
    "awesomplete-select": e => inputDidConfirmed(e)
})


function mapDidClicked(e) {
    if (!originPicked) {
        pickOrigin([e.lngLat.lng, e.lngLat.lat])
        reverseGeocoding(e, "origin")
    } else if (!destinationPicked) {
        pickDestination([e.lngLat.lng, e.lngLat.lat])
        reverseGeocoding(e, "destination")
    }
}

function reverseGeocoding(e, target) {
    const reverseGeocodingURL = "https://uc1.umotional.net/geocoding/reverse"

    var reqURL = reverseGeocodingURL
    reqURL += "?point.lat=" + e.lngLat.lat
    reqURL += "&point.lon=" + e.lngLat.lng;

    fetch(reqURL)
        .then(response => response.json())
        .then(json => reverseGeocodingDidCalled(json, target));
}



map.on('mousedown', 'destinationMarkerLayer', function() {
    mouseDown("destinationMarkerLayer");
});


function inputDidConfirmed(e) {
    const inputText = e.type == "awesomplete-select" ? e.text : e.target.value;


    const feature = featureList.filter(feature => feature.properties.uc_label == inputText)[0];

    if (feature == undefined) {
        if (e.target.id == "originInput") {
            unpickOrigin(e)
        } else {
            unpickDestination(e)
        }
    } else {
        const coords = feature.geometry.coordinates;
        if (e.target.id == "originInput") {
            pickOrigin(coords, inputText)
        } else {
            pickDestination(coords, inputText)
        }
        map.panTo(coords)
    }
    if (isRoutePlanned) removeRoute()
}

function removeRoute() {
  map.removeLayer('routeLayer');
  map.removeSource('routeSource');
  document.getElementById('description-box').innerHTML = '';
  planRouteBtnElm.disabled = false;
}

function planRoute(e) {
    if (!originPicked || !destinationPicked) {
        if (!originPicked) originIconElm.classList.add("apply-shake");
        if (!destinationPicked) destinationIconElm.classList.add("apply-shake");
        return
    }
    const originCoords = map.getSource('originMarkerSource')._data.features[0].geometry.coordinates
    const destinationCoords = map.getSource('destinationMarkerSource')._data.features[0].geometry.coordinates

    var planURL = ""
    var interRouteWithModeURL = "http://127.0.0.1:8888/api/getIntermodalRouteWithMode"
    var parameters = ""
    parameters += "?origin=" + originCoords[1] + "," + originCoords[0]
    parameters += "&destination=" + destinationCoords[1] + "," + destinationCoords[0]


    var availableModes = []

    avModeList = document.querySelectorAll('.modeIcon.enabled');

    var availableModes = Array.from(avModeList).map(img => {
      switch (img.id) {
        case "carIcon":
          return "CAR"
        case "transitIcon":
          return "TRANSIT"
        case "bikeIcon":
          return "BICYCLE"
        default:
          return "WALK"
      }
    })

    parameters += "&availableModes=" + availableModes.join(",");
    planURL = interRouteWithModeURL + parameters

    fetch(planURL)
        .then(response => response.json())
        .then(json => routeDidPlanned(json))
        .catch(err => console.log(err));

}

function routeDidPlanned(json) {
    if (map.getSource('routeSource') == undefined) {
        map.addSource('routeSource', {
            "type": "geojson",
            "data": json.route
        });
        map.addLayer({
            "id": "routeLayer",
            "type": "line",
            "source": 'routeSource',
            "layout": {
                "line-join": "round",
                "line-cap": "round"
            },
            "paint": {
                // Use a get expression (https://www.mapbox.com/mapbox-gl-js/style-spec/#expressions-get)
                // to set the line-color to a feature property value.
                'line-color': ['get', 'color'],
                "line-width": 6
            }
        });
        isRoutePlanned = true;
    } else {
        map.getSource('routeSource').setData(json.route);
    }
    showDescription(json.description);
    planRouteBtnElm.disabled = true;
}


function transformDurationToString(duration) {
  var hours = Math.floor(duration / 3600)
  var minutes = Math.floor((duration - hours * 3600) / 60);
  var secs = Math.floor(duration - hours * 3600 - minutes * 60);

  var durationStr = "";
  durationStr += hours == 0 ? "" : (hours + " h ");
  durationStr += minutes == 0 ? "" : (minutes + " min ");
  durationStr += secs + "s";

  return durationStr;
}

function showDescriptionSummary(description) {
  var descriptionSummaryElm = document.getElementById('description-summary');
  var totalDuration = description.legs.map(leg => leg.duration).reduce((a, b) => a + b, 0);

  descriptionSummaryElm.innerHTML = "";
  descriptionSummaryElm.innerHTML += "<p>Route duration: </p>";
  descriptionSummaryElm.innerHTML += "<p>" + transformDurationToString(totalDuration) + "</p>"
}


function showDescriptionBox(description) {
  var descriptionBoxElm = document.getElementById('description-box');
  descriptionBoxElm.innerHTML = '';
  descriptionBoxElm.classList.add('description')

  var descriptionPanelElm = document.createElement('div')
  descriptionPanelElm.classList.add('descriptionSidebarPanel')

  var descriptionImgElm = document.createElement('div');
  descriptionImgElm.classList.add('descriptionContent')

  var descriptionInfoElm = document.createElement('div');
  descriptionInfoElm.classList.add('descriptionContent')

  var verticalLineElm = document.createElement('div');
  verticalLineElm.classList.add('vl');

  var originElm = document.createElement('div');
  originElm.classList.add('box');
  descriptionPanelElm.appendChild(originElm)

  description.legs.forEach(leg => {
      var lineElm = document.createElement('div');
      lineElm.classList.add('vl');
      lineElm.style.background = leg.color;
      descriptionPanelElm.appendChild(lineElm);

      var contentLineElm = document.createElement('div');
      contentLineElm.classList.add('descriptionLine');

      var durationElm = document.createElement('p');

      var duration = transformDurationToString(leg.duration);

      var node = document.createTextNode(duration);
      durationElm.appendChild(node);
      descriptionInfoElm.appendChild(durationElm);

      var modeIconElm = document.createElement('img');
      modeIconElm.src = getSrcForMode(leg.transportMode);
      contentLineElm.appendChild(modeIconElm);

      descriptionImgElm.appendChild(contentLineElm);

      var boxElm = document.createElement('div');
      boxElm.classList.add('box')
      descriptionPanelElm.appendChild(boxElm);
  });

  descriptionBoxElm.appendChild(descriptionPanelElm);
  descriptionBoxElm.appendChild(descriptionImgElm);
  descriptionBoxElm.appendChild(descriptionInfoElm);
}

function showDescription(description) {
    document.getElementById('search-table').classList.add('hl');

    showDescriptionSummary(description);
    showDescriptionBox(description);
}

function getSrcForMode(mode) {
    switch (mode) {
        case "WALK":
            return "img/transport_modes/walk.svg"
        case "CAR":
            return "img/transport_modes/car.svg"
        case "BICYCLE":
            return "img/transport_modes/bike.svg"
        default:
            return "img/transport_modes/transit.svg"
    }
}

function reverseGeocodingDidCalled(json, target) {
    let feature = json.features[0]

    let coords = feature.geometry.coordinates;
    let label = feature.properties.uc_label

    if (target == "origin") {
        originInput.value = label
    } else if (target == "destination") {
        destinationInput.value = label;
    }
}


map.on('click', mapDidClicked);

var canvas = map.getCanvasContainer();

if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
        map.panTo([position.coords.longitude, position.coords.latitude]);
    });

    // Add geolocate control to the map.
    map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));

}
