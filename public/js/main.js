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
  return `
  <article class="vendor-card">
    <div class="vendor-card__top">
      <div>
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
  </article>`;
}

async function loadVendors() {
  const params = new URLSearchParams({ city: state.city, category: state.category, search: state.search });
  const res = await fetch(`/api/vendors?${params.toString()}`);
  const data = await res.json();

  const grid = $("#vendorGrid");
  const empty = $("#emptyState");

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

$("#rfqForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = Object.fromEntries(new FormData(form).entries());
  const res = await fetch("/api/rfq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json();
  const box = $("#rfqResult");
  box.hidden = false;
  box.textContent = data.message || "Requirement posted!";
  form.reset();
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

loadVendors();