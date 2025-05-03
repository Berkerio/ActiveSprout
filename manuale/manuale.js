document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const screens = document.querySelectorAll('.screen');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    const currentPageSpan = document.getElementById('current-page');
    const pageDots = document.querySelectorAll('.page-dot');
    
    // Stato corrente
    let currentScreen = 1;
    const totalScreens = screens.length;
    
    // Funzione per mostrare una schermata specifica
    function showScreen(screenNumber) {
        // Nascondi tutte le schermate
        screens.forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Mostra la schermata corrente
        const targetScreen = document.querySelector(`.screen[data-screen="${screenNumber}"]`);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        
        // Aggiorna il contatore di pagina
        currentPageSpan.textContent = screenNumber;
        
        // Aggiorna i pulsanti di navigazione
        prevButton.disabled = screenNumber === 1;
        nextButton.disabled = screenNumber === totalScreens;
        
        // Aggiorna i pallini di navigazione
        pageDots.forEach(dot => {
            dot.classList.remove('active');
            if (parseInt(dot.getAttribute('data-page')) === screenNumber) {
                dot.classList.add('active');
            }
        });
        
        // Aggiorna lo stato corrente
        currentScreen = screenNumber;
    }
    
    // Event listener per il pulsante precedente
    prevButton.addEventListener('click', function() {
        if (currentScreen > 1) {
            showScreen(currentScreen - 1);
        }
    });
    
    // Event listener per il pulsante successivo
    nextButton.addEventListener('click', function() {
        if (currentScreen < totalScreens) {
            showScreen(currentScreen + 1);
        }
    });
    
    // Event listener per i pallini di navigazione
    pageDots.forEach(dot => {
        dot.addEventListener('click', function() {
            const pageNumber = parseInt(this.getAttribute('data-page'));
            showScreen(pageNumber);
        });
    });
    
    // Supporto per la navigazione con tastiera
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') {
            if (currentScreen > 1) {
                showScreen(currentScreen - 1);
            }
        } else if (event.key === 'ArrowRight') {
            if (currentScreen < totalScreens) {
                showScreen(currentScreen + 1);
            }
        }
    });
    
    // Inizializza mostrando la prima schermata
    showScreen(1);
});