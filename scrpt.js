mapboxgl.accessToken = 'pk.eyJ1IjoiZW1pbHlhbW9mZmF0IiwiYSI6ImNtNmI0d3puaTA0dG0yam84dzNiZTQ5NjIifQ.A1PSOyaJV6TF-lKcIFMHQA';

const map = new mapboxgl.Map({
    container: 'my-map',
    style: 'mapbox://styles/mapbox/streets-v11', // Changed to streets-v11
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

    // Add points layer
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

    // Create buffers using Turf.js
    const bufferedFeatures = groceryData.features.map(feature => {
        return turf.buffer(feature, 0.5, { units: 'kilometers' }); // 0.5 km buffer
    });

    // Combine all buffers into one GeoJSON feature collection
    const bufferedGeoJSON = turf.featureCollection(bufferedFeatures);

    // Add buffered layer
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

    // Debugging: Confirm data in console
    console.log('Buffered data:', bufferedGeoJSON);

    // Popup on click
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

    // Load POI data
    const poiResponse = await fetch('https://raw.githubusercontent.com/emilyamoffat/test/main/tor%20Places%20of%20Interest%20and%20Attractions.geojson');
    const poiData = await poiResponse.json();

    // Define colors for each category
    const categoryColors = {
        'Landmark': '#ff6347',
        'Museum': '#ffa500',
        'Performing Arts': '#8a2be2',
        'Nature/ Park': '#32cd32',
        'Attraction': '#ff4500',
        'Gallery': '#1e90ff',
        'Sports / Entertainment Venue': '#ff1493',
        'Transportation': '#ff69b4',
        'Convention & Trade Centres': '#00ced1'
    };

    // Define buffer sizes for each category
    const categoryBufferSizes = {
        'Landmark': 0.7,
        'Museum': 0.8,
        'Performing Arts': 0.6,
        'Nature/ Park': 1.0,
        'Attraction': 0.9,
        'Gallery': 0.5,
        'Sports / Entertainment Venue': 0.4,
        'Transportation': 0.3,
        'Convention & Trade Centres': 0.2
    };

    // Split POI data into categories
    const categories = [...new Set(poiData.features.map(feature => feature.properties.CATEGORY))];

    categories.forEach(category => {
        const categoryFeatures = poiData.features.filter(feature => feature.properties.CATEGORY === category);
        const categoryGeoJSON = {
            type: 'FeatureCollection',
            features: categoryFeatures
        };

        map.addSource(`${category.toLowerCase().replace(/ /g, '-')}-data`, {
            type: 'geojson',
            data: categoryGeoJSON
        });

        map.addLayer({
            'id': `${category.toLowerCase().replace(/ /g, '-')}-point`,
            'type': 'circle',
            'source': `${category.toLowerCase().replace(/ /g, '-')}-data`,
            'paint': {
                'circle-radius': 5,
                'circle-color': categoryColors[category] || '#ff6347',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Create buffers for POI data using Turf.js
        const bufferedPOIFeatures = categoryFeatures.map(feature => {
            return turf.buffer(feature, categoryBufferSizes[category] || 0.5, { units: 'kilometers' }); // Buffer size based on category
        });

        // Combine all buffers into one GeoJSON feature collection
        const bufferedPOIGeoJSON = turf.featureCollection(bufferedPOIFeatures);

        // Add buffered layer for POI data
        map.addSource(`${category.toLowerCase().replace(/ /g, '-')}-buffered-data`, {
            type: 'geojson',
            data: bufferedPOIGeoJSON
        });

        map.addLayer({
            'id': `${category.toLowerCase().replace(/ /g, '-')}-buffered-layer`,
            'type': 'fill',
            'source': `${category.toLowerCase().replace(/ /g, '-')}-buffered-data`,
            'paint': {
                'fill-color': categoryColors[category] || '#ff6347',
                'fill-opacity': 0.3,
                'fill-outline-color': categoryColors[category] || '#ff6347'
            }
        });
    });

    // Add legend and sliders
    const legend = document.getElementById('legend');

    // Add grocery legend and slider
    const groceryLegendItem = document.createElement('div');
    groceryLegendItem.innerHTML = '<span style="background-color: #6495ed;"></span> Grocery';
    legend.appendChild(groceryLegendItem);

    const grocerySliderLabel = document.createElement('label');
    grocerySliderLabel.innerHTML = 'Buffer Size: 0.25 - 1.25 km';
    groceryLegendItem.appendChild(grocerySliderLabel);

    const grocerySlider = document.createElement('input');
    grocerySlider.type = 'range';
    grocerySlider.min = '0.25';
    grocerySlider.max = '1.25';
    grocerySlider.step = '0.25';
    grocerySlider.value = '0.5';
    grocerySlider.oninput = (e) => {
        const bufferSize = parseFloat(e.target.value);
        const bufferedFeatures = groceryData.features.map(feature => {
            return turf.buffer(feature, bufferSize, { units: 'kilometers' });
        });
        const bufferedGeoJSON = turf.featureCollection(bufferedFeatures);
        map.getSource('buffered-data').setData(bufferedGeoJSON);
    };
    groceryLegendItem.appendChild(grocerySlider);

    // Add POI legends and sliders
    categories.forEach(category => {
        const color = categoryColors[category] || '#ff6347';

        // Add legend item
        const legendItem = document.createElement('div');
        legendItem.innerHTML = `<span style="background-color: ${color};"></span> ${category}`;
        legend.appendChild(legendItem);

        const sliderLabel = document.createElement('label');
        sliderLabel.innerHTML = 'Buffer Size: 0.25 - 1.25 km';
        legendItem.appendChild(sliderLabel);

        // Add slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0.25';
        slider.max = '1.25';
        slider.step = '0.25';
        slider.value = categoryBufferSizes[category] || '0.5';
        slider.oninput = (e) => {
            const bufferSize = parseFloat(e.target.value);
            const categoryFeatures = poiData.features.filter(feature => feature.properties.CATEGORY === category);
            const bufferedPOIFeatures = categoryFeatures.map(feature => {
                return turf.buffer(feature, bufferSize, { units: 'kilometers' });
            });
            const bufferedPOIGeoJSON = turf.featureCollection(bufferedPOIFeatures);
            map.getSource(`${category.toLowerCase().replace(/ /g, '-')}-buffered-data`).setData(bufferedPOIGeoJSON);
        };
        legendItem.appendChild(slider);
    });
});
