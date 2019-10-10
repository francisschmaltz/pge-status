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
var map = new mapkit.Map("map", {"colorScheme": `${mapColor()}`});

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
