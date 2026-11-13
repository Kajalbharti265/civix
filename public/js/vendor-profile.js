const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const params = new URLSearchParams(window.location.search);
const vendorId = params.get("id");

if (!vendorId) {
  document.getElementById("profileRoot").innerHTML = `<div class="profile__loading">No vendor selected.</div>`;
}

function waLink(phone, name) {
  const msg = encodeURIComponent(`Hi ${name}, I found your listing on Civix. I need a quote for my site.`);
  return `https://wa.me/91${phone}?text=${msg}`;
}

function starsHTML(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

async function loadProfile() {
  const [vendorRes, reviewsRes] = await Promise.all([
    fetch(`/api/vendors/${vendorId}`),
    fetch(`/api/vendors/${vendorId}/reviews`),
  ]);

  if (!vendorRes.ok) {
    document.getElementById("profileRoot").innerHTML = `<div class="profile__loading">Vendor not found.</div>`;
    return;
  }

  const v = await vendorRes.json();
  const reviewsData = await reviewsRes.json();
  const reviews = reviewsData.reviews || [];

  document.title = `${v.company_name} — Civix`;

  const initials = v.company_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  document.getElementById("profileRoot").innerHTML = `
    <div class="profile__header">
      ${v.logo_url
        ? `<img class="profile__logo" src="${v.logo_url}" alt="${v.company_name}">`
        : `<div class="profile__logo-placeholder">${initials}</div>`}
      <div class="profile__info">
        <h1>${v.company_name} ${v.is_verified ? '<span class="verified-badge" title="Verified">✔</span>' : ""}</h1>
        <p class="profile__meta">${v.role} • ${v.city} • ${v.owner_name || ""}</p>
        <div class="profile__rating">
          <span class="stars">${starsHTML(v.rating)}</span>
          <span class="count">${Number(v.rating).toFixed(1)} · ${reviews.length} review${reviews.length === 1 ? "" : "s"}</span>
        </div>
        <div class="profile__actions">
          <a class="action-btn action-btn--call" href="tel:+91${v.phone}">📞 Call ${v.phone}</a>
          <a class="action-btn action-btn--whatsapp" target="_blank" href="${waLink(v.phone, v.company_name)}">💬 WhatsApp</a>
        </div>
      </div>
    </div>

    <div class="profile__section">
      <h2>Materials & Services</h2>
      <div class="profile__materials">${v.materials || "No details provided yet."}</div>
    </div>

    <div class="profile__section">
      <h2>Reviews (${reviews.length})</h2>
      ${reviews.length === 0
        ? `<div class="no-reviews">No reviews yet — be the first to review this vendor.</div>`
        : reviews.map(r => `
          <div class="review-item">
            <div class="review-item__top">
            <span class="review-item__name">${r.customer_name}${r.verified ? ' <small style="color:#22A559;font-weight:600">✔ Verified buyer</small>' : ""}</span>
              <span class="review-item__stars">${starsHTML(r.rating)}</span>
            </div>
            ${r.comment ? `<p class="review-item__comment">${r.comment}</p>` : ""}
            <span class="review-item__date">${new Date(r.created_at).toLocaleDateString()}</span>
          </div>
        `).join("")}
        <p class="no-reviews">Only verified buyers can review, after their order is delivered. <a href="/orders.html?as=buyer">My orders →</a></p>
    </div>
  `;

  
}

// ---- review modal logic (same as main.js) ----
let selectedRating = 0;
function openModal(id) { $(`#${id}`).hidden = false; }
function closeModal(id) { $(`#${id}`).hidden = true; }

$$("[data-close]").forEach((btn) => btn.addEventListener("click", () => closeModal(btn.dataset.close)));
$$(".modal-overlay").forEach((ov) => ov.addEventListener("click", (e) => { if (e.target === ov) ov.hidden = true; }));

$$("#starPicker span").forEach((star) => {
  star.addEventListener("click", () => {
    selectedRating = Number(star.dataset.value);
    $("#ratingInput").value = selectedRating;
    $$("#starPicker span").forEach((s) => s.classList.toggle("is-filled", Number(s.dataset.value) <= selectedRating));
  });
});

$("#reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedRating) { alert("Please select a rating"); return; }

  const payload = Object.fromEntries(new FormData(e.target).entries());
  const res = await fetch(`/api/vendors/${vendorId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  const box = $("#reviewResult");
  box.hidden = false;
  box.textContent = data.message || "Review submitted!";
  e.target.reset();
  setTimeout(() => { closeModal("reviewOverlay"); box.hidden = true; loadProfile(); }, 1800);
});

if (vendorId) loadProfile();