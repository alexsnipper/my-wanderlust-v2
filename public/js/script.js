(() => {
  "use strict";

  const searchInput = document.querySelector(".search-inp");
  const listings = document.querySelectorAll(".listing-card");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase();

      listings.forEach((listing) => {
        const titleElement = listing.querySelector(".card-text b");

        if (titleElement) {
          const title = titleElement.textContent.toLowerCase();

          if (title.includes(query)) {
            listing.classList.remove("d-none"); 
          } else {
            listing.classList.add("d-none");
          }
        }
      });
    });
  }

  window.validateFileSize = function (input) {
    const file = input.files[0];
    const errorDiv = document.getElementById("fileError");

    if (file && file.size > 2 * 1024 * 1024) {
      input.classList.add("is-invalid");
      errorDiv.style.display = "block";
      input.value = "";
    } else {
      input.classList.remove("is-invalid");
      errorDiv.style.display = "none";
    }
  };
})();
