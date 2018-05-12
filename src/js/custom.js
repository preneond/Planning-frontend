mapboxgl.accessToken = 'pk.eyJ1IjoicHJlbmVvbmQiLCJhIjoiY2o1ZGxlbGMxMGxicTJxcnlqMXdoYXZtciJ9.myreL4tEUijFKkauE1ysbA';

var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/streets-v9', // stylesheet location
    center: [14.42076, 50.08804], // starting position [lng, lat]
    zoom: 12 // starting zoom
});

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
var routePlanner = new RoutePlanner(map);


var planRouteBtnElm = document.getElementById("planRouteBtn")
planRouteBtnElm.addEventListener("click", function(){
  routePlanner.planRoute()
}.bind(this));

// routePlanner.addEventListener("onRoutePlanned", description => {
//   showDescription(description);
// });

var modeIcons = document.querySelectorAll('.modeIcon');

modeIcons.forEach(item => {
        item.addEventListener('click', function () {
            console.log(this);
            this.classList.toggle('enabled')
            planRouteBtnElm.disabled = false;
        });
});


function showDescription(description) {
    document.getElementById('search-table').classList.add('hl');

    showDescriptionSummary(description);
    showDescriptionBox(description);
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

// on input it receive duration in seconds and return formatted duration string
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

//fo given mode it return icon src
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
