const CATEGORY_MAP = {
  cement: { emoji: "🏭", label: "Cement" },
  tmt_steel: { emoji: "⛓️", label: "TMT Steel" },
  contractors: { emoji: "👷", label: "Contractors" },
  machinery: { emoji: "🚜", label: "Machinery" },
  plumbing_electrical: { emoji: "🔧", label: "Plumbing/Electrical" },
};

const state = { city: "all", category: "all", search: "" };
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function waLink(phone, name) {
  const msg = encodeURIComponent(`Hi ${name}, I found your listing on Civix. I need a quote for my site.`);
  return `https://wa.me/91${phone}?text=${msg}`;
}

function vendorCardHTML(v) {
  const cat = CATEGORY_MAP[v.category];
  const initials = v.company_name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return `
  <article class="vendor-card" style="cursor:pointer;" onclick="if(!event.target.closest('a,button')) window.location.href='/vendor.html?id=${v.id}'">
    <div class="vendor-card__banner"></div>
    <div class="vendor-card__body">
      <div class="vendor-card__top">
        ${v.logo_url
          ? `<img class="vendor-card__avatar" src="${v.logo_url}" alt="${v.company_name}">`
          : `<div class="vendor-card__avatar">${initials}</div>`}
        <div class="vendor-card__title-wrap">
          <p class="vendor-card__name">${v.company_name}
            ${v.is_verified ? '<span class="verified-badge" title="Verified">✔</span>' : ""}
          </p>
          <p class="vendor-card__meta">${v.role} • ${cat ? cat.emoji + " " + cat.label : v.category} • ${v.city}</p>
        </div>
        <span class="rating"><span class="rating__star">★</span>${Number(v.rating).toFixed(1)}</span>
      </div>
      ${v.materials ? `<div class="vendor-card__materials">${v.materials}</div>` : ""}
      <div class="vendor-card__actions">
        <a class="action-btn action-btn--call" href="tel:+91${v.phone}">📞 Call</a>
        <a class="action-btn action-btn--whatsapp" target="_blank" href="${waLink(v.phone, v.company_name)}">💬 WhatsApp</a>
      </div>
    </div>
    <button class="vendor-card__review-link" data-review-vendor="${v.id}" data-review-name="${v.company_name}">Write a review</button>
  </article>`;
}
// ---- star picker ----
let selectedRating = 0;
$$("#starPicker span").forEach((star) => {
  star.addEventListener("click", () => {
    selectedRating = Number(star.dataset.value);
    $("#ratingInput").value = selectedRating;
    $$("#starPicker span").forEach((s) => {
      s.classList.toggle("is-filled", Number(s.dataset.value) <= selectedRating);
    });
  });
});

// ---- open review modal (event delegation, kyunki cards dynamically bante hain) ----
$("#vendorGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-review-vendor]");
  if (!btn) return;
  $("#reviewVendorId").value = btn.dataset.reviewVendor;
  $("#reviewVendorName").textContent = `Rate ${btn.dataset.reviewName}`;
  selectedRating = 0;
  $("#ratingInput").value = "";
  $$("#starPicker span").forEach((s) => s.classList.remove("is-filled"));
  openModal("reviewOverlay");
});

// ---- submit review ----
$("#reviewForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selectedRating) { alert("Please select a rating"); return; }

  const form = e.target;
  const vendorId = $("#reviewVendorId").value;
  const payload = Object.fromEntries(new FormData(form).entries());

  const res = await fetch(`/api/vendors/${vendorId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  const box = $("#reviewResult");
  box.hidden = false;
  box.textContent = data.message || "Review submitted!";
  form.reset();
  loadVendors();
  setTimeout(() => { closeModal("reviewOverlay"); box.hidden = true; }, 2000);
});

// ---- use my current location -> nearest supported city ----
const SUPPORTED_CITIES = ["Indore", "Bhopal", "Jabalpur", "Gwalior"];

$("#locateBtn")?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Location isn't supported on this browser/device.");
    return;
  }
  const btn = $("#locateBtn");
  btn.disabled = true;
  btn.textContent = "Locating…";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();
        const addr = data.address || {};
        const candidates = [addr.city, addr.town, addr.county, addr.state_district, addr.state]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const match = SUPPORTED_CITIES.find((c) => candidates.includes(c.toLowerCase()));

        if (match) {
          state.city = match;
          $("#currentCityLabel").textContent = match;
          $$(".city-dropdown__item").forEach((b) =>
            b.classList.toggle("is-active", b.dataset.city === match)
          );
        } else {
          alert("Civix isn't live in your exact city yet — showing all cities for now.");
          state.city = "all";
          $("#currentCityLabel").textContent = "All Cities";
        }
        loadVendors();
      } catch (err) {
        alert("Couldn't detect your city. Please pick one manually.");
      } finally {
        btn.disabled = false;
        btn.textContent = "🎯 Use my current location";
        $("#cityDropdown").hidden = true;
      }
    },
    () => {
      alert("Location permission denied. Please pick a city manually.");
      btn.disabled = false;
      btn.textContent = "🎯 Use my current location";
    }
  );
});

async function loadVendors() {
  const grid = $("#vendorGrid");
  const empty = $("#emptyState");
  empty.hidden = true;
  grid.innerHTML = Array(3).fill(`
    <div class="skeleton-card">
      <div class="skeleton-line" style="width:60%"></div>
      <div class="skeleton-line" style="width:40%; height:10px;"></div>
      <div class="skeleton-line" style="width:100%; height:36px; border-radius:8px;"></div>
    </div>`).join("");

  const params = new URLSearchParams({ city: state.city, category: state.category, search: state.search });
  const res = await fetch(`/api/vendors?${params.toString()}`);
  const data = await res.json();

  if (!data.vendors || !data.vendors.length) {
    grid.innerHTML = "";
    empty.hidden = false;
  } else {
    empty.hidden = true;
    grid.innerHTML = data.vendors.map(vendorCardHTML).join("");
  }
  $("#resultsCount").textContent = `${data.count || 0} vendor${data.count === 1 ? "" : "s"}`;
  $("#resultsTitle").textContent = state.city === "all" ? "All vendors" : `Vendors in ${state.city}`;
}

$("#cityPillBtn").addEventListener("click", () => { $("#cityDropdown").hidden = !$("#cityDropdown").hidden; });
document.addEventListener("click", (e) => {
  if (!e.target.closest(".city-pill") && !e.target.closest("#cityDropdown")) $("#cityDropdown").hidden = true;
});
$$(".city-dropdown__item").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".city-dropdown__item").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.city = btn.dataset.city;
    $("#currentCityLabel").textContent = state.city === "all" ? "All Cities" : state.city;
    $("#cityDropdown").hidden = true;
    loadVendors();
  });
});

$$(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $$(".chip").forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    state.category = chip.dataset.category;
    loadVendors();
  });
});

let searchTimer;
$("#searchInput").addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.search = e.target.value.trim(); loadVendors(); }, 250);
});

function openModal(id) { $(`#${id}`).hidden = false; }
function closeModal(id) { $(`#${id}`).hidden = true; }
$("#postNeedFab").addEventListener("click", () => openModal("rfqOverlay"));
$("#becomeVendorBtn").addEventListener("click", () => openModal("vendorOverlay"));
$$("[data-close]").forEach((btn) => btn.addEventListener("click", () => closeModal(btn.dataset.close)));
$$(".modal-overlay").forEach((ov) => ov.addEventListener("click", (e) => { if (e.target === ov) ov.hidden = true; }));

// ---- add/remove item rows ----
$("#addItemBtn")?.addEventListener("click", () => {
  const row = document.createElement("div");
  row.className = "rfq-item-row";
  row.innerHTML = `
    <input type="text" class="item-material" placeholder="e.g. TMT Steel bars" required>
    <input type="text" class="item-quantity" placeholder="Qty" required>
    <button type="button" class="remove-item">✕</button>
  `;
  $("#rfqItemsList").appendChild(row);
  row.querySelector(".remove-item").addEventListener("click", () => row.remove());
});

$("#rfqForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;

  const items = Array.from(document.querySelectorAll(".rfq-item-row")).map((row) => ({
    material: row.querySelector(".item-material").value.trim(),
    quantity: row.querySelector(".item-quantity").value.trim(),
  })).filter((i) => i.material && i.quantity);

  if (!items.length) { alert("Please add at least one item"); return; }

  const payload = {
    items,
    city: form.city.value,
    location: form.location.value,
    phone: form.phone.value,
  };

  const headers = { "Content-Type": "application/json" };
  const customerToken = localStorage.getItem("civix_customer_token");
  if (customerToken) headers["Authorization"] = `Bearer ${customerToken}`;

  const res = await fetch("/api/rfq", { method: "POST", headers, body: JSON.stringify(payload) });
  const data = await res.json();
  const box = $("#rfqResult");
  box.hidden = false;
  box.textContent = data.message || "Requirement posted!";
  form.reset();
  document.querySelectorAll(".rfq-item-row:not(:first-child)").forEach((r) => r.remove());
  loadVendors();
  setTimeout(() => { closeModal("rfqOverlay"); box.hidden = true; }, 2200);
});

$("#vendorForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  const res = await fetch("/api/auth/vendor/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  const box = $("#vendorResult");
  box.hidden = false;
  box.textContent = data.message || "Listing submitted! Pending approval.";
  form.reset();
  setTimeout(() => { closeModal("vendorOverlay"); box.hidden = true; }, 2500);
});
// ---- footer: "List your business" link ----
$("#footerListBusiness")?.addEventListener("click", (e) => {
  e.preventDefault();
  openModal("vendorOverlay");
});

// ---- footer: city links ----
$$("[data-footer-city]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const city = link.dataset.footerCity;
    state.city = city;
    $("#currentCityLabel").textContent = city;
    $$(".city-dropdown__item").forEach((b) => b.classList.toggle("is-active", b.dataset.city === city));
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadVendors();
  });
});

loadVendors();