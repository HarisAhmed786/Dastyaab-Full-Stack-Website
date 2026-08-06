function updateNavbar() {
    const token = localStorage.getItem('token');
    const guestLinks = document.querySelectorAll('.guest-link');
    const authLinks = document.querySelectorAll('.auth-link');

    if (token) {

        guestLinks.forEach(l => l.style.display = 'none');
        authLinks.forEach(l => l.style.display = 'block');
    } else {
        
        guestLinks.forEach(l => l.style.display = 'block');
        authLinks.forEach(l => l.style.display = 'none');
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

/**
 * Route guard for pages that require login (dashboard, history, profile,
 * messages). Call this at the top of the page's script — if there's no
 * token, it redirects to login immediately instead of letting the page
 * render and then fail on its first API call.
 *
 * Usage: requireLogin();                 -> any logged-in user
 *        requireLogin("provider");       -> only that role may view this page
 */
function requireLogin(requiredRole) {
    const token = localStorage.getItem('token');
    const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();

    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    if (requiredRole && role !== requiredRole.toLowerCase()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', updateNavbar);