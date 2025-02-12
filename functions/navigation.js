// Single event listener for DOM loading
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar controls
    document.getElementById("openSidebar")?.addEventListener("click", function() {
        document.getElementById("sidebar").classList.add("open");
    });

    document.getElementById("closeSidebar")?.addEventListener("click", function() {
        document.getElementById("sidebar").classList.remove("open");
    });

    // Load last visited page or default to landing
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
});

// Global navigation function
window.navigateTo = function(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.add("hidden");
        page.classList.remove("active");
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove("hidden");
        targetPage.classList.add("active");
        localStorage.setItem("lastPage", pageId);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
});


// Load last visited page
window.onload = function() {
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
};
