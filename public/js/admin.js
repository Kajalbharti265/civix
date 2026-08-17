const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let adminKey = "";
let allVendors = [];
let currentFilter = "pending";

// ---- gate/unlock ----
$("#unlockBtn").addEventListener("click", async () => {
  const key = $("#adminKeyInput").value.replace(/[^\x00-\x7F]/g, "").trim();
  if (!key) return;

  const res = await fetch("/api/vendors/admin/all", {
    headers: { "x-admin-key": key },
    cache: "no-store",
  });

  if (res.status === 403) {
    $("#gateError").hidden = false;
    return;
  }

  adminKey = key;
  $("#gate").hidden = true;
  $("#adminPanel").hidden = false;
  const data = await res.json();
  allVendors = data.vendors || [];
  renderList();
  loadStats();
});

$("#adminKeyInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#unlockBtn").click();
});

// ---- tabs ----
$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("is-active"));
    tab.classList.add("is-active");
    currentFilter = tab.dataset.filter;
    renderList();
  });
});

// ---- render ----
function renderList() {
  let list = allVendors;
  if (currentFilter === "pending") list = allVendors.filter((v) => !v.is_approved);
  if (currentFilter === "approved") list = allVendors.filter((v) => v.is_approved);

  const container = $("#vendorList");
  if (!list.length) {
    container.innerHTML = `<div class="empty">No vendors here.</div>`;
    return;
  }

  container.innerHTML = list.map((v) => `
    <div class="vrow" data-id="${v.id}">
      <div class="vrow__info">
        <h3>${v.company_name}
          ${v.is_approved ? '<span class="badge badge--approved">Approved</span>' : '<span class="badge badge--pending">Pending</span>'}
          ${v.is_verified ? '<span class="badge badge--verified">✔ Verified</span>' : ""}
        </h3>
        <p>${v.role} • ${v.category} • ${v.city} • ${v.phone}</p>
      </div>
      <div class="vrow__actions">
        <button class="btn-approve" data-action="approve" ${v.is_approved ? "disabled" : ""}>
          ${v.is_approved ? "Approved" : "Approve"}
        </button>
        <button class="btn-verify" data-action="verify" ${v.is_verified ? "disabled" : ""}>
          ${v.is_verified ? "Verified" : "Verify"}
        </button>
      </div>
    </div>
  `).join("");
}

// ---- actions (event delegation) ----
$("#vendorList").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const row = e.target.closest(".vrow");
  const id = row.dataset.id;
  const action = btn.dataset.action;

  btn.disabled = true;
  btn.textContent = "...";

  const res = await fetch(`/api/vendors/admin/${id}/${action}`, {
    method: "PATCH",
    headers: { "x-admin-key": adminKey },
  });
  const data = await res.json();

  if (res.ok) {
    const idx = allVendors.findIndex((v) => v.id === id);
    allVendors[idx] = data.vendor;
    renderList();
    loadStats();
  } else {
    alert(data.message || "Something went wrong");
    btn.disabled = false;
  }
});

// ---- analytics/stats ----
async function loadStats() {
  const res = await fetch("/api/vendors/admin/stats", {
    headers: { "x-admin-key": adminKey },
    cache: "no-store",
  });
  if (!res.ok) return;
  const s = await res.json();

  document.getElementById("statsGrid").innerHTML = `
    <div class="stat-card stat-card--highlight"><div class="stat-card__value">${s.pendingVendors}</div><div class="stat-card__label">Pending Approval</div></div>
    <div class="stat-card"><div class="stat-card__value">${s.totalVendors}</div><div class="stat-card__label">Total Vendors</div></div>
    <div class="stat-card"><div class="stat-card__value">${s.approvedVendors}</div><div class="stat-card__label">Approved</div></div>
    <div class="stat-card"><div class="stat-card__value">${s.verifiedVendors}</div><div class="stat-card__label">Verified</div></div>
    <div class="stat-card"><div class="stat-card__value">${s.totalRFQs}</div><div class="stat-card__label">Total RFQs</div></div>
    <div class="stat-card"><div class="stat-card__value">${s.avgRating}★</div><div class="stat-card__label">Avg Rating (${s.totalReviews})</div></div>
  `;

  const cityRows = Object.entries(s.cityBreakdown).map(([city, count]) => `
    <div class="breakdown-row"><span>${city}</span><b>${count}</b></div>
  `).join("");
  const catRows = Object.entries(s.categoryBreakdown).map(([cat, count]) => `
    <div class="breakdown-row"><span>${cat}</span><b>${count}</b></div>
  `).join("");

  const breakdownHTML = `
    <div class="breakdown">
      <div class="breakdown-box"><h4>By City</h4>${cityRows || "No data"}</div>
      <div class="breakdown-box"><h4>By Category</h4>${catRows || "No data"}</div>
    </div>
  `;

  let breakdownEl = document.getElementById("breakdownSection");
  if (!breakdownEl) {
    breakdownEl = document.createElement("div");
    breakdownEl.id = "breakdownSection";
    document.getElementById("statsGrid").insertAdjacentElement("afterend", breakdownEl);
  }
  breakdownEl.innerHTML = breakdownHTML;
}