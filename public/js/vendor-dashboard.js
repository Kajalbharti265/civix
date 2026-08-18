const token = localStorage.getItem("civix_vendor_token");
if (!token) window.location.href = "/vendor-login.html";

async function loadProfile() {
  const res = await fetch("/api/vendors/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    window.location.href = "/vendor-login.html";
    return;
  }
  const v = await res.json();
    myVendorId = v.id;
  loadGallery();

  document.getElementById("company_name").value = v.company_name || "";
  document.getElementById("owner_name").value = v.owner_name || "";
  document.getElementById("phone").value = v.phone || "";
  document.getElementById("role").value = v.role || "";
  document.getElementById("category").value = v.category || "";
  document.getElementById("city").value = v.city || "";
  document.getElementById("materials").value = v.materials || "";

  if (v.logo_url) {
    const img = document.getElementById("logoPreview");
    img.src = v.logo_url;
    img.hidden = false;
  }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const res = await fetch("/api/vendors/me", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();

  const box = document.getElementById("result");
  box.hidden = false;
  box.textContent = data.message || "Updated!";
  if (res.ok) loadProfile();
});


// ---- instant preview jab naya file select ho ----
document.getElementById("logoInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const img = document.getElementById("logoPreview");
  img.src = URL.createObjectURL(file);
  img.hidden = false;
});

// ---- vendor's own vendor_id nikaalo profile se (already loadProfile me mil chuka hoga) ----
let myVendorId = null;

async function loadGallery() {
  if (!myVendorId) return;
  const res = await fetch(`/api/vendors/${myVendorId}/gallery`);
  const data = await res.json();
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = data.images.map(img => `
    <div style="position:relative;">
      <img src="${img.image_url}" style="width:100%; height:100px; object-fit:cover; border-radius:8px;">
      <button data-img-id="${img.id}" class="delete-photo-btn" style="position:absolute; top:4px; right:4px; background:rgba(220,38,38,0.9); color:#fff; border:none; border-radius:50%; width:22px; height:22px; font-size:11px; cursor:pointer;">✕</button>
    </div>
  `).join("");

  document.querySelectorAll(".delete-photo-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await fetch(`/api/vendors/${myVendorId}/gallery/${btn.dataset.imgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadGallery();
    });
  });
}

document.getElementById("uploadPhotoBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("galleryFile");
  const caption = document.getElementById("galleryCaption").value;
  if (!fileInput.files[0]) { alert("Please select a photo"); return; }

  const formData = new FormData();
  formData.append("photo", fileInput.files[0]);
  formData.append("caption", caption);

  await fetch(`/api/vendors/${myVendorId}/gallery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  fileInput.value = "";
  document.getElementById("galleryCaption").value = "";
  loadGallery();
});


loadProfile();