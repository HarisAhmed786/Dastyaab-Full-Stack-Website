const providerId = localStorage.getItem("userId");

document.addEventListener("DOMContentLoaded", () => {
    if (!requireLogin()) return;

    // 1. Initialize Page
    fetchProfile();
    fetchAndRenderReviews();
    setupImagePreview();

    // 2. Handle Form Submission
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
        profileForm.onsubmit = handleProfileUpdate;
    }
});

// --- 1. FETCH & RENDER PROFILE ---
async function fetchProfile() {
    try {
        const data = await window.api.get(`/providers/${providerId}`);

        {
            // A. Update Sidebar Text
            document.getElementById("display-name").textContent = data.name || "User Name";
            document.getElementById("display-service").textContent = data.service || "Service Provider";
            
            // B. Update Sidebar Stars & Stats
            const avgRating = data.avgRating || 0;
            document.getElementById("display-avg-rating").textContent = avgRating.toFixed(1);
            document.getElementById("display-stars").innerHTML = generateStarHTML(avgRating);
            
            // C. Update Jobs Done & Response (New Logic)
            document.getElementById("display-jobs").textContent = data.jobsDone || 0;
            document.getElementById("display-response").textContent = data.responseTime || "Fast";

            // D. Set Profile Image
            const defaultAvatar = `https://ui-avatars.com/api/?name=${data.name}&background=f36d38&color=fff`;
            document.getElementById("profile-display-img").src = data.profilePic || defaultAvatar;

            // E. Fill Form Fields
            document.getElementById("form-name").value = data.name || "";
            document.getElementById("form-service").value = data.service || "";
            document.getElementById("form-contact").value = data.contact || "";
            document.getElementById("form-price").value = data.price || "";
            document.getElementById("form-bio").value = data.bio || "";

            // F. Handle Availability Checkboxes
            if (data.availability) {
                const checkboxes = document.querySelectorAll("#day-selector input");
                checkboxes.forEach(box => {
                    box.checked = data.availability.includes(box.value);
                });
            }

            // G. Render portfolio gallery
            renderPortfolio(data.portfolio || []);
        }
    } catch (err) {
        console.error("Failed to load profile:", err);
    }
}

// --- PORTFOLIO GALLERY ---
function renderPortfolio(items) {
    const grid = document.getElementById("portfolio-grid");
    if (!grid) return;

    if (!items.length) {
        grid.innerHTML = `<p style="grid-column:1/-1; color:var(--muted); font-size:0.85rem;">No photos yet — add one to build trust with customers.</p>`;
        return;
    }

    grid.innerHTML = items.map(item => `
        <div class="portfolio-thumb">
            <img src="${window.DASTYAAB_CONFIG.API_BASE_URL}${item.url}" alt="${escapeHtml(item.caption || 'Portfolio photo')}" loading="lazy">
            <button class="remove-btn" title="Remove" onclick="deletePortfolioItem('${item._id}')">&times;</button>
        </div>
    `).join("");
}

window.deletePortfolioItem = async function (itemId) {
    try {
        const data = await window.api.del(`/providers/${providerId}/portfolio/${itemId}`);
        renderPortfolio(data.portfolio || []);
        showToast("Photo removed.", "success");
    } catch (err) {
        showToast(err.message || "Could not remove photo.", "error");
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const uploadInput = document.getElementById("portfolio-upload");
    if (!uploadInput) return;

    uploadInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            showToast("Only JPG, PNG, or WEBP images are allowed.", "error");
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            showToast("Image must be under 8MB.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = await window.api.post(`/providers/${providerId}/portfolio`, {
                    base64: ev.target.result,
                    filename: file.name
                });
                renderPortfolio(data.portfolio || []);
                showToast("Photo added!", "success");
            } catch (err) {
                showToast(err.message || "Upload failed.", "error");
            }
            uploadInput.value = "";
        };
        reader.readAsDataURL(file);
    });
});

// --- 2. UPDATE PROFILE ---
async function handleProfileUpdate(e) {
    e.preventDefault();
    const saveBtn = document.getElementById("save-btn");
    const profileImg = document.getElementById("profile-display-img");

    saveBtn.textContent = "Saving...";
    saveBtn.disabled = true;

    // Collect Data
    const selectedDays = Array.from(document.querySelectorAll("#day-selector input:checked")).map(cb => cb.value);
    
    let profilePicToSave = profileImg.src;
    if (profilePicToSave.includes("ui-avatars.com")) profilePicToSave = "";

    const updatedData = {
        name: document.getElementById("form-name").value,
        service: document.getElementById("form-service").value,
        contact: document.getElementById("form-contact").value,
        price: Number(document.getElementById("form-price").value),
        bio: document.getElementById("form-bio").value,
        availability: selectedDays,
        profilePic: profilePicToSave
    };

    try {
        await window.api.put(`/providers/${providerId}`, updatedData);
        showToast("Profile updated successfully!", "success");
        localStorage.setItem("userName", updatedData.name);
        fetchProfile(); // Refresh sidebar UI
    } catch (err) {
        console.error("Save Error:", err);
        showToast(err.message || "Update failed.", "error");
    } finally {
        saveBtn.textContent = "Update My Profile";
        saveBtn.disabled = false;
    }
}

// --- 3. REVIEWS LOGIC ---
async function fetchAndRenderReviews() {
    const reviewsContainer = document.getElementById("profile-reviews-list");
    reviewsContainer.innerHTML = skeletonCards(2);
    try {
        const reviews = await window.api.get(`/reviews/${providerId}`);

        if (!reviews || reviews.length === 0) {
            reviewsContainer.innerHTML = emptyState({ icon: "⭐", title: "No reviews yet" });
            return;
        }

        document.getElementById("display-review-count").textContent = `(${reviews.length} Reviews)`;

        reviewsContainer.innerHTML = reviews.map(rev => `
            <div class="review-item" style="padding: 15px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong style="color: var(--ink);">${escapeHtml(rev.userName)}</strong>
                    <span style="font-size: 0.8rem; color: #999;">${new Date(rev.createdAt).toLocaleDateString()}</span>
                </div>
                <div style="color: var(--gold); margin-bottom: 5px;">
                    ${generateStarHTML(rev.rating)}
                </div>
                <p style="font-size: 0.9rem; color: #555;">${escapeHtml(rev.comment)}</p>
            </div>
        `).join("");
    } catch (err) {
        console.error("Error fetching reviews:", err);
        reviewsContainer.innerHTML = emptyState({ icon: "⚠️", title: "Failed to load reviews" });
    }
}


// Helper to render star visuals
function generateStarHTML(rating) {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    return `<span style="color:var(--gold)">${"★".repeat(fullStars)}${"☆".repeat(emptyStars)}</span>`;
}

// Image Preview
function setupImagePreview() {
    const fileInput = document.getElementById("avatar-upload");
    const displayImg = document.getElementById("profile-display-img");

    if (fileInput) {
        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    displayImg.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
    }
}