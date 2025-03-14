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

    // Load Parks and Recreation data
    const parksResponse = await fetch('https://raw.githubusercontent.com/chann15/GGR472_Final_Project/ab671d350e44e397a5663ec1fb1cdf4d700a5fa9/Data/Parks%20and%20Recreation_TOR.geojson');
    const parksData = await parksResponse.json();

    // Define colors for each type
    const typeColors = {
        'Nature/ Park': '#32cd32'
    };

    // Define buffer sizes for each type
    const typeBufferSizes = {
        'Nature/ Park': 1.0
    };

    // Split Parks data into types
    const types = [...new Set(parksData.features.map(feature => feature.properties.TYPE))];

    types.forEach(type => {
        const typeFeatures = parksData.features.filter(feature => feature.properties.TYPE === type);
        const typeGeoJSON = {
            type: 'FeatureCollection',
            features: typeFeatures
        };

        map.addSource(`${type.toLowerCase().replace(/ /g, '-')}-data`, {
            type: 'geojson',
            data: typeGeoJSON
        });

        map.addLayer({
            'id': `${type.toLowerCase().replace(/ /g, '-')}-point`,
            'type': 'circle',
            'source': `${type.toLowerCase().replace(/ /g, '-')}-data`,
            'paint': {
                'circle-radius': 5,
                'circle-color': typeColors[type] || '#ff6347',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Create buffers for Parks data using Turf.js
        const bufferedPOIFeatures = typeFeatures.map(feature => {
            return turf.buffer(feature, typeBufferSizes[type] || 0.5, { units: 'kilometers' }); // Buffer size based on type
        });

        // Combine all buffers into one GeoJSON feature collection
        const bufferedPOIGeoJSON = turf.featureCollection(bufferedPOIFeatures);

        // Add buffered layer for Parks data
        map.addSource(`${type.toLowerCase().replace(/ /g, '-')}-buffered-data`, {
            type: 'geojson',
            data: bufferedPOIGeoJSON
        });

        map.addLayer({
            'id': `${type.toLowerCase().replace(/ /g, '-')}-buffered-layer`,
            'type': 'fill',
            'source': `${type.toLowerCase().replace(/ /g, '-')}-buffered-data`,
            'paint': {
                'fill-color': typeColors[type] || '#ff6347',
                'fill-opacity': 0.3,
                'fill-outline-color': typeColors[type] || '#ff6347'
            }
        });
    });

    // Add legend and sliders
    const legend = document.getElementById('legend');

    // Add grocery legend and slider
    const groceryLegendItem = document.createElement('div');
    groceryLegendItem.innerHTML = '<span style="background-color: #6495ed;"></span> Grocery';
    legend.appendChild(groceryLegendItem);

    const groceryCheckbox = document.createElement('input');
    groceryCheckbox.type = 'checkbox';
    groceryCheckbox.checked = true;
    groceryCheckbox.onchange = (e) => {
        map.setLayoutProperty('grocery-point', 'visibility', e.target.checked ? 'visible' : 'none');
        map.setLayoutProperty('buffered-layer', 'visibility', e.target.checked ? 'visible' : 'none');
    };
    groceryLegendItem.prepend(groceryCheckbox);

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

    // Add Parks legends and sliders
    types.forEach(type => {
        const color = typeColors[type] || '#ff6347';

        // Add legend item
        const legendItem = document.createElement('div');
        legendItem.innerHTML = `<span style="background-color: ${color};"></span> ${type}`;
        legend.appendChild(legendItem);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.onchange = (e) => {
            map.setLayoutProperty(`${type.toLowerCase().replace(/ /g, '-')}-point`, 'visibility', e.target.checked ? 'visible' : 'none');
            map.setLayoutProperty(`${type.toLowerCase().replace(/ /g, '-')}-buffered-layer`, 'visibility', e.target.checked ? 'visible' : 'none');
        };
        legendItem.prepend(checkbox);

        const sliderLabel = document.createElement('label');
        sliderLabel.innerHTML = 'Buffer Size: 0.25 - 1.25 km';
        legendItem.appendChild(sliderLabel);

        // Add slider
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0.25';
        slider.max = '1.25';
        slider.step = '0.25';
        slider.value = typeBufferSizes[type] || '0.5';
        slider.oninput = (e) => {
            const bufferSize = parseFloat(e.target.value);
            const typeFeatures = parksData.features.filter(feature => feature.properties.TYPE === type);
            const bufferedPOIFeatures = typeFeatures.map(feature => {
                return turf.buffer(feature, bufferSize, { units: 'kilometers' });
            });
            const bufferedPOIGeoJSON = turf.featureCollection(bufferedPOIFeatures);
            map.getSource(`${type.toLowerCase().replace(/ /g, '-')}-buffered-data`).setData(bufferedPOIGeoJSON);
        };
        legendItem.appendChild(slider);
    });

    // Load TTC points data
    const ttcResponse = await fetch('https://raw.githubusercontent.com/chann15/GGR472_Final_Project/main/Data/TTC%20POINTS.geojson');
    const ttcData = await ttcResponse.json();

    // Add TTC points layer
    map.addSource('ttc-data', {
        type: 'geojson',
        data: ttcData
    });

    map.addLayer({
        'id': 'ttc-point',
        'type': 'circle',
        'source': 'ttc-data',
        'paint': {
            'circle-radius': 5,
            'circle-color': '#ff0000',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff'
        }
    });

    // Create buffers for TTC points using Turf.js
    const bufferedTTCFeatures = ttcData.features.map(feature => {
        return turf.buffer(feature, 0.5, { units: 'kilometers' }); // 0.5 km buffer
    });

    // Combine all buffers into one GeoJSON feature collection
    const bufferedTTCGeoJSON = turf.featureCollection(bufferedTTCFeatures);

    // Add buffered layer for TTC points
    map.addSource('ttc-buffered-data', {
        type: 'geojson',
        data: bufferedTTCGeoJSON
    });

    map.addLayer({
        'id': 'ttc-buffered-layer',
        'type': 'fill',
        'source': 'ttc-buffered-data',
        'paint': {
            'fill-color': '#ff0000',
            'fill-opacity': 0.3,
            'fill-outline-color': '#ff0000'
        }
    });

    // Add TTC legend and slider
    const ttcLegendItem = document.createElement('div');
    ttcLegendItem.innerHTML = '<span style="background-color: #ff0000;"></span> TTC Points';
    legend.appendChild(ttcLegendItem);

    const ttcCheckbox = document.createElement('input');
    ttcCheckbox.type = 'checkbox';
    ttcCheckbox.checked = true;
    ttcCheckbox.onchange = (e) => {
        map.setLayoutProperty('ttc-point', 'visibility', e.target.checked ? 'visible' : 'none');
        map.setLayoutProperty('ttc-buffered-layer', 'visibility', e.target.checked ? 'visible' : 'none');
    };
    ttcLegendItem.prepend(ttcCheckbox);

    const ttcSliderLabel = document.createElement('label');
    ttcSliderLabel.innerHTML = 'Buffer Size: 0.25 - 1.25 km';
    ttcLegendItem.appendChild(ttcSliderLabel);

    const ttcSlider = document.createElement('input');
    ttcSlider.type = 'range';
    ttcSlider.min = '0.25';
    ttcSlider.max = '1.25';
    ttcSlider.step = '0.25';
    ttcSlider.value = '0.5';
    ttcSlider.oninput = (e) => {
        const bufferSize = parseFloat(e.target.value);
        const bufferedTTCFeatures = ttcData.features.map(feature => {
            return turf.buffer(feature, bufferSize, { units: 'kilometers' });
        });
        const bufferedTTCGeoJSON = turf.featureCollection(bufferedTTCFeatures);
        map.getSource('ttc-buffered-data').setData(bufferedTTCGeoJSON);
    };
    ttcLegendItem.appendChild(ttcSlider);
});
