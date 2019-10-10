const mapkit = window.mapkit;

mapkit.init({
  authorizationCallback: (done) => {
    fetch('/mkToken')
    .then(res => res.text())
    .then(token => done(token))
    .catch(error => {});
  }
});

// Set Map Color based off inital theme
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
const mapColor = () => {
  if (prefersDark) {
    return "dark"
  } else {
    return "light"
  }
}
var BayArea = new mapkit.CoordinateRegion(
    new mapkit.Coordinate(38.575, -121.475),
    new mapkit.CoordinateSpan(1, 1)
);
var SearchArea = new mapkit.CoordinateRegion(
    new mapkit.Coordinate(38.575, -121.475),
    new mapkit.CoordinateSpan(2, 2)
);

let w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
let paddingTop
if (w < 600) {
  paddingTop = 140
} else {
  paddingTop = 62
}

var map = new mapkit.Map("map", {"colorScheme": `${mapColor()}`, padding: new mapkit.Padding({ top: paddingTop }) });
map.region = BayArea;

// Import GeoJSON data with the shape of the states and their population.
mapkit.importGeoJSON("/vendor/pge.geojson", {
    // Some states are represented as MultiPolygons; we transform them into
    // a single PolygonOverlay by concatenating the lists of lists of points.
    itemForMultiPolygon: function(collection, geoJSON) {
        var overlays = collection.getFlattenedItemList();
        var points = overlays.reduce(function(points, overlay) {
            return points.concat(overlay.points);
        }, []);
        return new mapkit.PolygonOverlay(points);
    },

    // After an overlay has been created for a feature (either directly or through
    // itemForMultiPolygon above), the properties of the feature are used to add data
    // and set the style (especially the fill color) based on population count.
    itemForFeature: function(overlay, geoJSON) {

        // Add data to the overlay to be shown when it is selected.
        overlay.data = {
            name: geoJSON.properties.name,
        };

        overlay.style = new mapkit.Style({
            fillOpacity: 0.5,
            lineWidth: 0.5,
            fillColor: "#fa9fb5"
        });

        return overlay;
    },

    // When all the data has been imported, we can show the results.
    geoJSONDidComplete: function(overlays) {
        map.addItems(overlays);
        console.log("it's doing something?");

    }
});

//Define Search app
function SearchApp() {
  // Search can also be instantiated with a few options to find results near a
  // specific location or to explicitly set the language.
  // For example:
  // var search = new mapkit.Search({ language: "fr-CA", getsUserLocation: true });
  this.search = new mapkit.Search({
		region: SearchArea
	});

  this.searchInput = document.getElementById("originInput");
  this.searchInput.addEventListener("keyup", this);

  this.autocompleteBox = document.getElementById("autocomplete-box");
  this.autocompleteList = document.getElementById("autocomplete-list");

  this.annotations = [];
}

SearchApp.prototype = {
  constructor: SearchApp,

  handleEvent: function(event) {
    switch (event.type) {
      case "keyup":
      this.handleSearchKeyUpEvent(event);
      break;
      case "click":
      if (event.target.dataset !== "undefined" || event.target.parentElement.dataset !== "undefined") {
        if (event.target.nodeName != "LI") {
          var selectedResult = this.autocompleteData.results[event.target.parentElement.dataset.index];
        } else {
          var selectedResult = this.autocompleteData.results[event.target.dataset.index];
        }
        this.resultSelected(selectedResult);
      }
      break;
    }
  },

  // handleSearchKeyUpEvent performs searches, updates the highlighted
  // autocomplete result, and closes the autocomplete menu.
  handleSearchKeyUpEvent: function(event) {
    var query = event.target.value.trim();
    switch (event.keyCode) {
      case 13:
      // The return key was pressed, and a search should be performed.
      var highlightedElement = document.getElementsByClassName("highlighted")[0];
      if (highlightedElement) {
        // In this case, a user selected a SearchAutocompleteResult, which
        // can be used to retrieve the exact results. For example, if a user
        // types "painted" and then selects the autocomplete result for the
        // Painted Ladies in San Francisco, the exact Place object will be
        // retrieved, instead of performing a new search for "painted".
        query = this.autocompleteData.results[parseInt(highlightedElement.dataset.index)];
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
        this.search.autocomplete(query, searchDelegate, {region: SearchArea});

      } else {
        this.shouldShowAutocomplete(false);
      }
    }
  },

  // displayAutocomplete generates a search autocomplete menu based off of the
  // autocomplete data returned by the server.
  displayAutocomplete: function(data) {
    this.autocompleteList.innerHTML = "";

    data.results.forEach(function(result, i) {
      var resultElement = document.createElement("li");

      result.displayLines.forEach(function(displayLine, j) {
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
  resultSelected: function(result) {
    this.performSearch(result);
    this.searchInput.value = result.displayLines[0];
    this.removeDisplayedAnnotations();
    this.shouldShowAutocomplete(false);
  },

  // performSearch searches using a string, such as "sushi", or a
  // SearchAutocompleteResult.
  performSearch: function(query) {
    // The search method returns a request id that can be used to abort a
    // pending request.
    if (this.requestId) {
      this.search.cancel(this.requestId);
    }
    // The search method accepts an optional `options` hash.
    // In this case, the displayed map region is used to find results near the
    // displayed map region.
    this.requestId = this.search.search(query, searchDelegate, { region: SearchArea });
  },

  autocompleteDidComplete: function(data) {
    this.autocompleteData = data;
    this.displayAutocomplete(data);
  },

  // searchDidComplete displays the search results as annotations on the map.
  searchDidComplete: function(data) {
		globalStartingPoint = data;
		// console.log(globalStartingPoint);
		// console.log(data);
		console.log("Global Starting Point Defined");
  },

  // The rest of the functions below are related to the UI of the search/search
  // autocomplete results.

  shouldShowAutocomplete: function(value) {
    this.autocompleteBox.style.display = value ? "block" : "none";
    if (!value) {
      this.removeDisplayedAnnotations();
    }
  },

  resultMousedOver: function(resultElement) {
    var highlightedElement = document.getElementsByClassName("highlighted")[0];
    if (highlightedElement) {
      IESupport.classList.remove(highlightedElement, "highlighted");
    }
    var selectedIndex;
    if (resultElement.nodeName != "LI") {
      resultElement.parentElement.classList.add("highlighted");
      selectedIndex = resultElement.parentElement.dataset.index;
    } else {
      IESupport.classList.add(resultElement, "highlighted");
      selectedIndex = resultElement.dataset.index;
    }
    this.displayAutocompleteResult(selectedIndex);
  },

  resultMousedOut: function(resultElement) {
    if (resultElement.nodeName != "LI") {
      resultElement.parentElement.classList.remove("highlighted");
    } else {
      IESupport.classList.remove(resultElement, "highlighted");
    }
  },

  setAutocompleteHighlight: function(delta) {
    if (this.autocompleteList.children.length > 0) {
      var selectedIndex;
      // There should only be 1 highlighted element at a time.
      var highlightedElement = document.getElementsByClassName("highlighted")[0];
      if (highlightedElement) {
        selectedIndex = parseInt(highlightedElement.dataset.index) + delta;
        if (selectedIndex < 0 || selectedIndex >= this.autocompleteList.children.length) {
          selectedIndex = 0;
        }
        IESupport.classList.remove(highlightedElement, "highlighted");
      } else {
        selectedIndex = 0;
      }
      IESupport.classList.add(this.autocompleteList.children[selectedIndex], "highlighted");

      this.displayAutocompleteResult(selectedIndex);
    }
  },

  displayAutocompleteResult: function(index) {
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
				color: "#54d669"
			});
			this.lastAnnotation = startPin;
			map.addAnnotation(startPin);
      map.center = selectedResult.coordinate;
    }
  },

  removeDisplayedAnnotations: function() {
    if (this.annotations) {
      map.removeAnnotations(this.annotations);
      this.annotations = [];
    }
  }
};

// Delegate object used when making calls to Search

var searchDelegate = {
  autocompleteDidComplete: function(data) {
    searchApp.autocompleteDidComplete(data);
  },

  autocompleteDidError: function(error) {
    console.log(error.message);
  },

  searchDidComplete: function(data) {
    searchApp.searchDidComplete(data);
    console.log(data);

    var self = this;

		// Remove Previous annotations
    if(map.annotations[0]) {
      map.removeAnnotation(map.annotations[0]);
    }


		// Add Annotation for starting point in Green
		var startPin = new mapkit.MarkerAnnotation(data.boundingRegion.center, {
			// callout: annotationDelegate,
			title: data.places[0].name,
			selected: true,
			animates: true,
			color: "#0d97ff"
		});
		map.addAnnotation(startPin);
    map.region = data.boundingRegion;
  },

  searchDidError: function(error) {
    console.log(error.message);
  }
};

var searchApp = new SearchApp();