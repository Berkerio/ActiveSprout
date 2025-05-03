document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lottie animation
    const loadingAnimation = lottie.loadAnimation({
        container: document.getElementById('lottie-loading'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '../Logo-icon.json'
    });

    // Set animation speed to complete one loop in 5 seconds
    loadingAnimation.setSpeed(0.6);

    // Hide loading overlay after 5 seconds with smooth transition
    setTimeout(() => {
        const loadingOverlay = document.querySelector('.loading-overlay');
        const loadingLogo = document.querySelector('.loading-logo');
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingOverlay && loadingLogo && loadingText) {
            // Add fade-out class to trigger the transition
            loadingOverlay.classList.add('fade-out');
            loadingLogo.classList.add('fade-out');
            loadingText.classList.add('fade-out');
            
            // Remove the overlay from DOM after transition completes
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 1000); // Match this with the transition duration in CSS
        }
    }, 5000);
}); 