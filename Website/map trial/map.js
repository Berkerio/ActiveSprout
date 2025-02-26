// ==============================
// 1. Inizializzazione della Mappa
// ==============================
const map = L.map('map').setView([45.357263, 9.442974], 13);
L.esri.basemapLayer('Topographic').addTo(map);

// ==============================
// 2. Funzioni di Utilità
// ==============================
function formatTime(hours) {
  const secs = Math.round(hours * 3600);
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m ${secs % 60}s`;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6378;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateRouteStats(route) {
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += getDistance(...route[i], ...route[i + 1]);
  }
  return {
    distance: totalDistance,
    durationHours: totalDistance / AVG_SPEED,
    totalCalories: Math.round(MET * AVG_WEIGHT * totalDistance / AVG_SPEED)
  };
}

// ==============================
// 3. Configurazione & Dati del Percorso
// ==============================
const AVG_SPEED = 5;         // km/h
const AVG_WEIGHT = 70;       // kg
const MET = 3.9;             // MET per camminata
const STEP_DURATION = 100;   // durata di un passo in ms
const PAUSE_DURATION = 2000; // pausa tra segmenti in ms
const MARKER_OFFSET_PX = 100; // offset per centrare la mappa

// Definizione del percorso (array di coordinate)
const route = [
  [45.357263, 9.442974], // Galgagnano
  [45.349536, 9.443567], // Bellaria
  [45.343350, 9.446359], // Arcagna
  [45.332077, 9.456796]  // Montanaso Lombardo
];

const stats = calculateRouteStats(route);
document.querySelector('.calories').textContent = `${stats.totalCalories} cal`;
document.querySelector('.length').textContent = `${stats.distance.toFixed(2)} km`;
document.querySelector('.time').textContent = formatTime(stats.durationHours);

// ==============================
// 4. Setup dei Routing Controls
// ==============================
// Convertiamo il percorso in waypoints L.LatLng per la route viola
const purpleWaypoints = route.map(point => L.latLng(point[0], point[1]));

// --- Route principale "viola" ---
const purpleRoutingControl = L.Routing.control({
  waypoints: purpleWaypoints,
  routeWhileDragging: false,
  showAlternatives: false,
  lineOptions: {
    styles: [{ color: '#483D8B', weight: 6 }]
  },
  createMarker: () => null
}).addTo(map);

// --- Route "verde" per il tratto già percorso ---
let greenWaypoints = [L.latLng(route[0][0], route[0][1])];
const greenRoutingControl = L.Routing.control({
  waypoints: greenWaypoints,
  routeWhileDragging: false,
  showAlternatives: false,
  lineOptions: {
    styles: [{ color: 'green', weight: 6 }]
  },
  createMarker: () => null
}).addTo(map);

// ==============================
// 5. Marker & Popup (Statici)
// ==============================
const customIcons = {
  start: L.icon({ iconUrl: 'Icons/arrival.png', iconSize: [34, 48] }),
  moving: L.icon({ iconUrl: 'Icons/moving.png', iconSize: [34, 48] }),
  path: L.icon({ iconUrl: 'Icons/markers.png', iconSize: [34, 48] }),
  end: L.icon({ iconUrl: 'Icons/arrival.png', iconSize: [34, 48] })
};

route.forEach((point, i) => {
  const icon = i === 0 ? customIcons.start :
               i === route.length - 1 ? customIcons.end : customIcons.path;
  L.marker(point, { icon }).addTo(map)
    .bindPopup(''); // Popup vuoto per evitare sovrapposizioni
});

// ==============================
// 6. Animazione & Gestione del Percorso
// ==============================
let isAnimating = false;
let isCompleted = false;
let movingMarker;
let totalDistanceTravelled = 0;

function updateMapCenterWithOffset(latlng) {
  const markerPoint = map.latLngToContainerPoint(latlng);
  const offsetPoint = L.point(markerPoint.x, markerPoint.y - MARKER_OFFSET_PX);
  const newCenter = map.containerPointToLatLng(offsetPoint);
  map.panTo(newCenter, { animate: false });
}

function showStagePopup(segmentIndex) {
  const stageNames = [
    "Partenza",
    "Pausa Bellaria",
    "Pausa Arcagna",
    "Arrivo"
  ];
  const descriptions = [
    "Inizia il tuo percorso dalla zona di Galgagnano...",
    "Passaggio attraverso la frazione di Bellaria...",
    "Attraverso la frazione di Arcagna...",
    "Complimenti, hai raggiunto la destinazione!"
  ];
  const popup = document.querySelector('.stage-popup');
  popup.querySelector('.popup-header').textContent = stageNames[segmentIndex];
  popup.querySelector('.popup-content').textContent = descriptions[segmentIndex];
  const exitBtn = popup.querySelector('.exit-btn');
  if (exitBtn) exitBtn.style.display = "none";
  popup.classList.add('active');
  setTimeout(() => popup.classList.remove('active'), PAUSE_DURATION - 1000);
}

function showFinalPopup() {
  const popup = document.querySelector('.stage-popup');
  popup.querySelector('.popup-header').textContent = "Arrivo";
  popup.querySelector('.popup-content').textContent = "Complimenti, hai completato il percorso!";
  const exitBtn = popup.querySelector('.exit-btn');
  if (exitBtn) {
    exitBtn.style.display = "block";
    exitBtn.replaceWith(exitBtn.cloneNode(true));
    const newExitBtn = popup.querySelector('.exit-btn');
    newExitBtn.addEventListener('click', () => {
      map.flyTo(route[0], 13, { duration: 1.5 });
      popup.classList.remove('active');
      location.reload();
    });
  }
  popup.classList.add('active');
}

async function animateRoute() {
  isAnimating = true;
  let currentSegment = 0;
  totalDistanceTravelled = 0;
  document.querySelector('.calories').textContent = '0 cal';

  if (movingMarker) map.removeLayer(movingMarker);
  movingMarker = L.marker(route[0], { icon: customIcons.moving }).addTo(map);

  greenWaypoints = [L.latLng(route[0][0], route[0][1])];
  greenRoutingControl.setWaypoints(greenWaypoints);

  await new Promise((resolve) => {
    map.once("zoomend", resolve);
    map.flyTo(route[0], 16, { duration: 1.5 });
  });
  updateMapCenterWithOffset(movingMarker.getLatLng());
  changeDescription(0);

  while (currentSegment < route.length - 1) {
    const start = route[currentSegment];
    const end = route[currentSegment + 1];
    const segmentDistance = getDistance(...start, ...end);

    for (let step = 0; step <= 100; step++) {
      const progress = step / 100;
      const currentLat = start[0] + (end[0] - start[0]) * progress;
      const currentLng = start[1] + (end[1] - start[1]) * progress;
      movingMarker.setLatLng([currentLat, currentLng]);
      updateMapCenterWithOffset(movingMarker.getLatLng());

      const lastPoint = greenWaypoints[greenWaypoints.length - 1];
      if (!lastPoint || lastPoint.lat !== currentLat || lastPoint.lng !== currentLng) {
        greenWaypoints.push(L.latLng(currentLat, currentLng));
        greenRoutingControl.setWaypoints(greenWaypoints);
      }

      const currentSegmentTraveled = segmentDistance * progress;
      const globalTraveled = totalDistanceTravelled + currentSegmentTraveled;
      const remainingDistance = stats.distance - globalTraveled;
      const elapsedHours = globalTraveled / AVG_SPEED;
      document.querySelector('.length').textContent = `${remainingDistance.toFixed(2)} km`;
      document.querySelector('.calories').textContent = `${Math.round(MET * AVG_WEIGHT * elapsedHours)} cal`;
      document.querySelector('.time').textContent = formatTime(remainingDistance / AVG_SPEED);

      await new Promise(r => setTimeout(r, STEP_DURATION));
    }

    totalDistanceTravelled += segmentDistance;

    if (currentSegment < route.length - 2) {
      showStagePopup(currentSegment + 1);
      changeDescription(currentSegment + 1);
      await new Promise(r => setTimeout(r, PAUSE_DURATION));
    }
    currentSegment++;
  }

  map.flyTo(movingMarker.getLatLng(), 13, { duration: 1.5 });
  isAnimating = false;
  isCompleted = true;
  showFinalPopup();
}

// ==============================
// 7. Gestione degli Eventi
// ==============================
document.querySelector('.btn.save').addEventListener('click', () => {
  if (!isAnimating) {
    map.flyTo(route[0], 21, { duration: 1.5 });
    animateRoute();
  }
});

document.querySelector('.btn.modify').addEventListener('click', () => {
  map.flyTo(route[0], 13, { duration: 1.5 });
  location.reload();
});

function changeDescription(step) {
  const textarea = document.getElementById('description');
  const buttons = document.querySelectorAll('.step');
  const stepBar = document.querySelector('.step-bar');

  buttons.forEach(button => {
    button.classList.remove('active');
    button.style.padding = '12px 29px';
  });
  textarea.classList.remove('active');

  const activeButton = document.querySelector(`.step:nth-child(${step + 1})`);
  if (activeButton) {
    activeButton.classList.add('active');
    activeButton.style.padding = '12px 50px';
    textarea.classList.add('active');

    const containerWidth = stepBar.offsetWidth;
    const buttonOffset = activeButton.offsetLeft;
    const buttonWidth = activeButton.offsetWidth;
    stepBar.scrollTo({
      left: buttonOffset - (containerWidth / 2) + (buttonWidth / 2),
      behavior: 'smooth'
    });
  }

  const descriptions = [
    "Inizia il tuo percorso dalla zona di Galgagnano, mi raccomando prima di iniziare fai un po' di stretching!",
    "Passaggio attraverso la frazione di Bellaria, bevi un po' d'acqua e respira profondamente",
    "Attraverso la frazione di Arcagna, siediti un attimo e riprendi le energie!",
    "Conclusione del percorso a Montanaso Lombardo, complimenti per aver completato il percorso!"
  ];

  textarea.value = descriptions[step] || "Descrizione non disponibile";
}
changeDescription(0);
