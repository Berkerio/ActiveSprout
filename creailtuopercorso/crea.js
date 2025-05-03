document.addEventListener('DOMContentLoaded', function() {
    // --- ELEMENTI DOM ---
    const routeNameInput = document.getElementById('route-name');
    const transportModeSelect = document.getElementById('transport-mode');
    const partenzaSearch = document.getElementById('partenza-search');
    const partenzaDesc = document.getElementById('partenza-desc');
    const arrivoSearch = document.getElementById('arrivo-search');
    const arrivoDesc = document.getElementById('arrivo-desc');
    const stopsContainer = document.getElementById('stops-container');
    const addStopBtn = document.getElementById('add-stop');
    const invioBtn = document.getElementById('invio-btn');
    const backBtn = document.getElementById('back-btn');
    const stopTemplate = document.getElementById('stop-template');

    // --- FULLSCREEN POPUP LOGIC ---
    const fullscreenOverlay = document.getElementById('fullscreen-overlay');
    const fullscreenContent = document.getElementById('fullscreen-card-content');
    const closeFullscreenBtn = document.querySelector('.close-fullscreen');
    const sectionCards = document.querySelectorAll('.section-card');

    // --- MANUALE D'USO ---
    const helpBtn = document.getElementById('help-btn');
    const helpOverlay = document.getElementById('help-overlay');
    const closeHelpBtn = document.querySelector('.close-help');

    // --- DATI ---
    let routeData = {
        nome: '',
        modalita: '',
        partenza: { search: '', desc: '', coords: null },
        tappe: [],
        arrivo: { search: '', desc: '', coords: null }
    };

    // --- CARICA DATI DA LOCALSTORAGE ---
    const saved = localStorage.getItem('routeData');
    if (saved) {
        try {
            routeData = JSON.parse(saved);
        } catch (e) {
            localStorage.removeItem('routeData');
        }
    }

    // --- POPOLA FORM SE DATI PRESENTI ---
    routeNameInput.value = routeData.nome || '';
    transportModeSelect.value = routeData.modalita || '';
    partenzaSearch.value = routeData.partenza.search || '';
    partenzaDesc.value = routeData.partenza.desc || '';
    arrivoSearch.value = routeData.arrivo.search || '';
    arrivoDesc.value = routeData.arrivo.desc || '';
    stopsContainer.innerHTML = '';
    if (routeData.tappe && Array.isArray(routeData.tappe)) {
        routeData.tappe.forEach(tappa => addStopCard(tappa));
    }

    // --- EVENTI INPUT ---
    routeNameInput.addEventListener('input', e => {
        routeData.nome = e.target.value;
        saveData();
    });
    transportModeSelect.addEventListener('change', e => {
        routeData.modalita = e.target.value;
        saveData();
    });
    partenzaSearch.addEventListener('input', e => {
        routeData.partenza.search = e.target.value;
        routeData.partenza.coords = null;
        saveData();
        searchLocation(e.target, coords => {
            routeData.partenza.coords = coords;
            saveData();
        });
    });
    partenzaDesc.addEventListener('input', e => {
        routeData.partenza.desc = e.target.value;
        saveData();
    });
    arrivoSearch.addEventListener('input', e => {
        routeData.arrivo.search = e.target.value;
        routeData.arrivo.coords = null;
        saveData();
        searchLocation(e.target, coords => {
            routeData.arrivo.coords = coords;
            saveData();
        });
    });
    arrivoDesc.addEventListener('input', e => {
        routeData.arrivo.desc = e.target.value;
        saveData();
    });

    // --- TAPPE ---
    addStopBtn.addEventListener('click', () => {
        if (stopsContainer.children.length >= 5) {
            alert('Puoi aggiungere al massimo 5 tappe');
            return;
        }
        addStopCard();
    });

    function addStopCard(tappa = { nome: '', search: '', desc: '', coords: null }) {
        const stopCard = stopTemplate.content.cloneNode(true);
        const card = stopCard.querySelector('.stop-card');
        const nameInput = card.querySelector('.stop-name');
        const searchInput = card.querySelector('.tappa-search');
        const descInput = card.querySelector('.tappa-desc');
        const removeBtn = card.querySelector('.remove-stop');
        
        nameInput.value = tappa.nome || '';
        searchInput.value = tappa.search || '';
        descInput.value = tappa.desc || '';
        card._coords = tappa.coords || null;

        // Aggiungi gestore per la ricerca nella tappa
        searchInput.addEventListener('input', e => {
            card._coords = null;
            updateAllStops();
            searchLocation(e.target, coords => {
                card._coords = coords;
                updateAllStops();
            }, card);
        });

        nameInput.addEventListener('input', updateAllStops);
        descInput.addEventListener('input', updateAllStops);
        
        removeBtn.addEventListener('click', () => {
            card.remove();
            updateAllStops();
        });

        // Aggiungi la card al container appropriato
        const stopsContainer = document.querySelector('.stops-container');
        if (stopsContainer) {
            stopsContainer.appendChild(card);
        }
        
        updateAllStops();
    }

    function updateAllStops() {
        const tappe = [];
        Array.from(stopsContainer.children).forEach(card => {
            const nome = card.querySelector('.stop-name').value.trim();
            const search = card.querySelector('.tappa-search').value.trim();
            const desc = card.querySelector('.tappa-desc').value.trim();
            const coords = card._coords || null;
            // Salva solo tappe compilate (nome o zona)
            if (nome || search || desc) {
                tappe.push({ nome, search, desc, coords });
            }
        });
        routeData.tappe = tappe;
        saveData();
    }

    // --- RICERCA LUOGHI ---
    function searchLocation(input, onSelect, cardRef = null) {
        const query = input.value.trim();
        let resultsContainer = null;
        
        // Trova il container dei risultati appropriato
        if (input.classList.contains('tappa-search') && cardRef) {
            resultsContainer = cardRef.querySelector('.search-results');
        } else {
            resultsContainer = input.parentElement.querySelector('.search-results');
        }
        
        if (!resultsContainer) return;
        
        // Gestione della visibilità dei risultati
        if (query.length < 3) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('active');
            return;
        }
        
        // Mostra il loading
        resultsContainer.innerHTML = '<div class="search-result loading">Ricerca in corso...</div>';
        resultsContainer.classList.add('active');
        
        // Debounce della ricerca
        clearTimeout(input._searchTimeout);
        input._searchTimeout = setTimeout(() => {
            fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&lang=it&limit=5&filter=countrycode:it&apiKey=a4d68e0fb9c34634bcdbc98b2ae964a7`)
                .then(r => r.json())
                .then(data => {
                    resultsContainer.innerHTML = '';
                    
                    if (!data.features || data.features.length === 0) {
                        resultsContainer.innerHTML = '<div class="search-result">Nessun risultato trovato</div>';
                        return;
                    }
                    
                    data.features.forEach(place => {
                        const div = document.createElement('div');
                        div.className = 'search-result';
                        div.textContent = place.properties.formatted;
                        
                        div.addEventListener('click', () => {
                            input.value = place.properties.formatted;
                            resultsContainer.classList.remove('active');
                            
                            if (typeof onSelect === 'function') {
                                onSelect({
                                    lat: place.geometry.coordinates[1],
                                    lon: place.geometry.coordinates[0],
                                    formatted: place.properties.formatted
                                });
                            }
                        });
                        
                        resultsContainer.appendChild(div);
                    });
                })
                .catch(() => {
                    resultsContainer.innerHTML = '<div class="search-result error">Errore nella ricerca</div>';
                });
        }, 300); // Debounce di 300ms
    }

    // Aggiungi gestori di eventi per la ricerca
    function setupSearchInputs() {
        // Partenza
        const partenzaSearch = document.getElementById('partenza-search');
        if (partenzaSearch) {
            partenzaSearch.addEventListener('input', e => {
                routeData.partenza.search = e.target.value;
                routeData.partenza.coords = null;
                saveData();
                searchLocation(e.target, coords => {
                    routeData.partenza.coords = coords;
                    saveData();
                });
            });
        }

        // Arrivo
        const arrivoSearch = document.getElementById('arrivo-search');
        if (arrivoSearch) {
            arrivoSearch.addEventListener('input', e => {
                routeData.arrivo.search = e.target.value;
                routeData.arrivo.coords = null;
                saveData();
                searchLocation(e.target, coords => {
                    routeData.arrivo.coords = coords;
                    saveData();
                });
            });
        }

        // Chiudi i risultati quando si clicca fuori
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                document.querySelectorAll('.search-results').forEach(container => {
                    container.classList.remove('active');
                });
            }
        });
    }

    // Chiama la funzione di setup all'avvio
    setupSearchInputs();

    // --- VALIDAZIONE E INVIO ---
    invioBtn.addEventListener('click', e => {
        e.preventDefault();
        if (!validateForm()) return;
        saveData();
        window.location.href = '../mapcrea/MappaCrea.html';
    });

    function validateForm() {
        const errors = [];
        if (!routeData.nome.trim()) errors.push('Il nome del percorso è obbligatorio');
        if (!routeData.modalita) errors.push('Seleziona una modalità di trasporto');
        if (!routeData.partenza.search.trim()) errors.push('La partenza è obbligatoria');
        if (!routeData.arrivo.search.trim()) errors.push('L\'arrivo è obbligatorio');
        // Se compilata, la tappa deve avere almeno la zona
        routeData.tappe.forEach((tappa, i) => {
            if ((tappa.nome || tappa.desc) && !tappa.search) {
                errors.push(`La tappa ${i+1} richiede una zona`);
            }
        });
        if (errors.length) {
            alert(errors.join('\n'));
            return false;
        }
        return true;
    }

    // --- BACK BUTTON ---
    backBtn.addEventListener('click', () => window.location.href = '../HOME/homepage.html');

    // --- SALVATAGGIO ---
    function saveData() {
        localStorage.setItem('routeData', JSON.stringify(routeData));
    }

    // --- FULLSCREEN POPUP LOGIC ---
    sectionCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('button, .remove-stop, .add-stop, .search-result')) return;
            
            // Add expanded class to the card
            card.classList.add('expanded');
            
            // Clear and prepare the fullscreen content
            fullscreenContent.innerHTML = '';
            
            if (card.id === 'tappe-card') {
                // For stops, we'll use the original container
                const stopsContainer = card.querySelector('.stops-container');
                const addStopBtn = card.querySelector('.add-stop');
                
                // Create a wrapper for the stops
                const stopsWrapper = document.createElement('div');
                stopsWrapper.className = 'stops-wrapper';
                
                // Move the stops container to the popup
                stopsWrapper.appendChild(stopsContainer);
                fullscreenContent.appendChild(stopsWrapper);
                
                // Move the add button
                if (addStopBtn) {
                    stopsWrapper.appendChild(addStopBtn);
                }
                
                // Reattach event listeners for search in stops
                stopsContainer.querySelectorAll('.tappa-search').forEach(input => {
                    input.addEventListener('input', e => {
                        const stopCard = e.target.closest('.stop-card');
                        searchLocation(e.target, coords => {
                            stopCard._coords = coords;
                            updateAllStops();
                        }, stopCard);
                    });
                });
            } else {
                // For departure and arrival, clone the content
                const cardContent = card.cloneNode(true);
                cardContent.classList.remove('expanded');
                fullscreenContent.appendChild(cardContent);
                
                // Reattach search functionality
                const searchInput = cardContent.querySelector('input[type="text"]');
                if (searchInput) {
                    searchInput.addEventListener('input', e => {
                        const originalInput = card.querySelector('input[type="text"]');
                        originalInput.value = e.target.value;
                        searchLocation(originalInput, coords => {
                            if (card.id === 'partenza-card') {
                                routeData.partenza.coords = coords;
                            } else {
                                routeData.arrivo.coords = coords;
                            }
                            saveData();
                        });
                    });
                }
            }
            
            // Show the overlay
            fullscreenOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    });

    closeFullscreenBtn.addEventListener('click', closeFullscreen);
    fullscreenOverlay.addEventListener('click', function(e) {
        if (e.target === fullscreenOverlay) closeFullscreen();
    });

    function closeFullscreen() {
        // Remove expanded class from all cards
        sectionCards.forEach(card => {
            card.classList.remove('expanded');
        });
        
        // If we have a stops container in the popup, move it back
        const stopsWrapper = fullscreenContent.querySelector('.stops-wrapper');
        if (stopsWrapper) {
            const stopsContainer = stopsWrapper.querySelector('.stops-container');
            const addStopBtn = stopsWrapper.querySelector('.add-stop');
            const tappeCard = document.getElementById('tappe-card');
            
            if (stopsContainer && tappeCard) {
                tappeCard.appendChild(stopsContainer);
            }
            if (addStopBtn && tappeCard) {
                tappeCard.appendChild(addStopBtn);
            }
        }
        
        fullscreenOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // --- MANUALE D'USO ---
    helpBtn.addEventListener('click', () => {
        helpOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    closeHelpBtn.addEventListener('click', () => {
        helpOverlay.style.display = 'none';
        document.body.style.overflow = '';
    });

    helpOverlay.addEventListener('click', (e) => {
        if (e.target === helpOverlay) {
            helpOverlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
});