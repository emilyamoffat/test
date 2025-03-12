mapboxgl.accessToken = 'pk.eyJ1IjoiZW1pbHlhbW9mZmF0IiwiYSI6ImNtNmI0d3puaTA0dG0yam84dzNiZTQ5NjIifQ.A1PSOyaJV6TF-lKcIFMHQA';

const map = new mapboxgl.Map({
    container: 'my-map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-79.3832, 43.6532],
    zoom: 9
});

map.fitBounds([
    [-79.62, 43.6], // Southwest corner
    [-79.12, 43.83] // Northeast corner
]);

map.on('load', async () => {
    // Load grocery data
    const response = await fetch('https://raw.githubusercontent.com/emilyamoffat/test/main/overpass_grocery.geojson');
    const groceryData = await response.json();

    // ✅ Add points layer
    map.addSource('grocery-data', {
        type: 'geojson',
        data: groceryData
    });

    map.addLayer({
        'id': 'grocery-point',
        'type': 'circle',
        'source': 'grocery-data',
        'paint': {
            'circle-radius': 4,
            'circle-color': '#6495ed',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        }
    });

    // ✅ Create buffers using Turf.js
    const bufferedFeatures = groceryData.features.map(feature => {
        return turf.buffer(feature, 0.5, { units: 'kilometers' }); // 0.5 km buffer
    });

    // ✅ Combine all buffers into one GeoJSON feature collection
    const bufferedGeoJSON = turf.featureCollection(bufferedFeatures);

    // ✅ Add buffered layer
    map.addSource('buffered-data', {
        type: 'geojson',
        data: bufferedGeoJSON
    });

    map.addLayer({
        'id': 'buffered-layer',
        'type': 'fill',
        'source': 'buffered-data',
        'paint': {
            'fill-color': '#ff69b4',
            'fill-opacity': 0.3,
            'fill-outline-color': '#ff1493'
        }
    });

    // ✅ Debugging: Confirm data in console
    console.log('Buffered data:', bufferedGeoJSON);

    // ✅ Popup on click
    map.on('click', 'grocery-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.name || 'Unknown Store';

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<strong>${description}</strong>`)
            .addTo(map);
    });

    map.on('mouseenter', 'grocery-point', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'grocery-point', () => {
        map.getCanvas().style.cursor = '';
    });
});
