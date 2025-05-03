document.addEventListener("DOMContentLoaded", () => {
  const profileInput = document.getElementById("profile-upload");
  const profilePreview = document.getElementById("profile-preview");
  const validationMessage = document.querySelector(
    ".profile-validation-message",
  );

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

  // Load the image from local storage if it exists
  const savedImage = localStorage.getItem("profileImage");
  if (savedImage) {
    profilePreview.src = savedImage;
  }

  profileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError("Please select a valid image file (JPEG, PNG, or GIF)");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      showError("Image size should be less than 5MB");
      return;
    }

    // Preview image and save to local storage
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target.result;
      profilePreview.src = imageDataUrl;
      localStorage.setItem("profileImage", imageDataUrl);
      showSuccess("Image uploaded successfully!");
    };
    reader.onerror = () => {
      showError("Error reading the file");
    };
    reader.readAsDataURL(file);
  });

  function showError(message) {
    validationMessage.textContent = message;
    validationMessage.classList.remove("success");
  }

  function showSuccess(message) {
    validationMessage.textContent = "";
    validationMessage.classList.add("success");
  }
});