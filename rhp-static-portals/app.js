const CONFIG = {
  workerUrl: window.RHP_WORKER_URL || "https://YOUR-RHP-WORKER.YOUR-SUBDOMAIN.workers.dev"
};

const PAGE_COPY = {
  customer: {
    title: "Customer Project Portal",
    subtitle: "View your approved project status, updates, appointments, and payment/document links from Revitalize House Painting.",
    badge: "Customer View"
  },
  client: {
    title: "Property Manager / Client Portal",
    subtitle: "Track approved project progress by property, request updates, and review linked work records.",
    badge: "Client View"
  },
  "sales-agent": {
    title: "Sales Agent Portal",
    subtitle: "Track your referral code, linked projects, payout status, and approved payout documents.",
    badge: "Sales Agent View"
  },
  assistant: {
    title: "Assistant Work Portal",
    subtitle: "Review assigned intake, project, message, and follow-up work from the Monday operating system.",
    badge: "Assistant View"
  },
  vendor: {
    title: "Vendor / Subcontractor Portal",
    subtitle: "See assigned work information, project notes, and approved schedule details.",
    badge: "Vendor View"
  }
};

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function pageType() {
  return document.body.dataset.portalType || "customer";
}

function accessCode() {
  const fromUrl = qs("access") || qs("code") || qs("ref");
  if (fromUrl) {
    localStorage.setItem(`rhp_access_${pageType()}`, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(`rhp_access_${pageType()}`) || "";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function columnValue(record, title) {
  const found = (record.columns || []).find(c => c.title?.toLowerCase() === title.toLowerCase());
  return found?.text || "";
}

function renderColumns(columns = []) {
  const filtered = columns.filter(c => c.text && !String(c.title || "").toLowerCase().includes("link to"));
  if (!filtered.length) return `<p>No visible fields returned yet.</p>`;
  return `<div class="columns">${filtered.map(c => `
    <div class="col"><small>${escapeHtml(c.title)}</small><strong>${escapeHtml(c.text)}</strong></div>
  `).join("")}</div>`;
}

function renderRecords(records = [], empty = "No linked records yet.") {
  if (!records.length) return `<p>${escapeHtml(empty)}</p>`;
  return records.map(r => `
    <div class="record">
      <div class="record-title">${escapeHtml(r.name || "Untitled")}</div>
      ${r.url ? `<a class="button secondary" target="_blank" rel="noopener" href="${escapeHtml(r.url)}">Open in Monday</a>` : ""}
      <div style="height:10px"></div>
      ${renderColumns(r.columns)}
    </div>
  `).join("");
}

function renderAccess(access) {
  const panel = document.getElementById("accessPanel");
  if (!panel) return;
  const safe = (v) => escapeHtml(v || "—");
  panel.innerHTML = `
    <div class="kv"><b>Name</b><span>${safe(access.personName)}</span></div>
    <div class="kv"><b>Company / Property</b><span>${safe(access.companyProperty)}</span></div>
    <div class="kv"><b>User Type</b><span>${safe(access.userType)}</span></div>
    <div class="kv"><b>Access</b><span>${safe(access.status)}</span></div>
    <div class="kv"><b>Notes</b><span>${safe(access.notes)}</span></div>
  `;

  const linkPanel = document.getElementById("linkPanel");
  if (linkPanel) {
    const links = [];
    if (access.dataViewLink?.url) links.push(`<a class="button secondary" target="_blank" href="${escapeHtml(access.dataViewLink.url)}">Open Data View</a>`);
    if (access.submitLink?.url) links.push(`<a class="button secondary" target="_blank" href="${escapeHtml(access.submitLink.url)}">Submit Request</a>`);
    linkPanel.innerHTML = links.length ? links.join(" ") : `<p>No direct action links have been added yet.</p>`;
  }
}

function renderData(data) {
  renderAccess(data.access || {});
  setText("lastRefreshed", new Date().toLocaleString());

  const contact = document.getElementById("contactRecords");
  if (contact) contact.innerHTML = renderRecords(data.contacts, "No linked contact record.");

  const work = document.getElementById("workRecords");
  if (work) work.innerHTML = renderRecords(data.workItems, "No linked projects/work records yet.");

  const partner = document.getElementById("partnerRecords");
  if (partner) partner.innerHTML = renderRecords(data.salesPartners, "No linked sales partner record.");

  const related = document.getElementById("relatedRecords");
  if (related) related.innerHTML = renderRecords(data.relatedItems, "No related records returned yet.");

  const raw = document.getElementById("rawData");
  if (raw) raw.textContent = JSON.stringify(data, null, 2);
}

async function loadPortal() {
  const code = accessCode();
  const type = pageType();
  const status = document.getElementById("statusText");
  const codeInput = document.getElementById("accessInput");
  if (codeInput) codeInput.value = code;

  if (!code) {
    if (status) status.textContent = "Enter your access code to load this portal.";
    document.getElementById("emptyState")?.classList.remove("hidden");
    return;
  }

  if (status) status.textContent = "Refreshing Monday data...";
  try {
    const url = `${CONFIG.workerUrl}/portal?access=${encodeURIComponent(code)}&type=${encodeURIComponent(type)}&t=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Portal data failed to load.");
    document.getElementById("emptyState")?.classList.add("hidden");
    renderData(data);
    if (status) status.textContent = "Live data loaded from Monday.";
  } catch (err) {
    if (status) status.textContent = "Could not load portal data.";
    const errBox = document.getElementById("errorBox");
    if (errBox) {
      errBox.classList.remove("hidden");
      errBox.textContent = err.message;
    }
  }
}

async function submitPortalRequest(event) {
  event.preventDefault();
  const message = document.getElementById("requestMessage")?.value?.trim();
  const code = accessCode();
  if (!message) return;
  const button = event.target.querySelector("button[type=submit]");
  if (button) button.disabled = true;
  try {
    const response = await fetch(`${CONFIG.workerUrl}/portal/request-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access: code, type: pageType(), message })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Request failed.");
    document.getElementById("requestMessage").value = "";
    alert("Request sent to Revitalize for review.");
  } catch (err) {
    alert(err.message);
  } finally {
    if (button) button.disabled = false;
  }
}

function setupPage() {
  const type = pageType();
  const copy = PAGE_COPY[type] || PAGE_COPY.customer;
  setText("pageTitle", copy.title);
  setText("pageSubtitle", copy.subtitle);
  setText("pageBadge", copy.badge);

  document.getElementById("refreshBtn")?.addEventListener("click", loadPortal);
  document.getElementById("saveCodeBtn")?.addEventListener("click", () => {
    const value = document.getElementById("accessInput")?.value?.trim();
    if (value) localStorage.setItem(`rhp_access_${type}`, value);
    loadPortal();
  });
  document.getElementById("clearCodeBtn")?.addEventListener("click", () => {
    localStorage.removeItem(`rhp_access_${type}`);
    location.href = location.pathname;
  });
  document.getElementById("requestForm")?.addEventListener("submit", submitPortalRequest);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  loadPortal();
}

document.addEventListener("DOMContentLoaded", setupPage);
