
var featureList = [];

var originMarkEnabled = false;
var destinationMarkEnabled = false;

var originPicked = false;
var destinationPicked = false;

var originMarkerSrc = {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [0, 0]
            }
        }]
    }
};

var destinationMarkerSrc = {
    "type": "geojson",
    "data": {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [0, 0]
            }
        }]
    }
};

var originMarkerLayerSrc = {
    "id": "originMarkerLayer",
    "type": "circle",
    "source": "originMarkerSource",
    "paint": {
        "circle-radius": 10,
        "circle-color": "#487f1e"
    }
}

var destinationMarkerLayerSrc = {
    "id": "destinationMarkerLayer",
    "type": "circle",
    "source": "destinationMarkerSource",
    "paint": {
        "circle-radius": 10,
        "circle-color": "#d90509"
    }
}


function pickOrigin(coordinates, text = "") {
    originPicked = true
    originMarkerSrc.data.features[0].geometry.coordinates = coordinates;


    if (map.getSource('originMarkerSource') == undefined) {
        map.addSource('originMarkerSource', originMarkerSrc);
        map.addLayer(originMarkerLayerSrc);

    } else {
        map.getSource('originMarkerSource').setData(originMarkerSrc.data)
    }

    // When the cursor enters a feature in the point layer, prepare for dragging.
    map.on('mouseenter', 'originMarkerLayer', function() {
        map.setPaintProperty('originMarkerLayer', 'circle-color', '#3bb2d0');
        map.setPaintProperty('originMarkerLayer', 'circle-radius', 15);
        canvas.style.cursor = 'move';
        isCursorOverPoint = true;
        map.dragPan.disable();
    });

    map.on('mouseleave', 'originMarkerLayer', function() {
        map.setPaintProperty('originMarkerLayer', 'circle-color', '#487f1e');
        map.setPaintProperty('originMarkerLayer', 'circle-radius', 10);
        canvas.style.cursor = '';
        isCursorOverPoint = false;
        map.dragPan.enable();
    });

    map.on('mousedown', 'originMarkerLayer', function() {
        mouseDown("originMarkerLayer")
    });
}

function pickDestination(coordinates, text = "") {
    destinationPicked = true
    destinationMarkerSrc.data.features[0].geometry.coordinates = coordinates;

    if (map.getSource('destinationMarkerSource') == undefined) {
        map.addSource('destinationMarkerSource', destinationMarkerSrc);

        map.addLayer(destinationMarkerLayerSrc);
    } else {
        map.getSource('destinationMarkerSource').setData(destinationMarkerSrc.data)
    }

    // map.panTo(coordinates);

    // When the cursor enters a feature in the point layer, prepare for dragging.
    map.on('mouseenter', 'destinationMarkerLayer', function() {
        map.setPaintProperty('destinationMarkerLayer', 'circle-color', '#3bb2d0');
        map.setPaintProperty('destinationMarkerLayer', 'circle-radius', 15);
        canvas.style.cursor = 'move';
        isCursorOverPoint = true;
        map.dragPan.disable();
    });

    map.on('mouseleave', 'destinationMarkerLayer', function() {
        map.setPaintProperty('destinationMarkerLayer', 'circle-color', '#d90509');
        map.setPaintProperty('destinationMarkerLayer', 'circle-radius', 10);
        canvas.style.cursor = '';
        isCursorOverPoint = false;
        map.dragPan.enable();
    });


}

function unpickOrigin() {
    if (map.getSource('originMarkerSource') != undefined) {
        originPicked = false
        map.removeLayer('originMarkerLayer')
        map.removeSource('originMarkerSource')
    }
}

function unpickDestination() {
    if (map.getSource('destinationMarkerSource') != undefined) {
        destinationPicked = false
        map.removeLayer('destinationMarkerLayer')
        map.removeSource('destinationMarkerSource')
    }
}

var isDragging;

// Is the cursor over a point? if this
// flag is active, we listen for a mousedown event.
var isCursorOverPoint;



var originDown = false
var destinationDown = false

function mouseDown(src) {
    if (!isCursorOverPoint) return;
    isDragging = true;
    // Set a cursor indicator
    canvas.style.cursor = 'grab';

    if (src == "originMarkerLayer") {
        originDown = true;
    } else {
        destinationDown = true
    }
    // Mouse events
    map.on('mousemove', e => onMove(e));
    map.on('mouseup', e => onUp(e));
}

function onMove(e) {
    if (!isDragging) return;
    var coords = e.lngLat;
    canvas.style.cursor = 'grabbing';

    if (originDown) {
        originMarkerSrc.data.features[0].geometry.coordinates = [coords.lng, coords.lat];
        map.getSource('originMarkerSource').setData(originMarkerSrc.data);
    } else if (destinationDown) {
        destinationMarkerSrc.data.features[0].geometry.coordinates = [coords.lng, coords.lat];
        map.getSource('destinationMarkerSource').setData(destinationMarkerSrc.data);
    }
}

function onUp(e) {
    if (!isDragging) return;
    var coords = e.lngLat;

    if (originDown) {
        reverseGeocoding(e, "origin")
        originDown = false;
    } else {
        reverseGeocoding(e, "destination")
        destinationDown = false;
    }

    if (isRoutePlanned) planRoute()
    canvas.style.cursor = '';
    isDragging = false;

    // Unbind mouse events
    map.off('mousemove', e => onMove(e, src));
}


function autoComplete(e) {
  const text = e.target.value
  if (text.length < 2) return;

  const centerCoords = map.getCenter();
  const autoCompleteURL = "https://uc1.umotional.net/geocoding/autocomplete"

  var reqURL = autoCompleteURL + "?text=" + text;

  if (centerCoords != null) {
      reqURL += "&focus.point.lat=" + centerCoords.lat;
      reqURL += "&focus.point.lon=" + centerCoords.lng;
  }

  var ajax = new XMLHttpRequest();

  ajax.open("GET", reqURL, true);

  ajax.onload = function() {
	   const responseJSON = JSON.parse(ajax.responseText);
     autocompleteListDidChange(e,responseJSON)
  };

  ajax.send();
}

function autocompleteListDidChange(e, response) {
    featureList = response.features;
    if (e.target.id == "originInput") {
        originComplete.list = featureList.map(feature => feature.properties.uc_label);
        originComplete.evaluate()
    } else {
        destinationComplete.list = featureList.map(feature => feature.properties.uc_label);
        destinationComplete.evaluate()
    }
}


class InputDelegate {
  constructor(elm) {
    this._elm = elm;
    manageOrigin()
    document.getElementById("originId").addEventListener('input', this._autoComplete.bind(this));
  }

  _manageOrigin() {

  }

  _autoComplete(e) {
    const text = e.target.value
    if (text.length < 2) return;

    const centerCoords = map.getCenter();
    const autoCompleteURL = "https://uc1.umotional.net/geocoding/autocomplete"

    var reqURL = autoCompleteURL + "?text=" + text;

    if (centerCoords != null) {
        reqURL += "&focus.point.lat=" + centerCoords.lat;
        reqURL += "&focus.point.lon=" + centerCoords.lng;
    }

    var ajax = new XMLHttpRequest();

    ajax.open("GET", reqURL, true);

    ajax.onload = function() {
       const responseJSON = JSON.parse(ajax.responseText);
       this._autocompleteListDidChange(e,responseJSON)
    };

    ajax.send();
  }

  _autocompleteListDidChange(e, response) {
      featureList = response.features;
      if (e.target.id == "originInput") {
          originComplete.list = featureList.map(feature => feature.properties.uc_label);
          originComplete.evaluate()
      } else {
          destinationComplete.list = featureList.map(feature => feature.properties.uc_label);
          destinationComplete.evaluate()
      }
  }
}
