mapboxgl.accessToken = 'pk.eyJ1IjoiYWxsZW55dWFuIiwiYSI6ImNtaGU0eGxpNzBhZmQyanEyY3pxZDFoM3oifQ.3KmK2WRpvAGKu9R2l2mHVA';

async function geojsonFetch() {

  // 1) init map first
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v10', // ✅ 你刚刚已经验证 v10 OK
    center: [-122.33, 47.60],
    zoom: 10
  });

  // 2) init chart (matches index.html)
  const chart = c3.generate({
    bindto: '#earthquake-chart',
    data: {
      columns: [['Percent POC', 0]],
      type: 'bar'
    },
    axis: { y: { label: '% People of Color' } },
    legend: { show: false }
  });

  // 3) load geojson
  let geojson;
  try {
    const response = await fetch('assets/seattle.geojson');
    if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    geojson = await response.json();
  } catch (err) {
    console.error(err);
    const kpi = document.getElementById('earthquake-count');
    if (kpi) kpi.innerHTML = 'GeoJSON failed to load.<br>Use Live Server (http://...), not file://';
    return;
  }

  // ensure id for events
  geojson.features.forEach((f, i) => { f.id = i; });

  // --- helper: choose a name field safely ---
  function getNeighborhoodName(props) {
    const candidates = ['NEIGH_NAME', 'NAME', 'S_HOOD', 'L_HOOD', 'Neighborhood', 'neighborhood'];
    for (const k of candidates) {
      if (props && props[k]) return props[k];
    }
    return 'Unknown';
  }

  map.on('load', () => {

    map.addSource('neighborhoods', { type: 'geojson', data: geojson });

    // choropleth layer
    map.addLayer({
      id: 'poc-fill',
      type: 'fill',
      source: 'neighborhoods',
      paint: {
        'fill-color': [
        'step',
        ['to-number', ['get', 'PEOPLE_OF_COLOR_PERCENT']],
        '#deebf7',
        20, '#9ecae1',
        40, '#6baed6',
        60, '#3182bd',
        80, '#08519c'
        ],

        'fill-opacity': 0.85
      }
    });

    map.addLayer({
      id: 'outline',
      type: 'line',
      source: 'neighborhoods',
      paint: {
        'line-color': 'rgba(255,255,255,0.35)',
        'line-width': 1
      }
    });

    // ---- LEGEND (填充右下角 #legend) ----
    const legendEl = document.getElementById('legend');
    if (legendEl) {
      legendEl.innerHTML = '<b>% People of Color</b><br>';
      const grades = [0, 20, 40, 60, 80];
      const colors = ['#deebf7','#9ecae1','#6baed6','#3182bd','#08519c'];
;

      for (let i = 0; i < grades.length; i++) {
        const lo = grades[i];
        const hi = grades[i + 1];
        const row = document.createElement('div');
        row.innerHTML =
          `<span style="background:${colors[i]}; width:18px; height:10px; display:inline-block; margin-right:6px;"></span>` +
          `${lo}${hi ? `–${hi}%` : '+%'}`;
        legendEl.appendChild(row);
      }
    }

    // ---- HOVER (更新 sidebar + chart) ----
    map.on('mousemove', 'poc-fill', (e) => {
      map.getCanvas().style.cursor = 'pointer';

      const props = e.features[0].properties;
      const name = getNeighborhoodName(props);
      const pct = Number(props.PEOPLE_OF_COLOR_PERCENT);

      // sidebar text (matches index.html)
      const kpi = document.getElementById('earthquake-count');
      if (kpi) {
        kpi.innerHTML = `${name}<br>${pct.toFixed(1)}% People of Color`;
      }

      // chart update
      chart.load({ columns: [['Percent POC', pct]] });
    });

    map.on('mouseleave', 'poc-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    // ---- RESET ----
    document.getElementById('reset').addEventListener('click', (evt) => {
      evt.preventDefault();
      map.flyTo({ center: [-122.33, 47.60], zoom: 10 });

      const kpi = document.getElementById('earthquake-count');
      if (kpi) kpi.innerHTML = 'Hover over a neighborhood';

      chart.load({ columns: [['Percent POC', 0]] });
    });

  });
}

geojsonFetch();
