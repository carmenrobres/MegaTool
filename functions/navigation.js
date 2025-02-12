document.getElementById("openSidebar").addEventListener("click", function() {
    document.getElementById("sidebar").classList.add("open");
});

document.getElementById("closeSidebar").addEventListener("click", function() {
    document.getElementById("sidebar").classList.remove("open");
});

function navigateTo(pageId) {
    document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
    document.getElementById(pageId).classList.remove("hidden");
    localStorage.setItem("lastPage", pageId);
}

// Load last visited page
window.onload = function() {
    const savedPage = localStorage.getItem("lastPage") || "landing";
    navigateTo(savedPage);
};
