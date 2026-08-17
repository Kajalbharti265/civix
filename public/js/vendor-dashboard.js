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

loadProfile();