const MONDAY_API = "https://api.monday.com/v2";
const PORTAL_BOARD = "18418328159";

function headers(env) {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store"
  };
}

function out(data, status, env) {
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers(env) });
}

async function monday(env, query, variables) {
  if (!env.MONDAY_API_TOKEN) throw new Error("Missing MONDAY_API_TOKEN secret");
  const r = await fetch(MONDAY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": env.MONDAY_API_TOKEN
    },
    body: JSON.stringify({ query, variables: variables || {} })
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(JSON.stringify(j.errors || j));
  return j.data;
}

function parse(v) {
  try { return v ? JSON.parse(v) : null; } catch { return null; }
}

function relIds(cv) {
  const v = parse(cv && cv.value);
  const a = v && (v.linkedPulseIds || v.linkedItemIds) || [];
  return a.map(x => String(x.linkedPulseId || x.linkedItemId || x.itemId || x)).filter(Boolean);
}

function linkVal(cv) {
  const v = parse(cv && cv.value);
  return v && v.url ? { url: v.url, text: v.text || v.url } : null;
}

function cv(item, title) {
  return (item.column_values || []).find(c => (c.column && c.column.title || "").toLowerCase() === title.toLowerCase());
}

function txt(item, title) {
  const c = cv(item, title);
  return c && c.text || "";
}

function norm(item) {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    board: item.board && item.board.name || "",
    columns: (item.column_values || []).map(c => ({
      id: c.id,
      title: c.column && c.column.title || c.id,
      text: c.text || "",
      value: c.value || ""
    }))
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

  return out({
    ok:true,
    access: {
      id: row.id,
      name: row.name,
      userType: txt(row, "User Type"),
      status: txt(row, "Access Status"),
      personName: txt(row, "Person Name"),
      companyProperty: txt(row, "Company / Property"),
      accessCode: txt(row, "Access Code"),
      dataViewLink: linkVal(cv(row, "Data View Link")),
      submitLink: linkVal(cv(row, "Submit Link")),
      notes: txt(row, "Access Notes")
    },
    contacts,
    workItems,
    salesPartners,
    relatedItems: []
  }, 200, env);
}

async function handleRequestUpdate(request, env) {
  const b = await request.json();
  return out({ ok:true, received:true, message:"Portal request endpoint connected. Monday message queue write can be expanded after first live portal test.", access:b.access || null }, 200, env);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: headers(env) });
    const u = new URL(request.url);
    try {
      if (u.pathname === "/" || u.pathname === "/health") return out({ ok:true, service:"RHP Portal Worker" }, 200, env);
      if (u.pathname === "/portal") return handlePortal(request, env);
      if (u.pathname === "/portal/request-update" && request.method === "POST") return handleRequestUpdate(request, env);
      return out({ ok:false, error:"Not found" }, 404, env);
    } catch (e) {
      return out({ ok:false, error:e.message }, 500, env);
    }
  }
};
