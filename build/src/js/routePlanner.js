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

var destinationMarkerLayerSrc = {
    "id": "destinationMarkerLayer",
    "type": "circle",
    "source": "destinationMarkerSource",
    "paint": {
        "circle-radius": 10,
        "circle-color": "#d90509"
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
};
var isRoutePlanned = false;

class RoutePlanner {
    constructor(map) {
        this.map = map;
        this.initOD();
        map.on('click', this.mapDidClicked);

    }

    // init origin and destination point
    initOD() {
        self.origin = new RoutePoint(document.getElementById('originInput'), 'originMarkerSource', originMarkerSrc, 'originMarkerLayer', originMarkerLayerSrc);
        self.destination = new RoutePoint(document.getElementById('destinationInput'), 'destinationMarkerSource', destinationMarkerSrc, 'destinationMarkerLayer', destinationMarkerLayerSrc);
    }

    // Plan route when origin and destination is picked
    planRoute() {
        if (!origin.isPicked || !destination.isPicked) {
            if (!origin.isPicked) originIconElm.classList.add("apply-shake");
            if (!destination.isPicked) destinationIconElm.classList.add("apply-shake");
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

        var avModeList = document.querySelectorAll('.modeIcon.enabled');

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
            .then(json => this.routeDidPlanned(json))
            .catch(err => console.log(err));

    }


    // hide route from map
    removeRoute() {
        map.removeLayer('routeLayer');
        map.removeSource('routeSource');
        document.getElementById('description-box').innerHTML = '';
        document.getElementById('planRouteBtn').disabled = false;
    }

    // user interaction on map
    mapDidClicked(e) {
        if (!origin.isPicked) {
            origin.pickRoutePoint([e.lngLat.lng, e.lngLat.lat])
            origin.reverseGeocoding(e)
        } else if (!destination.isPicked) {
            destination.pickRoutePoint([e.lngLat.lng, e.lngLat.lat])
            destination.reverseGeocoding(e)
        }
    }


    // on received JSON response from Backend
    routeDidPlanned(json) {
        if (this.map.getSource('routeSource') == undefined) {
            this.map.addSource('routeSource', {
                "type": "geojson",
                "data": json.route
            });
            this.map.addLayer({
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
        } else {
            map.getSource('routeSource').setData(json.route);
        }

        isRoutePlanned = true;
        showDescription(json.description);
        document.getElementById('planRouteBtn').disabled = true;
    }

}

class RoutePoint {
    constructor(elm, pointMarkerSrcId, pointMarkerSrc, pointLayerSrcId, pointLayerSrc) {
        this.elm = elm;
        this.pointMarkerSrcId = pointMarkerSrcId;
        this.pointMarkerSrc = pointMarkerSrc;
        this.pointLayerSrcId = pointLayerSrcId;
        this.pointLayerSrc = pointLayerSrc;

        this.isPicked = false;
        this.pointDown = false;
        this.isDragging = false;
        this.isCursorOverPoint = false;
        this.featureList = [];
        this.routePointComplete = new Awesomplete(elm, {})

        Awesomplete.$.bind(elm, {
            "awesomplete-select": e => this.inputDidConfirmed(e)
        })

        this.elm.addEventListener('input',this.autoComplete.bind(this));
        this.elm.addEventListener('keyup', function(e) {
            if (e.keyCode === 13) this.inputDidConfirmed(e)
        }.bind(this))
    }


    // on inputBox confirm method
    inputDidConfirmed(e) {
        const inputText = e.type == "awesomplete-select" ? e.text : e.target.value;
        const feature = this.featureList.filter(feature => feature.properties.uc_label == inputText)[0];

        if (feature == undefined) {
            this.unpickRoutePoint()
        } else {
            const coords = feature.geometry.coordinates;
            this.pickRoutePoint(coords)
            map.panTo(coords)
        }
        if (isRoutePlanned) this.removeRoute()
    }

    pickRoutePoint(coordinates) {
        this.isPicked = true
        this.pointMarkerSrc.data.features[0].geometry.coordinates = coordinates;

        if (map.getSource(this.pointMarkerSrcId) == undefined) {
            map.addSource(this.pointMarkerSrcId, this.pointMarkerSrc);

            map.addLayer(this.pointLayerSrc);
        } else {
            map.getSource(this.pointMarkerSrcId).setData(this.pointMarkerSrc.data)
        }


        // When the cursor enters a feature in the point layer, prepare for dragging.
        map.on('mouseenter', this.pointLayerSrcId, function() {
            // map.setPaintProperty(this.pointLayerSrcId, 'circle-color', '#3bb2d0');
            map.setPaintProperty(this.pointLayerSrcId, 'circle-radius', 15);
            map.getCanvasContainer().style.cursor = 'move';
            map.dragPan.disable();
            this.isCursorOverPoint = true;
        }.bind(this));

        map.on('mouseleave', this.pointLayerSrcId, function() {
            // map.setPaintProperty(this.pointLayerSrcId, 'circle-color', '#487f1e');
            map.setPaintProperty(this.pointLayerSrcId, 'circle-radius', 10);
            map.getCanvasContainer().style.cursor = '';
            this.isCursorOverPoint = false;
            map.dragPan.enable();
        }.bind(this));

        map.on('mousedown', this.pointLayerSrcId, function(){
            this.mouseDown(this.pointLayerSrcId)
        }.bind(this));

    }

    unpickRoutePoint() {
        if (map.getSource(pointMarkerSrcId) != undefined) {
            isPicked = false
            map.removeLayer(pointLayerSrcId)
            map.removeSource(pointMarkerSrcId)
        }
    }

    // autoComplete function on Input Box
    autoComplete(e) {
        const text = e.target.value
        // if (text.length < 2) return;

        const centerCoords = map.getCenter();
        const autoCompleteURL = "https://uc1.umotional.net/geocoding/autocomplete"

        var reqURL = autoCompleteURL + "?text=" + text;
        if (centerCoords != null) {
            reqURL += "&focus.point.lat=" + centerCoords.lat;
            reqURL += "&focus.point.lon=" + centerCoords.lng;
        }

        fetch(reqURL)
            .then(response => response.json())
            .then(function(json) {
                this.autocompleteListDidChange(e, json);
            }.bind(this));
    }


    // on received updated autoComplete list from Backend
    autocompleteListDidChange(e, response) {
        this.featureList = response.features;
        this.routePointComplete.list = this.featureList.map(feature => feature.properties.uc_label);
        this.routePointComplete.evaluate()
    }


    // when user pin a marker on map, using this method we fill input box
    reverseGeocoding(e) {
        const reverseGeocodingURL = "https://uc1.umotional.net/geocoding/reverse"

        var reqURL = reverseGeocodingURL
        reqURL += "?point.lat=" + e.lngLat.lat
        reqURL += "&point.lon=" + e.lngLat.lng;

        fetch(reqURL)
            .then(response => response.json())
            .then(json => this.reverseGeocodingDidCalled(json));
    }

    // on received info about marker location;
    reverseGeocodingDidCalled(json) {
        let feature = json.features[0]

        let coords = feature.geometry.coordinates;
        let label = feature.properties.uc_label

        this.elm.value = label;

    }

    // user interaction delegate with marker
    mouseDown(src) {
        if (!this.isCursorOverPoint) return;
        this.isDragging = true;
        this.pointDown = true

        // Set a cursor indicator
        map.getCanvasContainer().style.cursor = 'grab';

        map.on('mousemove', function(e) {
          this.onMove(e);
        }.bind(this));

        map.on('mouseup', function(e) {
          this.onUp(e);
        }.bind(this));
    }

    // user interaction delegate with marker
    onMove(e) {
        if (!this.isDragging) return;
        var coords = e.lngLat;
        map.getCanvasContainer().style.cursor = 'grabbing';

        this.pointMarkerSrc.data.features[0].geometry.coordinates = [coords.lng, coords.lat];
        map.getSource(this.pointMarkerSrcId).setData(this.pointMarkerSrc.data);
    }

    // user interaction delegate with marker
    onUp(e) {
        if (!this.isDragging) return;
        var coords = e.lngLat;

        this.reverseGeocoding(e)
        this.pointDown = false;

        if (isRoutePlanned) {
            var planRouteBtn = document.getElementById('planRouteBtn')
            planRouteBtn.disabled = false;
            planRouteBtn.click();
            planRouteBtn.disabled = true;
        }
        map.getCanvasContainer().style.cursor = '';
        this.isDragging = false;

        // Unbind mouse events
        map.off('mousemove', e => onMove(e, src));
    }
}
