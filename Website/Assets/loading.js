document.addEventListener("DOMContentLoaded", () => {
  const loadingOverlay = document.querySelector(".loading-overlay");
  
  // Hide loading overlay after animation
  setTimeout(() => {
    loadingOverlay.classList.add("hidden");
  }, 4000);

  lottie.loadAnimation({
    container: document.getElementById('lottie-loading'),
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: '../Assets/icon.json' // Corrected path to the Lottie animation JSON file
  });
});