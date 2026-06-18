const MONDAY_API = "https://api.monday.com/v2";
const PORTAL_BOARD = "18418328159";

const BOARDS = {
  contacts: "18418311649",
  projects: "18418311680",
  intakes: "18418316511",
  sales: "18418322850",
  portal: "18418328159",
  messages: "18418324129"
};

function headers(env, type = "application/json") {
  return {
    "Content-Type": type,
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

function out(data, status, env) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers(env) });
}

function html(body, env) {
  return new Response(body, { status: 200, headers: headers(env, "text/html;charset=UTF-8") });
}

async function monday(env, query, variables) {
  if (!env.MONDAY_API_TOKEN) throw new Error("Missing MONDAY_API_TOKEN secret");
  const r = await fetch(MONDAY_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": env.MONDAY_API_TOKEN },
    body: JSON.stringify({ query, variables: variables || {} })
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
}

function parse(v) { try { return v ? JSON.parse(v) : null; } catch { return null; } }
function relIds(cv) { const v = parse(cv && cv.value); const a = v && (v.linkedPulseIds || v.linkedItemIds) || []; return a.map(x => String(x.linkedPulseId || x.linkedItemId || x.itemId || x)).filter(Boolean); }
function linkVal(cv) { const v = parse(cv && cv.value); return v && v.url ? { url: v.url, text: v.text || v.url } : null; }
function cv(item, title) { return (item.column_values || []).find(c => (c.column && c.column.title || "").toLowerCase() === title.toLowerCase()); }
function txt(item, title) { const c = cv(item, title); return c && c.text || ""; }
function norm(item) {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    board: item.board && item.board.name || "",
    columns: (item.column_values || []).map(c => ({ id: c.id, title: c.column && c.column.title || c.id, text: c.text || "", value: c.value || "" }))
  };
}

async function portalRows(env) {
  const q = `query($boardId:[ID!]){boards(ids:$boardId){items_page(limit:500){items{id name url board{name} column_values{id text value column{title}}}}}}`;
  const d = await monday(env, q, { boardId: [env.PORTAL_LINKS_BOARD_ID || PORTAL_BOARD] });
  return d.boards[0].items_page.items;
}

async function getItems(env, ids) {
  const clean = [...new Set((ids || []).filter(Boolean))];
  if (!clean.length) return [];
  const q = `query($ids:[ID!]){items(ids:$ids){id name url board{id name} column_values{id text value column{title}}}}`;
  const d = await monday(env, q, { ids: clean });
  return d.items || [];
}

async function getBoard(env, boardId, limit = 50) {
  const q = `query($boardId:[ID!],$limit:Int!){boards(ids:$boardId){id name items_page(limit:$limit){items{id name url board{id name} group{id title} column_values{id text value column{title}}}}}}`;
  const d = await monday(env, q, { boardId: [String(boardId)], limit });
  const b = d.boards && d.boards[0];
  return { id: boardId, name: b && b.name || String(boardId), items: b && b.items_page && b.items_page.items || [] };
}

function valByTitle(item, titles) {
  for (const t of titles) {
    const v = txt(item, t);
    if (v) return v;
  }
  return "";
}

function statusFromItem(item) { return valByTitle(item, ["Status", "Project Status", "Job Status", "Lead Status", "Access Status", "Payout Status"]); }
function moneyNum(s) { const m = String(s || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : 0; }
function pickMoney(item) { return moneyNum(valByTitle(item, ["Total", "Project Total", "Quote Total", "Estimate Total", "Amount", "Balance", "Commission", "Payout"])); }

function publicItem(item) {
  const blocked = ["token", "secret", "api", "internal cost", "private", "password"];
  return {
    id: item.id,
    name: item.name,
    board: item.board && item.board.name || "",
    group: item.group && item.group.title || "",
    url: item.url,
    status: statusFromItem(item),
    address: valByTitle(item, ["Address", "Job Address", "Property Address", "Company / Property"]),
    contact: valByTitle(item, ["Contact", "Contact Name", "Person Name", "Client", "Customer", "Name"]),
    phone: valByTitle(item, ["Phone", "Phone Number"]),
    email: valByTitle(item, ["Email", "Email Address"]),
    amount: pickMoney(item),
    fields: (item.column_values || []).filter(c => {
      const title = (c.column && c.column.title || c.id || "").toLowerCase();
      if (!c.text) return false;
      return !blocked.some(b => title.includes(b));
    }).slice(0, 12).map(c => ({ title: c.column && c.column.title || c.id, text: c.text }))
  };
}

function countBy(items, fn) {
  const m = {};
  for (const item of items) {
    const k = fn(item) || "Uncategorized";
    m[k] = (m[k] || 0) + 1;
  }
  return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
}

async function companyData(env) {
  const results = await Promise.allSettled([
    getBoard(env, BOARDS.intakes, 100),
    getBoard(env, BOARDS.projects, 100),
    getBoard(env, BOARDS.contacts, 100),
    getBoard(env, BOARDS.sales, 100),
    getBoard(env, BOARDS.portal, 100),
    getBoard(env, BOARDS.messages, 100)
  ]);
  const boards = results.map((r, i) => r.status === "fulfilled" ? r.value : { id: Object.values(BOARDS)[i], name: "Board unavailable", items: [], error: r.reason && r.reason.message });
  const all = boards.flatMap(b => b.items.map(item => ({ ...publicItem(item), boardName: b.name, boardId: b.id })));
  const projects = boards[1].items.map(publicItem);
  const intakes = boards[0].items.map(publicItem);
  const contacts = boards[2].items.map(publicItem);
  const sales = boards[3].items.map(publicItem);
  const portal = boards[4].items.map(publicItem);
  const messages = boards[5].items.map(publicItem);
  const pipelineValue = projects.reduce((s, x) => s + (x.amount || 0), 0) + intakes.reduce((s, x) => s + (x.amount || 0), 0);
  return {
    ok: true,
    refreshedAt: new Date().toISOString(),
    boards: boards.map(b => ({ id: b.id, name: b.name, count: b.items.length, error: b.error || null })),
    metrics: {
      intakes: intakes.length,
      projects: projects.length,
      contacts: contacts.length,
      salesPartners: sales.length,
      portalLinks: portal.length,
      messages: messages.length,
      pipelineValue
    },
    breakdowns: {
      byBoard: countBy(all, x => x.boardName),
      projectStatus: countBy(projects, x => x.status),
      intakeStatus: countBy(intakes, x => x.status),
      portalStatus: countBy(portal, x => x.status)
    },
    latest: {
      intakes: intakes.slice(0, 12),
      projects: projects.slice(0, 12),
      contacts: contacts.slice(0, 12),
      sales: sales.slice(0, 12),
      portal: portal.slice(0, 12),
      messages: messages.slice(0, 12)
    }
  };
}

function dashboardHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RHP Company Dashboard</title><style>
:root{--bg:#0e1117;--panel:#151a23;--panel2:#1c2330;--text:#f5f7fb;--muted:#aab4c3;--brand:#fdab3d;--green:#00c875;--red:#e2445c;--line:rgba(255,255,255,.11)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,rgba(253,171,61,.16),transparent 36%),var(--bg);color:var(--text);font-family:Arial,system-ui,sans-serif}.app{max-width:1280px;margin:auto;padding:16px}.hero,.card{background:rgba(21,26,35,.94);border:1px solid var(--line);border-radius:22px;padding:18px;margin:12px 0;box-shadow:0 12px 34px #0005}.brand{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.logo{display:grid;place-items:center;width:56px;height:56px;border-radius:16px;background:var(--brand);color:#111;font-weight:900}h1{font-size:clamp(1.8rem,4vw,3.2rem);margin:0}p{color:var(--muted);line-height:1.45}.controls{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}button,a.btn{border:0;border-radius:12px;padding:11px 14px;background:var(--brand);color:#111;font-weight:900;text-decoration:none;cursor:pointer}.secondary{background:var(--panel2)!important;color:var(--text)!important;border:1px solid var(--line)!important}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}.span3{grid-column:span 3}.span4{grid-column:span 4}.span6{grid-column:span 6}.span8{grid-column:span 8}.span12{grid-column:span 12}@media(max-width:900px){.span3,.span4,.span6,.span8{grid-column:span 12}}.metric{background:linear-gradient(135deg,rgba(253,171,61,.12),rgba(0,200,117,.06));border:1px solid var(--line);border-radius:18px;padding:16px}.metric small{display:block;color:var(--muted);margin-bottom:6px}.metric b{font-size:2rem}.record{border:1px solid var(--line);background:#ffffff08;border-radius:14px;padding:12px;margin:10px 0}.record h3{margin:0 0 6px}.tag{display:inline-flex;border-radius:999px;background:#ffffff12;color:#cbd5e1;padding:4px 8px;font-size:.82rem;margin:2px}.tag.good{background:rgba(0,200,117,.14);color:#b8ffd7}.tag.warn{background:rgba(253,171,61,.16);color:#ffe2b6}.bar{height:10px;border-radius:999px;background:#ffffff12;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--brand),var(--green))}.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px}.col{background:#ffffff08;border-radius:10px;padding:8px}.col small{display:block;color:var(--muted);margin-bottom:3px}.error{border-left:4px solid var(--red);background:rgba(226,68,92,.12);padding:12px;border-radius:12px}.footer{text-align:center;color:var(--muted);padding:24px}input{padding:12px;border-radius:12px;border:1px solid var(--line);background:#10151f;color:var(--text);font:inherit}.hidden{display:none!important}
</style></head><body><main class="app"><section class="hero"><div class="brand"><div class="logo">RHP</div><div><h1>Revitalize Company Dashboard</h1><p>Internal all-in-one view powered by Monday + Cloudflare Worker. No GitHub Pages required.</p></div></div><div class="controls"><button onclick="load()">Refresh Monday Data</button><a class="btn secondary" href="/health" target="_blank">Worker Health</a><a class="btn secondary" href="/dashboard" target="_self">Dashboard</a></div><p id="status">Loading Monday data...</p><div id="err" class="error hidden"></div></section><section class="grid" id="metrics"></section><section class="grid"><div class="card span4"><h2>Boards</h2><div id="boards"></div></div><div class="card span4"><h2>Project Status</h2><div id="projectStatus"></div></div><div class="card span4"><h2>Intake Status</h2><div id="intakeStatus"></div></div></section><section class="grid"><div class="card span6"><h2>Latest Intakes</h2><div id="intakes"></div></div><div class="card span6"><h2>Active Projects</h2><div id="projects"></div></div><div class="card span6"><h2>Contacts / Clients</h2><div id="contacts"></div></div><div class="card span6"><h2>Sales Partners</h2><div id="sales"></div></div><div class="card span6"><h2>Portal Access Links</h2><div id="portal"></div></div><div class="card span6"><h2>Message / Follow-Up Queue</h2><div id="messages"></div></div></section><footer class="footer">Revitalize House Painting · Rent-Ready Rapid OS</footer></main><script>
function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}function money(n){return '$'+Math.round(Number(n)||0).toLocaleString()}function metric(k,v){return '<div class="metric span3"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>'}function listBreak(a){if(!a||!a.length)return '<p>No data yet.</p>';let max=Math.max(...a.map(x=>x.count),1);return a.map(x=>'<div class="record"><b>'+esc(x.name)+'</b><span class="tag">'+x.count+'</span><div class="bar"><i style="width:'+Math.round(x.count/max*100)+'%"></i></div></div>').join('')}function cols(a){let f=(a||[]).filter(x=>x.text).slice(0,8);return f.length?'<div class="cols">'+f.map(x=>'<div class="col"><small>'+esc(x.title)+'</small><b>'+esc(x.text)+'</b></div>').join('')+'</div>':''}function records(a,empty){if(!a||!a.length)return '<p>'+empty+'</p>';return a.map(r=>'<div class="record"><h3>'+esc(r.name)+'</h3>'+(r.status?'<span class="tag good">'+esc(r.status)+'</span>':'')+(r.group?'<span class="tag">'+esc(r.group)+'</span>':'')+(r.address?'<p>'+esc(r.address)+'</p>':'')+(r.amount?'<span class="tag warn">'+money(r.amount)+'</span>':'')+(r.url?'<div class="controls"><a class="btn secondary" target="_blank" href="'+esc(r.url)+'">Open in Monday</a></div>':'')+cols(r.fields)+'</div>').join('')}async function load(){err.classList.add('hidden');status.textContent='Refreshing Monday data...';try{let r=await fetch('/company-data?t='+Date.now(),{cache:'no-store'});let d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||'Failed to load');metrics.innerHTML=metric('Intakes',d.metrics.intakes)+metric('Projects',d.metrics.projects)+metric('Contacts',d.metrics.contacts)+metric('Sales Partners',d.metrics.salesPartners)+metric('Portal Links',d.metrics.portalLinks)+metric('Messages',d.metrics.messages)+metric('Pipeline Value',money(d.metrics.pipelineValue))+metric('Updated',new Date(d.refreshedAt).toLocaleTimeString());boards.innerHTML=listBreak(d.breakdowns.byBoard);projectStatus.innerHTML=listBreak(d.breakdowns.projectStatus);intakeStatus.innerHTML=listBreak(d.breakdowns.intakeStatus);intakes.innerHTML=records(d.latest.intakes,'No intakes yet.');projects.innerHTML=records(d.latest.projects,'No projects yet.');contacts.innerHTML=records(d.latest.contacts,'No contacts yet.');sales.innerHTML=records(d.latest.sales,'No sales partners yet.');portal.innerHTML=records(d.latest.portal,'No portal links yet.');messages.innerHTML=records(d.latest.messages,'No messages yet.');status.textContent='Live Monday data loaded.'}catch(e){status.textContent='Dashboard error.';err.textContent=e.message;err.classList.remove('hidden')}}load();
</script></body></html>`;
}

async function handlePortal(request, env) {
  const u = new URL(request.url);
  const access = (u.searchParams.get("access") || "").trim();
  if (!access) return out({ ok:false, error:"Missing access code" }, 400, env);
  const rows = await portalRows(env);
  const row = rows.find(i => txt(i, "Access Code").trim() === access);
  if (!row) return out({ ok:false, error:"Access code not found" }, 404, env);
  if (txt(row, "Access Status") !== "Ready") return out({ ok:false, error:"Access not ready" }, 403, env);
  const contacts = (await getItems(env, relIds(cv(row, "Contact Link")))).map(norm);
  const workItems = (await getItems(env, relIds(cv(row, "Work Link")))).map(norm);
  const salesPartners = (await getItems(env, relIds(cv(row, "Sales Partner Link")))).map(norm);
  return out({ ok:true, access: { id: row.id, name: row.name, userType: txt(row, "User Type"), status: txt(row, "Access Status"), personName: txt(row, "Person Name"), companyProperty: txt(row, "Company / Property"), accessCode: txt(row, "Access Code"), dataViewLink: linkVal(cv(row, "Data View Link")), submitLink: linkVal(cv(row, "Submit Link")), notes: txt(row, "Access Notes") }, contacts, workItems, salesPartners, relatedItems: [] }, 200, env);
}

async function handleRequestUpdate(request, env) {
  const b = await request.json();
  return out({ ok:true, received:true, message:"Portal request endpoint connected.", access:b.access || null }, 200, env);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: headers(env) });
    const u = new URL(request.url);
    try {
      if (u.pathname === "/dashboard") return html(dashboardHtml(), env);
      if (u.pathname === "/company-data") return out(await companyData(env), 200, env);
      if (u.pathname === "/" || u.pathname === "/health") return out({ ok:true, service:"RHP Portal Worker", dashboard:"/dashboard" }, 200, env);
      if (u.pathname === "/portal") return handlePortal(request, env);
      if (u.pathname === "/portal/request-update" && request.method === "POST") return handleRequestUpdate(request, env);
      return out({ ok:false, error:"Not found", dashboard:"/dashboard" }, 404, env);
    } catch (e) {
      return out({ ok:false, error:e.message }, 500, env);
    }
  }
};
