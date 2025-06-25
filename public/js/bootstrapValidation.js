(() => {
  "use strict";
  const forms = document.querySelectorAll(".needs-validation");

  Array.from(forms).forEach((form) => {
    form.addEventListener("submit", (event) => {
      const fileInput = form.querySelector('input[type="file"]');
      const file = fileInput?.files[0];
      const errorDiv = fileInput?.nextElementSibling;

      // Mark the form as validated
      form.classList.add("was-validated");

      // Validate image size (max 2MB)
      if (file && file.size > 2 * 1024 * 1024) {
        fileInput.classList.add("is-invalid");
        if (errorDiv && errorDiv.classList.contains("invalid-feedback")) {
          errorDiv.style.display = "block";
        }
        fileInput.value = ""; // Clear the file input
        event.preventDefault();
        event.stopPropagation();
        return;
      } else {
        fileInput.classList.remove("is-invalid");
        if (errorDiv && errorDiv.classList.contains("invalid-feedback")) {
          errorDiv.style.display = "none";
        }
      }

      // Perform Bootstrap's built-in validation
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });
})();
