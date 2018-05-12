
var featureList = [];


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


class AutoComplete {
  constructor(elm) {
    this._elm = elm;
    document.addEventListener('input', this._autoComplete.bind(this));
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
