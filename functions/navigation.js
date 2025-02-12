
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar controls
    document.getElementById("openSidebar")?.addEventListener("click", function() {
        document.getElementById("sidebar").classList.add("open");
    });

    document.getElementById("closeSidebar")?.addEventListener("click", function() {
        document.getElementById("sidebar").classList.remove("open");
    });

    // Global navigation function
    window.navigateTo = function(pageId) {
        document.querySelectorAll(".page").forEach(page => {
            page.style.display = 'none';
        });
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
            localStorage.setItem("lastPage", pageId);
        }
    };

    // Load initial page
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
});

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
