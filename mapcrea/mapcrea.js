// Recupero dati dal localStorage
const routeDataString = localStorage.getItem("routeData");
let routeData;

try {
    routeData = JSON.parse(routeDataString);
    if (!routeData || !routeData.tappe || !routeData.partenza || !routeData.arrivo) {
        throw new Error("Dati del percorso non validi");
    }
} catch (e) {
    console.error("Errore nel caricamento dei dati:", e);
    // Dati di default se non ci sono dati validi nel localStorage
    routeData = { 
        nome: "Percorso di default",
        arrivo: { 
            search: "", 
            desc: "", 
            coords: { lat: 45.5, lon: 9.18 } 
        },
        partenza: { 
            search: "", 
            desc: "", 
            coords: { lat: 45.48, lon: 9.17 } 
        },
        tappe: [
            { 
                id: 1,
                nome: "Pausa", 
                descrizione: "Prima pausa, nota: bevi l'acqua", 
                coords: { lat: 45.49, lon: 9.175 } 
            }
        ]
    };
}

// Verifica che tutti i dati necessari siano presenti
if (!routeData.nome) {
    routeData.nome = "Percorso senza nome";
}

if (!routeData.tappe || !Array.isArray(routeData.tappe)) {
    routeData.tappe = [];
}

if (!routeData.partenza || !routeData.partenza.coords) {
    routeData.partenza = {
        search: "",
        desc: "",
        coords: { lat: 45.48, lon: 9.17 }
    };
}

if (!routeData.arrivo || !routeData.arrivo.coords) {
    routeData.arrivo = {
        search: "",
        desc: "",
        coords: { lat: 45.5, lon: 9.18 }
    };
}

// Assicurati che ogni tappa abbia tutti i campi necessari
routeData.tappe = routeData.tappe.map((tappa, index) => ({
    id: tappa.id || index + 1,
    nome: tappa.nome || `Tappa ${index + 1}`,
    descrizione: tappa.descrizione || tappa.desc || "",
    coords: tappa.coords || { lat: 45.49 + (index * 0.01), lon: 9.175 + (index * 0.01) }
}));

// Dati personali per calcolo calorie
const height = parseFloat(localStorage.getItem('height')) || 175;
const weight = parseFloat(localStorage.getItem('weight')) || 70;
const age = parseInt(localStorage.getItem('age')) || 30;

// Modalità di attività e MET corrispondente
const modalita = routeData.modalita || 'Corsa';
const MET = {
    'Corsa': 6,
    'Camminata': 3,
    'Bicicletta': 8
};

// Velocità media per modalità (km/h)
const SPEED = {
    'Corsa': 12, // 12 km/h per corsa (velocità media di un runner amatoriale)
    'Camminata': 5, // 5 km/h per camminata (velocità media di una camminata veloce)
    'Bicicletta': 20 // 20 km/h per bicicletta (velocità media di un ciclista amatoriale)
};

// Inizializzazione variabili
let map;
let routeControl;
let markerMobile;
let animationInProgress = false;
let currentStep = 0;
let tappeCompletate = [];
let stepPoints = [];
let animationTimer;
let distance = 0;
let realTimeSeconds = 0; // Tempo reale in secondi
let caloriesBurned = 0;
let isDestinationReached = false;
let isFollowingMarker = true;
let lastAnimationFrame = 0;
let animationStartTime = 0;
let currentZoom = 14; // Zoom iniziale
let isPaused = false;
let pauseStartTime = 0;
let totalPausedTime = 0;

// Icone personalizzate
const startIcon = L.icon({
    iconUrl: '../Icons/Partenza.png',
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const endIcon = L.icon({
    iconUrl: '../Icons/arrivo.png',
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const waypointIcon = L.icon({
    iconUrl: '../Icons/Tappa.png',
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const mobileIcon = L.icon({
    iconUrl: '../Icons/Mobile.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// Inizializza mappa
function initMap() {
    // Creazione mappa
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true
    }).setView([routeData.partenza.coords.lat, routeData.partenza.coords.lon], 19);

    // Aggiungi layer di base con stile personalizzato
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        maxZoom: 19,
        detectRetina: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'
    }).addTo(map);

    // Aggiungi stile CSS per la mappa
    const style = document.createElement('style');
    style.innerHTML = `
        .leaflet-routing-line {
            stroke-dasharray: none !important;
            stroke-linecap: round;
            stroke-linejoin: round;
            stroke: #2ecc71;
            stroke-width: 6;
            stroke-opacity: 0.9;
            filter: drop-shadow(0 0 3px rgba(46, 204, 113, 0.3));
        }
        .leaflet-marker-icon {
            filter: drop-shadow(0 0 3px rgba(0,0,0,0.3));
        }
        #map {
            filter: brightness(0.95) saturate(0.9) contrast(1.05);
        }
        #map:hover {
            filter: brightness(0.95) saturate(0.9) contrast(1.05);
        }
    `;
    document.head.appendChild(style);

    // Aggiungi marker di partenza
    L.marker([routeData.partenza.coords.lat, routeData.partenza.coords.lon], {
        icon: startIcon
    }).addTo(map).bindPopup("Partenza: " + routeData.partenza.search);

    // Aggiungi marker di arrivo
    L.marker([routeData.arrivo.coords.lat, routeData.arrivo.coords.lon], {
        icon: endIcon
    }).addTo(map).bindPopup("Arrivo: " + routeData.arrivo.search);

    // Aggiungi marker per le tappe
    routeData.tappe.forEach((tappa, index) => {
        L.marker([tappa.coords.lat, tappa.coords.lon], {
            icon: waypointIcon
        }).addTo(map).bindPopup(tappa.nome + ": " + tappa.descrizione);
    });

    // Crea punti di percorso per Leaflet Routing Machine
    const waypoints = [
        L.latLng(routeData.partenza.coords.lat, routeData.partenza.coords.lon)
    ];

    // Aggiungi le tappe come waypoints
    routeData.tappe.forEach(tappa => {
        waypoints.push(L.latLng(tappa.coords.lat, tappa.coords.lon));
    });

    // Aggiungi il punto di arrivo
    waypoints.push(L.latLng(routeData.arrivo.coords.lat, routeData.arrivo.coords.lon));

    // Crea routing control con stile personalizzato
    routeControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        show: false,
        lineOptions: {
            styles: [
                {
                    color: '#2ecc71',
                    opacity: 0.9,
                    weight: 6,
                    className: 'leaflet-routing-line'
                }
            ]
        },
        createMarker: function() { return null; }
    }).addTo(map);

    // Nascondi il pannello delle indicazioni stradali
    routeControl.on('routesfound', function(e) {
        const routes = e.routes;
        const route = routes[0];
        
        // Salva punti del percorso
        stepPoints = route.coordinates;
        
        // Calcola distanza
        distance = (route.summary.totalDistance / 1000).toFixed(1); // km
        
        // Calcola il tempo reale in base alla distanza e velocità
        const speedKmh = SPEED[modalita];
        realTimeSeconds = Math.round((parseFloat(distance) / speedKmh) * 3600); // Tempo in secondi
        
        // Calcola calorie bruciate
        const durationHours = realTimeSeconds / 3600;
        caloriesBurned = Math.round(MET[modalita] * weight * durationHours);
        
        // Aggiorna UI
        document.getElementById('lunghezza').textContent = distance + ' km';
        document.getElementById('durata').textContent = secondsToTime(realTimeSeconds);
        document.getElementById('calorie').textContent = caloriesBurned + ' cal';
        document.getElementById('modalita').textContent = modalita;
        
        // Crea marker mobile per simulazione
        markerMobile = L.marker(stepPoints[0], {
            icon: mobileIcon
        }).addTo(map);
        
        // Prepara la UI per le tappe
        createStepTabs();
    });
}

// Converti secondi in formato "Xh Ym Zs"
function secondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return hours + 'h ' + minutes + 'm ' + secs + 's';
}

// Crea le tab per le tappe
function createStepTabs() {
    const stepBar = document.getElementById('step-bar');
    stepBar.innerHTML = '';
    
    // Aggiungi tab per partenza
    const startBtn = document.createElement('button');
    startBtn.className = 'step';
    startBtn.textContent = 'Partenza';
    startBtn.dataset.index = -1;
    if (tappeCompletate.length === 0) {
        startBtn.classList.add('active');
        document.getElementById('tappa-desc').textContent = routeData.partenza.desc;
        startBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    startBtn.addEventListener('click', function() {
        const tappa = routeData.partenza;
        document.getElementById('tappa-desc').textContent = tappa.desc;
        document.getElementById('tappa-desc').classList.add('active');
        isFollowingMarker = false;
        map.setView([tappa.coords.lat, tappa.coords.lon], 19);
        this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setTimeout(() => {
            document.getElementById('tappa-desc').classList.remove('active');
        }, 800);
    });
    stepBar.appendChild(startBtn);
    
    // Aggiungi tab per ogni tappa
    routeData.tappe.forEach((tappa, index) => {
        const stepBtn = document.createElement('button');
        stepBtn.className = 'step';
        stepBtn.textContent = tappa.nome;
        stepBtn.dataset.index = index;
        
        if (tappeCompletate.includes(index)) {
            stepBtn.classList.add('active');
        }
        
        stepBtn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            document.getElementById('tappa-desc').textContent = routeData.tappe[index].descrizione;
            document.getElementById('tappa-desc').classList.add('active');
            const tappa = routeData.tappe[index];
            isFollowingMarker = false;
            map.setView([tappa.coords.lat, tappa.coords.lon], 19);
            this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            setTimeout(() => {
                document.getElementById('tappa-desc').classList.remove('active');
            }, 800);
        });
        
        stepBar.appendChild(stepBtn);
    });

    // Aggiungi tab per arrivo
    const endBtn = document.createElement('button');
    endBtn.className = 'step';
    endBtn.textContent = 'Arrivo';
    endBtn.dataset.index = -2;
    if (tappeCompletate.length === routeData.tappe.length) {
        endBtn.classList.add('active');
        document.getElementById('tappa-desc').textContent = routeData.arrivo.desc;
        endBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    endBtn.addEventListener('click', function() {
        const tappa = routeData.arrivo;
        document.getElementById('tappa-desc').textContent = tappa.desc;
        document.getElementById('tappa-desc').classList.add('active');
        isFollowingMarker = false;
        map.setView([tappa.coords.lat, tappa.coords.lon], 19);
        this.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setTimeout(() => {
            document.getElementById('tappa-desc').classList.remove('active');
        }, 800);
    });
    stepBar.appendChild(endBtn);

    updateNextCheckpointBox();
}

// Aggiorna il box della prossima tappa
function updateNextCheckpointBox() {
    const prossimaTappa = document.getElementById('prossima-tappa');
    
    if (tappeCompletate.length < routeData.tappe.length) {
        const nextIndex = tappeCompletate.length;
        prossimaTappa.querySelector('.popup-content').innerHTML = 
            routeData.tappe[nextIndex].nome + ' <span class="loading-dots"></span>';
        prossimaTappa.classList.add('active');
    } else if (tappeCompletate.length === routeData.tappe.length && !isDestinationReached) {
        prossimaTappa.querySelector('.popup-content').innerHTML = 
            'Arrivo <span class="loading-dots"></span>';
        prossimaTappa.classList.add('active');
    } else {
        prossimaTappa.classList.remove('active');
    }
}

// Funzione di easing per movimento più naturale
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// Aggiorna la rotazione del marker in base alla direzione
function updateMarkerRotation(newPosition, oldPosition) {
    const dx = newPosition[1] - oldPosition[1];
    const dy = newPosition[0] - oldPosition[0];
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    const icon = markerMobile.getIcon();
    icon.options.rotationAngle = angle;
    markerMobile.setIcon(icon);
}

// Funzione per validare una tappa
function validateCheckpoint(checkpoint, index) {
    const stepButtons = document.querySelectorAll('.step');
    const buttonIndex = index === -1 ? 0 : (index === -2 ? stepButtons.length - 1 : index + 1);
    
    if (stepButtons[buttonIndex]) {
        stepButtons[buttonIndex].classList.add('active');
        document.getElementById('tappa-desc').textContent = 
            index === -1 ? checkpoint.desc : 
            index === -2 ? checkpoint.desc : 
            checkpoint.descrizione;
        
        stepButtons[buttonIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    
    const tappaRaggiunta = document.getElementById('tappa-raggiunta');
    tappaRaggiunta.querySelector('.popup-content').textContent = 
        (index === -1 ? 'Partenza' : 
         index === -2 ? 'Arrivo' : 
         checkpoint.nome) + ' ✓';
    tappaRaggiunta.classList.add('active');
    
    setTimeout(() => {
        tappaRaggiunta.classList.remove('active');
    }, 3000);
    
    updateNextCheckpointBox();
}

// Controlla se il marker è vicino a una tappa
function checkWaypointProximity(position) {
    const currentLatLng = L.latLng(position);
    let checkpointReached = false;
    
    routeData.tappe.forEach((tappa, index) => {
        if (!tappeCompletate.includes(index)) {
            const tappaLatLng = L.latLng(tappa.coords.lat, tappa.coords.lon);
            const distance = currentLatLng.distanceTo(tappaLatLng);
            
            if (distance < 50) {
                tappeCompletate.push(index);
                validateCheckpoint(tappa, index);
                checkpointReached = true;
            }
        }
    });

    const destinationLatLng = L.latLng(routeData.arrivo.coords.lat, routeData.arrivo.coords.lon);
    const distanceToDestination = currentLatLng.distanceTo(destinationLatLng);
    
    if (distanceToDestination < 50 && !isDestinationReached && tappeCompletate.length === routeData.tappe.length) {
        isDestinationReached = true;
        validateCheckpoint(routeData.arrivo, -2);
        checkpointReached = true;
    }

    return checkpointReached;
}

// Mostra popup di completamento
function showCompletionPopup() {
    document.getElementById('popup-overlay').classList.add('active');
    document.getElementById('popup-finale').classList.add('active');
}

// Funzione per aggiornare i valori in tempo reale
function updateRealTimeValues(timestamp) {
    if (!isPaused) {
        const elapsed = timestamp - animationStartTime - totalPausedTime;
        const progress = Math.min(1, elapsed / baseDuration);
        
        // Aggiorna la distanza percorsa
        const currentDistance = totalDistance * progress;
        document.getElementById('distanza-percorsa').textContent = currentDistance.toFixed(1) + ' km';
        
        // Calcola e aggiorna il tempo trascorso
        const elapsedSeconds = Math.floor(elapsed / 1000);
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = Math.floor(elapsedSeconds % 60);
        document.getElementById('tempo-trasorso').textContent = 
            (hours > 0 ? hours + 'h ' : '') + 
            (minutes > 0 ? minutes + 'm ' : '') + 
            seconds + 's';
        
        // Calcola e aggiorna i passi (circa 1300 passi per km)
        const steps = Math.round(currentDistance * 1300);
        document.getElementById('passi').textContent = steps.toLocaleString();
    }
}

// Animazione del marker mobile lungo il percorso
function animateMarker() {
    // Calcola la durata totale in base alla distanza e velocità
    const speedKmh = SPEED[modalita]; // Velocità in km/h
    const totalDistance = parseFloat(distance); // Distanza totale in km
    const baseDuration = (realTimeSeconds * 1000) / 50; // Tempo di simulazione (1/50 del tempo reale)
    const checkpointPause = 2000; // 2 secondi di pausa per tappa
    
    let currentPointIndex = 0;
    let lastPosition = stepPoints[0];
    const startTime = performance.now();
    let isAnimating = true;
    let isPaused = false;
    let pauseStartTime = 0;
    let totalPausedTime = 0;
    let lastRealTime = 0;
    
    // Mostra il box della prossima tappa all'inizio
    if (routeData.tappe.length > 0) {
        document.getElementById('prossima-tappa').classList.add('active');
        document.getElementById('prossima-tappa').querySelector('.popup-content').innerHTML = 
            routeData.tappe[0].nome + ' <span class="loading-dots"></span>';
    }
    
    // Valida la tappa di partenza
    validateCheckpoint(routeData.partenza, -1);
    
    // Funzione di animazione
    function animate(timestamp) {
        if (!isAnimating) return;
        
        if (isPaused) {
            if (timestamp - pauseStartTime >= checkpointPause) {
                isPaused = false;
                totalPausedTime += checkpointPause;
            } else {
                requestAnimationFrame(animate);
                return;
            }
        }
        
        const elapsed = timestamp - startTime - totalPausedTime;
        const progress = Math.min(1, elapsed / baseDuration);
        
        // Calcola l'indice del punto corrente
        const currentPointIndex = Math.floor(progress * (stepPoints.length - 1));
        
        if (currentPointIndex < stepPoints.length - 1) {
            const currentPoint = stepPoints[currentPointIndex];
            const nextPoint = stepPoints[currentPointIndex + 1];
            
            // Calcola la posizione intermedia con easing più fluido
            const segmentProgress = (progress * (stepPoints.length - 1)) % 1;
            const easedProgress = easeInOutQuad(segmentProgress);
            
            // Calcola la posizione intermedia con più dettaglio
            const lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * easedProgress;
            const lng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * easedProgress;
            
            // Aggiorna la posizione del marker con movimento fluido
            markerMobile.setLatLng([lat, lng]);
            
            // Aggiorna la vista della mappa con zoom adattivo
            const currentZoom = map.getZoom();
            const targetZoom = 19;
            const zoomProgress = Math.min(1, progress * 2);
            const newZoom = currentZoom + (targetZoom - currentZoom) * zoomProgress;
            map.setView([lat, lng], newZoom);
            
            // Aggiorna i valori in tempo reale
            const distanceTraveled = totalDistance * progress;
            document.getElementById('distanza-percorsa').textContent = distanceTraveled.toFixed(1) + ' km';
            
            // Calcola il tempo trascorso in base al tempo reale
            const currentRealTime = Math.floor(progress * realTimeSeconds);
            if (currentRealTime !== lastRealTime) {
                lastRealTime = currentRealTime;
                document.getElementById('tempo-trasorso').textContent = secondsToTime(currentRealTime);
            }
            
            document.getElementById('passi').textContent = Math.round(distanceTraveled * 1300).toLocaleString();
            
            // Controlla se siamo vicino a una tappa
            const checkpointReached = checkWaypointProximity([lat, lng]);
            if (checkpointReached && !isPaused) {
                isPaused = true;
                pauseStartTime = timestamp;
                
                // Mostra la notifica della tappa raggiunta
                document.getElementById('tappa-raggiunta').classList.add('active');
                setTimeout(() => {
                    document.getElementById('tappa-raggiunta').classList.remove('active');
                }, checkpointPause - 500);
            }
            
            requestAnimationFrame(animate);
        } else {
            // Percorso completato
            markerMobile.setLatLng(stepPoints[stepPoints.length - 1]);
            validateCheckpoint(routeData.arrivo, -2);
            showCompletionPopup();
            
            // Aggiorna i valori finali
            document.getElementById('distanza-percorsa').textContent = totalDistance.toFixed(1) + ' km';
            document.getElementById('tempo-trasorso').textContent = secondsToTime(realTimeSeconds);
            document.getElementById('passi').textContent = Math.round(totalDistance * 1300).toLocaleString();
            
            isAnimating = false;
        }
    }
    
    // Avvia animazione
    requestAnimationFrame(animate);
}

// Toggle animazione
function toggleAnimation() {
    const avviaBtn = document.getElementById('avvia-btn');
    
    if (animationInProgress) {
        animationInProgress = false;
        avviaBtn.textContent = 'AVVIA';
    } else {
        animationInProgress = true;
        avviaBtn.textContent = 'PAUSA';
        animateMarker();
    }
}

// Reset simulation
function resetSimulation() {
    animationInProgress = false;
    tappeCompletate = [];
    currentStep = 0;
    isDestinationReached = false;
    
    document.getElementById('avvia-btn').textContent = 'AVVIA';
    document.getElementById('tappa-raggiunta').classList.remove('active');
    document.getElementById('prossima-tappa').classList.remove('active');
    document.getElementById('popup-overlay').classList.remove('active');
    document.getElementById('popup-finale').classList.remove('active');
    
    document.getElementById('distanza-percorsa').textContent = '0.0 km';
    document.getElementById('tempo-trasorso').textContent = '0h 0m 0s';
    document.getElementById('passi').textContent = '0';
    
    if (markerMobile && stepPoints.length > 0) {
        markerMobile.setLatLng(stepPoints[0]);
        map.setView(stepPoints[0], 14);
    }
    
    createStepTabs();
}

// Torna alla home
function goToHomePage() {
    window.location.href = '../creailtuopercorso/crea.html';
}

// Gestione del caricamento Lottie
function initLoadingAnimation() {
    const loadingAnimation = document.getElementById('loading-animation');
    const loadingFallback = document.getElementById('loading-fallback');
    
    // Verifica se Lottie è supportato
    if (typeof lottie === 'undefined') {
        loadingAnimation.style.display = 'none';
        loadingFallback.style.display = 'block';
        return;
    }
    
    // Verifica se il file JSON è accessibile
    fetch('../Assets/Load2.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('File JSON non accessibile');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Errore nel caricamento dell\'animazione:', error);
            loadingAnimation.style.display = 'none';
            loadingFallback.style.display = 'block';
        });
}

// Inizializzazione al caricamento della pagina
document.addEventListener('DOMContentLoaded', function() {
    const loadingScreen = document.getElementById('loading-screen');
    
    // Mostra il nome del percorso
    document.getElementById('route-name').textContent = routeData.nome;
    
    // Inizializza la mappa
    initMap();
    
    // Inizializza i puntini di caricamento
    initLoadingDots();
    
    // Mostra il box delle informazioni in tempo reale
    document.getElementById('info-tempo-reale').classList.add('active');
    
    // Aggiungi event listener per i pulsanti
    document.getElementById('avvia-btn').addEventListener('click', toggleAnimation);
    document.getElementById('esci-btn').addEventListener('click', goToHomePage);
    document.getElementById('ripeti-btn').addEventListener('click', resetSimulation);
    document.getElementById('fine-btn').addEventListener('click', goToHomePage);

    // Nascondi lo schermo di caricamento dopo 5 secondi
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }, 5000);
});

// Gestione funzionalità dei puntini di caricamento
function initLoadingDots() {
    const style = document.createElement('style');
    style.innerHTML = `
        .loading-dots::after {
            content: ".";
            animation: loadingDots 1.5s infinite;
        }
    `;
    document.head.appendChild(style);
}

// Aggiungi event listener per il click sulla mappa
map.on('click', function() {
    isFollowingMarker = false;
});

// Aggiungi event listener per il doppio click sulla mappa
map.on('dblclick', function() {
    isFollowingMarker = true;
});
