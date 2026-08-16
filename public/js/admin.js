const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let adminKey = "";
let allVendors = [];
let currentFilter = "pending";

// ---- gate/unlock ----
$("#unlockBtn").addEventListener("click", async () => {
  const key = $("#adminKeyInput").value.trim();
  if (!key) return;

  const res = await fetch("/api/vendors/admin/all", {
    headers: { "x-admin-key": key },
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
  } else {
    alert(data.message || "Something went wrong");
    btn.disabled = false;
  }
});