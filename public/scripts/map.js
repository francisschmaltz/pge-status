let focusInput = document.getElementById("originInput");
focusInput.focus();
focusInput.select();

const getCookie = (name) => {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  } else {
    return "no-cookie";
  }
};

const mapkit = window.mapkit;

mapkit.init({
  authorizationCallback: (done) => {
    fetch("/mkToken")
      .then((res) => res.text())
      .then((token) => done(token))
      .catch((error) => {});
  },
});

// Set Map Color based off inital theme
const prefersDark =
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

const mapColor = () => {
  if (prefersDark) {
    return "dark";
  } else {
    return "light";
  }
};

var BayArea = new mapkit.CoordinateRegion(
  new mapkit.Coordinate(38.12069, -121.69429),
  new mapkit.CoordinateSpan(3, 3)
);
var SearchArea = new mapkit.CoordinateRegion(
  new mapkit.Coordinate(38.575, -121.475),
  new mapkit.CoordinateSpan(3, 3)
);

let w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

let paddingTop;
let paddingLft;

let alertHeight = -12;

if (w > 600) {
  paddingTop = 68;
  paddingLft = 0;
} else {
  paddingTop = 132 + alertHeight;
  paddingLft = 0;
}
if (alertHeight !== -12) {
  console.log("it doesnt");
  let autocompleteBox = document.getElementById("autocomplete-box");
  autocompleteBox.style.maxHeight = `calc(100vh - 165px - ${alertHeight}px`;
}

var map = new mapkit.Map("map", {
  colorScheme: `${mapColor()}`,
  padding: new mapkit.Padding({ top: paddingTop, left: paddingLft }),
});

const dismiss = (element) => {
  let toDismiss = document.getElementById(element);
  toDismiss.style.opacity = "0";
  setTimeout(() => {
    toDismiss.style.display = "none";
    if (w < 600) {
      map.padding = new mapkit.Padding({ top: 120, left: paddingLft });
    }
    let autocompleteBox = document.getElementById("autocomplete-box");
    // Reset result maxHeight
    autocompleteBox.style.maxHeight = `calc(100vh - 160px`;
  }, 350);
};

map.region = BayArea;

//Define Search app
function SearchApp() {
  this.search = new mapkit.Search({
    region: SearchArea,
  });

  this.searchInput = document.getElementById("originInput");
  this.searchInput.addEventListener("keyup", this);

  this.autocompleteBox = document.getElementById("autocomplete-box");
  this.autocompleteList = document.getElementById("autocomplete-list");

  this.annotations = [];

  console.log(window.location.href)
  if (window.location.href.match(/\?./)) {
    let rawParams = window.location.href.split('?')[1].split('&')
    let params = {}

    rawParams.forEach(paramKV => {
      let kvPair = paramKV.split('=');

      params[kvPair[0]] = decodeURI(kvPair[1])
    })

    console.log(params)

    var initGeocoder = new mapkit.Geocoder({
      language: "en-US",
      getsUserLocation: false
    });

    // Preform the lookup func('lookup str', callback()=>{}, options?)
    initGeocoder.lookup(`${params.place} ${params.lat}, ${params.lon}`, (err, geocodeData) => {
      console.log(geocodeData.results[0])
      let inferedPlaceObj = {places: geocodeData.results}

      // Create a coordinate region named myRegion.
      const initCord = new mapkit.Coordinate(Number.parseFloat(params.lat), Number.parseFloat(params.lon)); // latitude, longitude
      const initSpan = new mapkit.CoordinateSpan(.0089, .016); // latitude delta, longitude delta
      let initRegion = new mapkit.CoordinateRegion(initCord, initSpan);

      // Convert this coordinate region to a bounding region.
      let initBoundingRegion = initRegion.toBoundingRegion();

      inferedPlaceObj.boundingRegion = initRegion

      console.log('inferedPlaceObj')
      console.log(inferedPlaceObj)
      placeDataOnMap(inferedPlaceObj)
      
    })

  }

}

SearchApp.prototype = {
  constructor: SearchApp,

  handleEvent: function (event) {
    switch (event.type) {
      case "keyup":
        this.handleSearchKeyUpEvent(event);
        break;
      case "click":
        if (
          event.target.dataset !== "undefined" ||
          event.target.parentElement.dataset !== "undefined"
        ) {
          if (event.target.nodeName != "LI") {
            var selectedResult = this.autocompleteData.results[
              event.target.parentElement.dataset.index
            ];
          } else {
            var selectedResult = this.autocompleteData.results[
              event.target.dataset.index
            ];
          }
          this.resultSelected(selectedResult);
        }
        break;
    }
  },

  // handleSearchKeyUpEvent performs searches, updates the highlighted
  // autocomplete result, and closes the autocomplete menu.
  handleSearchKeyUpEvent: function (event) {
    var query = event.target.value.trim();
    switch (event.keyCode) {
      case 13:
        // The return key was pressed, and a search should be performed.
        var highlightedElement = document.getElementsByClassName(
          "highlighted"
        )[0];
        if (highlightedElement) {
          // In this case, a user selected a SearchAutocompleteResult, which
          // can be used to retrieve the exact results. For example, if a user
          // types "painted" and then selects the autocomplete result for the
          // Painted Ladies in San Francisco, the exact Place object will be
          // retrieved, instead of performing a new search for "painted".
          query = this.autocompleteData.results[
            parseInt(highlightedElement.dataset.index)
          ];
        }
        this.performSearch(query);
        this.shouldShowAutocomplete(false);
        break;
      case 27:
        // The escape key was pressed, and the search autocomplete results
        // should be hidden.
        this.shouldShowAutocomplete(false);
        break;
      case 38:
        // The up key was pressed, and the highlighted autocomplete index should
        // be reduced by 1.
        this.setAutocompleteHighlight(-1);
        break;
      case 40:
        // The down key was pressed, and the highlighted autocomplete index
        // should be increased by 1.
        this.setAutocompleteHighlight(1);
        break;
      default:
        if (query != "") {
          // As the user types, search autocomplete results are retrieved.
          // In this example, a delegate, which has implemented
          // `autocompleteDidComplete` and `autocompleteDidError` methods
          // is sent as a parameter to `search.autocomplete()`.
          // A function can also be used.
          this.search.autocomplete(query, searchDelegate, {
            region: SearchArea,
          });
        } else {
          this.shouldShowAutocomplete(false);
        }
    }
  },

  // displayAutocomplete generates a search autocomplete menu based off of the
  // autocomplete data returned by the server.
  displayAutocomplete: function (data) {
    _paq.push([
      "trackEvent",
      "map search",
      "autocomplete",
      "auto complete returned search result",
    ]);
    this.autocompleteList.innerHTML = "";

    data.results.forEach(function (result, i) {
      var resultElement = document.createElement("li");

      result.displayLines.forEach(function (displayLine, j) {
        // Autocomplete results will have either 1 or 2 display lines.
        if (j === 0) {
          var displayLineElement = document.createElement("strong");
        } else {
          var displayLineElement = document.createElement("p");
        }
        displayLineElement.textContent = displayLine;
        resultElement.appendChild(displayLineElement);
      });

      resultElement.dataset.index = i;
      resultElement.addEventListener("mouseover", this);
      resultElement.addEventListener("mouseout", this);
      resultElement.addEventListener("click", this);
      this.autocompleteList.appendChild(resultElement);
    }, this);

    this.shouldShowAutocomplete(true);
  },

  // resultSelected performs a search using the selected SearchAutocompleteResult.
  resultSelected: function (result) {
    this.performSearch(result);

    this.searchInput.value = result.displayLines[0];

    this.removeDisplayedAnnotations();
    this.shouldShowAutocomplete(false);
  },

  // performSearch searches using a string, such as "sushi", or a
  // SearchAutocompleteResult.
  performSearch: function (query) {
    // The search method returns a request id that can be used to abort a
    // pending request.
    if (this.requestId) {
      this.search.cancel(this.requestId);
    }
    // The search method accepts an optional `options` hash.
    // In this case, the displayed map region is used to find results near the
    // displayed map region.

    // Create new search region to prevent results from not matching auto complete
    let SearchResultField = new mapkit.CoordinateRegion(
      new mapkit.Coordinate(
        query.coordinate.latitude,
        query.coordinate.longitude
      ),
      new mapkit.CoordinateSpan(1, 1)
    );
    _paq.push([
      "trackEvent",
      "map search",
      "selected",
      "search result selected",
    ]);
    this.requestId = this.search.search(query, searchDelegate, {
      region: SearchResultField,
    });
  },

  autocompleteDidComplete: function (data) {
    this.autocompleteData = data;
    this.displayAutocomplete(data);
  },

  // searchDidComplete displays the search results as annotations on the map.
  searchDidComplete: function (data) {
    globalStartingPoint = data;
  },

  // The rest of the functions below are related to the UI of the search/search
  // autocomplete results.

  shouldShowAutocomplete: function (value) {
    this.autocompleteBox.style.display = value ? "block" : "none";
    if (!value) {
      this.removeDisplayedAnnotations();
    }
  },

  setAutocompleteHighlight: function (delta) {
    if (this.autocompleteList.children.length > 0) {
      var selectedIndex;
      // There should only be 1 highlighted element at a time.
      var highlightedElement = document.getElementsByClassName(
        "highlighted"
      )[0];
      if (highlightedElement) {
        selectedIndex = parseInt(highlightedElement.dataset.index) + delta;
        if (
          selectedIndex < 0 ||
          selectedIndex >= this.autocompleteList.children.length
        ) {
          selectedIndex = 0;
        }
        IESupport.classList.remove(highlightedElement, "highlighted");
      } else {
        selectedIndex = 0;
      }
      IESupport.classList.add(
        this.autocompleteList.children[selectedIndex],
        "highlighted"
      );

      this.displayAutocompleteResult(selectedIndex);
    }
  },

  displayAutocompleteResult: function (index) {
    if (this.lastAnnotation) {
      map.removeAnnotation(this.lastAnnotation);
    }
    var MarkerAnnotation = mapkit.MarkerAnnotation;
    var selectedResult = this.autocompleteData.results[index];
    if (selectedResult.coordinate) {
      var startPin = new mapkit.MarkerAnnotation(selectedResult.coordinate, {
        callout: annotationDelegate,
        title: selectedResult.displayLines[0],
        subtitle: "Starting Address",
        selected: true,
        animates: true,
        color: "#54d669",
      });
      this.lastAnnotation = startPin;
      map.addAnnotation(startPin);
      map.center = selectedResult.coordinate;
    }
  },

  removeDisplayedAnnotations: function () {
    if (this.annotations) {
      map.removeAnnotations(this.annotations);
      this.annotations = [];
    }
  },
};

// Delegate object used when making calls to Search

var searchDelegate = {
  autocompleteDidComplete: function (data) {
    searchApp.autocompleteDidComplete(data);
  },

  autocompleteDidError: function (error) {
    console.log(error.message);
  },

  searchDidComplete: function (data) {
    console.log('SearchDidComplete Data:')
    console.log(data)
    searchApp.searchDidComplete(data);

    placeDataOnMap(data)
    
  },

  searchDidError: function (error) {
    console.log(error.message);
  },
};

const placeDataOnMap = (data) => {
  console.log('placeDataOnMap')
  console.log(data)
  var self = this;

    // Remove Previous annotations
    if (map.annotations[0]) {
      map.removeAnnotation(map.annotations[0]);
    }

    const regexZip = /\d{5}[-\s]??/;
    const regexNum = /(?:^|(?:[.!?]\s))(\w+)/;
    const regexNSt = /^\d*\s/;
    const regexCty = /([^,]+)/;

    const addrFull = data.places[0].formattedAddress;
    const addrName = data.places[0].name;

    const uriLocal = encodeURI(`?p=${addrName}&lat=${data.boundingRegion.center.latitude}&lon=${data.boundingRegion.center.longitude}`)
    history.pushState(null, '', `map${uriLocal}`);

    
    let addressParts = addrFull.split(", ");

    // Remove name of place
    if (addressParts.length === 5) {
      if (addressParts[0].match(regexNSt)) {
        addressParts.splice(1, 1);
      } else {
        addressParts.splice(0, 1);
      }
    }

    const zipcode = addressParts[2].match(regexZip)[0];
    const streetN = addressParts[0].match(regexNum)[0];
    const strName = addressParts[0].replace(regexNum, "");
    const ctyName = addressParts[1];

    const lat = data.places[0].coordinate.latitude;
    const lon = data.places[0].coordinate.longitude;

    var startPin = new mapkit.MarkerAnnotation(data.boundingRegion.center, {
      // callout: annotationDelegate,
      title: data.places[0].name,
      subtitle: "Loading PG&E Status...",
      selected: true,
      animates: true,
      color: "#becbd6",
    });
    map.addAnnotation(startPin);
    map.region = data.boundingRegion;

    function xhrSuccess() {
      this.callback.apply(this, this.arguments);
    }

    function xhrError() {
      console.error(this.statusText);

      _paq.push(["trackEvent", "map search", "result", this.statusText]);
      let updatedStatusPin = new mapkit.MarkerAnnotation(
        data.boundingRegion.center,
        {
          title: data.places[0].name,
          subtitle: "PG&E Error: Unable to check power outage status",
          selected: true,
          animates: true,
          color: "#0d97ff",
          callout: calloutDelegate,
          glyph:"⁇",
          glyphColor:"#3F371A",
        }
      );
      map.removeAnnotation(map.annotations[0]);
      map.addAnnotation(updatedStatusPin);
    }

    function getPGEStatus(url, callback) {
      var xhr = new XMLHttpRequest();
      xhr.callback = callback;
      xhr.arguments = Array.prototype.slice.call(arguments, 2);
      xhr.onload = xhrSuccess;
      xhr.onerror = xhrError;
      xhr.open("GET", url, true);
      xhr.send(null);
    }

    var calloutDelegate = {
      calloutLeftAccessoryForAnnotation: function (annotation) {

        var accessoryViewLeft = document.createElement("div");
        accessoryViewLeft.className = "right-accessory-view"

        var glyph = accessoryViewLeft.appendChild(document.createElement("p"));
        glyph.textContent = annotation.glyphText
        glyph.style.backgroundColor = annotation.color
        glyph.style.color = annotation.glyphColor
        glyph.style.fontWeight = "600"
        glyph.style.borderRadius = "500px"
        glyph.style.height = "32px"
        glyph.style.width = "32px"
        glyph.style.fontSize = "22px"


        return accessoryViewLeft;
      },
    };
    function showMessage() {
      console.log(JSON.parse(this.responseText))
      let message = JSON.parse(this.responseText).string;
      let color = JSON.parse(this.responseText).color;
      let glyph = JSON.parse(this.responseText).glyph;
      let glyphColor = JSON.parse(this.responseText).glyphColor;
      _paq.push(["trackEvent", "map search", "result", message]);
      let updatedStatusPin = new mapkit.MarkerAnnotation(
        data.boundingRegion.center,
        {
          title: data.places[0].name,
          subtitle: message,
          selected: true,
          animates: true,
          color: color,
          callout: calloutDelegate,
          glyphText: glyph,
          glyphColor: glyphColor
        }
      );
      map.removeAnnotation(map.annotations[0]);
      map.addAnnotation(updatedStatusPin);
    }

    getPGEStatus(
      `/check/?cty=${ctyName}&zip=${zipcode}&lon=${lon}&lat=${lat}&str=${strName}&stn=${streetN}`,
      showMessage
    );
}


var searchApp = new SearchApp();

const DARK = "(prefers-color-scheme: dark)";
const LIGHT = "(prefers-color-scheme: light)";

const changeWebsiteTheme = (scheme) => {
  console.log("theme changed to " + scheme + ". Updating mapkit theme");
  map.colorScheme = scheme;
};

const detectColorScheme = () => {
  if (!window.matchMedia) {
    return;
  }
  function listener({ matches, media }) {
    if (!matches) {
      return;
    }
    if (media === DARK) {
      changeWebsiteTheme("dark");
    } else if (media === LIGHT) {
      changeWebsiteTheme("light");
    }
  }
  const mqDark = window.matchMedia(DARK);
  mqDark.addListener(listener);
  const mqLight = window.matchMedia(LIGHT);
  mqLight.addListener(listener);
};
detectColorScheme();
