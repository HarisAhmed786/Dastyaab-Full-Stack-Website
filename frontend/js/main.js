

document.addEventListener("DOMContentLoaded", () => {
    const rawRole = localStorage.getItem("userRole");
    const token = localStorage.getItem("token");
    const role = rawRole ? rawRole.trim().toLowerCase() : null;

    const dashboardLink = document.getElementById("nav-dashboard");

    if (dashboardLink) {
        if (!token || !role) {
            dashboardLink.href = "login.html";
        } 
        else if (role === "provider") {
            dashboardLink.href = "dashboard.html";
            console.log("Nav updated to Provider");
        } 
        else if (role === "customer") {
            dashboardLink.href = "history.html";
            console.log("Nav updated to Customer");
        }
    }

   
    const loginLink = document.querySelector('a[href="login.html"]');
    if (loginLink && token) {
        loginLink.textContent = "Logout";
        loginLink.href = "#";
        loginLink.addEventListener("click", (e) => {
            e.preventDefault(); // Stop page from jumping
            localStorage.clear();
            window.location.href = "index.html";
        });
    }
});