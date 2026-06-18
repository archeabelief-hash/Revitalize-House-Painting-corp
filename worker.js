/* RHP view-only Cloudflare Worker dashboard.
   Live route: /dashboard
*/
const API = "https://api.monday.com/v2";
const BOARD_IDS = [
  ["main", "Our Main Company Workload", "18418292787"],
  ["projects", "Restore Co - Projects", "18417939916"],
  ["hub", "Revitalize - Business Hub", "18418129486"],
  ["intakes", "Revitalize - Inbound Leads & Intake", "18418144102"],
  ["pricing", "Revitalize Pricing Database", "18418143317"],
  ["time", "Revitalize Time Tracking", "18417947949"],
  ["hickory-checklist", "811 Hickory Checklist", "18417944291"],
  ["hickory-receipts", "811 Hickory Receipts & Expenses", "18417949393"],
  ["time-archive", "Time Tracking", "18417947140"],
  ["new-board", "New Board", "18418129192"],
  ["crm-intakes", "RHP CRM Intakes", "18418316511"],
  ["crm-projects", "RHP CRM Projects", "18418311680"],
  ["crm-clients", "RHP CRM Clients / Contacts", "18418311649"],
  ["crm-sales", "RHP CRM Sales Partners", "18418322850"],
  ["crm-portal", "RHP Portal Access", "18418328159"],
  ["crm-messages", "RHP Messages / Follow-Ups", "18418324129"]
];
function h(type="application/json") { return {"Content-Type":type,"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"no-store"}; }
function j(x,s=200){ return new Response(JSON.stringify(x),{status:s,headers:h()}); }
function page(x){ return new Response(x,{status:200,headers:h("text/html;charset=UTF-8")}); }
async function mq(env,q,v={}){
  const k = env.MONDAY_API_TOKEN;
  if(!k) throw Error("Monday connection is not configured. Add MONDAY_API_TOKEN as a Cloudflare Worker secret.");
  const r = await fetch(API,{method:"POST",headers:{"Content-Type":"application/json","Authorization":k},body:JSON.stringify({query:q,variables:v})});
  const d = await r.json();
  if(!r.ok || d.errors) throw Error(JSON.stringify(d.errors || d));
  return d.data;
}
function parse(x){ try{return x?JSON.parse(x):null;}catch{return null;} }
function money(x){ const m=String(x||"").replace(/,/g,"").match(/-?\d+(\.\d+)?/); return m?Number(m[0]):0; }
function first(item,names){ for(const n of names){ const c=(item.column_values||[]).find(v=>(v.column?.title||"").toLowerCase()===n.toLowerCase()); if(c?.text) return c.text; } return ""; }
function status(item){ return first(item,["Status","Project Status","Job Status","Lead Status","Access Status","Payout Status","Stage","Priority"]); }
function amount(item){ return money(first(item,["Total","Project Total","Quote Total","Estimate Total","Amount","Balance","Commission","Payout","Price","Cost","Total Cost","Subtotal"])); }
function dateVal(item){ for(const c of item.column_values||[]){ const t=(c.column?.title||"").toLowerCase(); if(/date|schedule|appointment|start|due|timeline|calendar|updated/.test(t)){ const v=parse(c.value); return v?.date||v?.from||v?.to||c.text||""; } } return ""; }
function fileRefs(item){
  const out=[];
  for(const c of item.column_values||[]){
    const title=c.column?.title||c.id||"";
    const val=parse(c.value);
    const arr=val?.files||val?.assets||[];
    if(Array.isArray(arr)){
      for(const f of arr){ const id=String(f.assetId||f.id||f.asset_id||""); if(id) out.push({assetId:id,name:f.name||c.text||"File",sourceColumn:title}); }
    }
  }
  return out;
}
function cleanFields(item){ return (item.column_values||[]).filter(c=>c.text&&!/(password|credential|api token|secret key|private key)/i.test(c.column?.title||"")).slice(0,14).map(c=>({title:c.column?.title||c.id,text:c.text})); }
function itemOut(item,board){ return {id:item.id,name:item.name,url:item.url,boardKey:board.key,boardName:board.name,group:item.group?.title||"",status:status(item),date:dateVal(item),address:first(item,["Address","Job Address","Property Address","Company / Property","Location","Street Address"]),contact:first(item,["Contact","Contact Name","Person Name","Client","Customer","Name","Property Manager"]),phone:first(item,["Phone","Phone Number","Mobile"]),email:first(item,["Email","Email Address"]),amount:amount(item),fields:cleanFields(item),fileRefs:fileRefs(item)}; }
async function boards(env){
  const q=`query($ids:[ID!]){boards(ids:$ids){id name items_page(limit:250){items{id name url group{id title} column_values{id text value column{title}}}}}}`;
  const d=await mq(env,q,{ids:BOARD_IDS.map(x=>x[2])});
  return (d.boards||[]).map(b=>{ const cfg=BOARD_IDS.find(x=>x[2]===String(b.id))||["board",b.name,String(b.id)]; const bm={key:cfg[0],name:b.name||cfg[1],id:String(b.id)}; return {...bm,items:(b.items_page?.items||[]).map(i=>itemOut(i,bm))}; });
}
async function enrichFiles(env,items){
  const refs=[]; for(const it of items){ for(const f of it.fileRefs||[]) refs.push({...f,itemName:it.name,itemUrl:it.url,boardName:it.boardName,boardKey:it.boardKey}); }
  const ids=[...new Set(refs.map(x=>x.assetId))].slice(0,500); let assets={};
  if(ids.length){ try{ const q=`query($ids:[ID!]){assets(ids:$ids){id name url public_url file_extension file_size created_at}}`; const d=await mq(env,q,{ids}); for(const a of d.assets||[]) assets[String(a.id)]=a; }catch(e){} }
  return refs.map(f=>{ const a=assets[f.assetId]||{}; return {...f,name:a.name||f.name,url:a.public_url||a.url||"",ext:a.file_extension||"",size:a.file_size||"",created:a.created_at||""}; });
}
function by(items,fn){ const m={}; for(const x of items){ const k=fn(x)||"Uncategorized"; m[k]=(m[k]||0)+1; } return Object.entries(m).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count); }
function has(x,words){ const s=`${x.boardName} ${x.boardKey} ${x.group} ${x.name}`.toLowerCase(); return words.some(w=>s.includes(w)); }
async function data(env){
  const bs=await boards(env); const all=bs.flatMap(b=>b.items);
  const clients=all.filter(x=>has(x,["client","contact","customer","lead","intake"]));
  const projects=all.filter(x=>has(x,["project","job","work","hickory","restore","quote","estimate","checklist"]));
  const intakes=all.filter(x=>has(x,["intake","lead","request","inbound"]));
  const sales=all.filter(x=>has(x,["sales","agent","partner","commission"]));
  const messages=all.filter(x=>has(x,["message","follow","queue","email","whatsapp"]));
  const quotes=all.filter(x=>has(x,["quote","estimate","bid","proposal","pricing","price"]));
  const materials=all.filter(x=>has(x,["material","receipt","purchase","expense","inventory","primer","roller","caulk","paint"]));
  const schedule=all.filter(x=>x.date||/schedule|appointment|calendar|due|time tracking|start/i.test(`${x.boardName} ${x.name} ${x.status}`)).sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999")));
  const files=await enrichFiles(env,all);
  const pipeline=projects.reduce((s,x)=>s+(x.amount||0),0)+intakes.reduce((s,x)=>s+(x.amount||0),0)+quotes.reduce((s,x)=>s+(x.amount||0),0);
  return {ok:true,refreshedAt:new Date().toISOString(),diagnostics:{expectedBoards:BOARD_IDS.length,boardsReturned:bs.length,boardNames:bs.map(b=>b.name)},metrics:{boards:bs.length,records:all.length,clients:clients.length,projects:projects.length,schedule:schedule.length,files:files.length,quotes:quotes.length,materials:materials.length,sales:sales.length,messages:messages.length,pipeline},breakdowns:{boards:by(all,x=>x.boardName),projectStatus:by(projects,x=>x.status),scheduleSource:by(schedule,x=>x.boardName),filesByBoard:by(files,x=>x.boardName)},tabs:{overview:all.slice(0,100),clients,projects,schedule,files,quotes,materials,sales,messages,all}};
}
async function debug(env){ const q=`query($ids:[ID!]){me{id name} boards(ids:$ids){id name}}`; const d=await mq(env,q,{ids:BOARD_IDS.map(x=>x[2])}); return {ok:true,me:d.me,expectedBoards:BOARD_IDS.length,boardsReturned:(d.boards||[]).length,boards:d.boards||[],note:"If boardsReturned is 0, replace MONDAY_API_TOKEN in Cloudflare with a personal Monday API token that can read boards."}; }
function ui(){return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RHP Dashboard</title><style>:root{--bg:#111111;--panel:#1b1b1b;--p2:#272727;--text:#fff8ef;--muted:#cabca7;--brand:#f7931e;--brand2:#fdab3d;--green:#00c875;--line:rgba(255,255,255,.13)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,rgba(247,147,30,.22),transparent 34%),linear-gradient(180deg,#0b0b0b,#151515);color:var(--text);font-family:Arial,system-ui,sans-serif}.app{max-width:1340px;margin:auto;padding:14px}.hero,.card{background:rgba(27,27,27,.96);border:1px solid var(--line);border-radius:22px;padding:18px;margin:12px 0;box-shadow:0 16px 36px #0008}.brand{display:flex;gap:14px;align-items:center}.logo{display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#111;font-weight:900;box-shadow:0 0 22px rgba(247,147,30,.28)}h1{margin:0;font-size:clamp(1.8rem,5vw,3.4rem)}p{color:var(--muted);line-height:1.45}button,a.btn{border:0;border-radius:12px;padding:10px 13px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#111;font-weight:900;text-decoration:none;cursor:pointer}.tab,.secondary{background:var(--p2)!important;color:var(--text)!important;border:1px solid var(--line)!important}.tab.active{background:linear-gradient(135deg,var(--brand),var(--brand2))!important;color:#111!important}.controls,.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:12px}.metric{grid-column:span 3;background:linear-gradient(135deg,rgba(247,147,30,.16),rgba(253,171,61,.06));border:1px solid var(--line);border-radius:18px;padding:16px}.metric small{display:block;color:var(--muted)}.metric b{font-size:1.8rem}.record{border:1px solid var(--line);background:#ffffff08;border-radius:14px;padding:12px;margin:10px 0}.tag{display:inline-flex;border-radius:999px;background:#ffffff12;color:#eadfcd;padding:4px 8px;font-size:.82rem;margin:2px}.good{background:rgba(0,200,117,.14);color:#b8ffd7}.warn{background:rgba(253,171,61,.18);color:#ffe2b6}.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px}.col{background:#ffffff08;border-radius:10px;padding:8px}.col small{display:block;color:var(--muted)}input{width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:#101010;color:white}.alert{border-left:4px solid var(--brand2);background:rgba(253,171,61,.12);padding:12px;border-radius:12px;color:var(--muted)}.hidden{display:none!important}@media(max-width:900px){.metric{grid-column:span 6}}@media(max-width:600px){.metric{grid-column:span 12}}</style></head><body><main class="app"><section class="hero"><div class="brand"><div class="logo">RHP</div><div><h1>Revitalize Company Dashboard</h1><p>View-only dashboard. Updates happen in Monday, ChatGPT, Merlin, or Everheart Love.</p></div></div><div class="controls"><button onclick="load()">Refresh</button><a class="btn secondary" href="/company-data" target="_blank">Raw Data</a><a class="btn secondary" href="/debug" target="_blank">Debug</a><a class="btn secondary" href="/health" target="_blank">Health</a></div><p id="status">Loading Monday data...</p><div id="notice" class="alert hidden"></div><input id="q" oninput="render()" placeholder="Search clients, projects, address, files, materials, status..."><div id="tabs" class="tabs"></div></section><section id="metrics" class="grid"></section><section id="pane" class="card"></section></main><script>let D=null,T='overview';const N=[['overview','Overview'],['clients','Clients'],['projects','Projects'],['schedule','Schedule'],['files','Files'],['quotes','Quotes'],['materials','Materials'],['sales','Sales'],['messages','Messages'],['all','All Records']];function e(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}function mon(n){return '$'+Math.round(Number(n)||0).toLocaleString()}function m(k,v){return '<div class="metric"><small>'+e(k)+'</small><b>'+e(v)+'</b></div>'}function fields(a){return a&&a.length?'<div class="cols">'+a.slice(0,8).map(x=>'<div class="col"><small>'+e(x.title)+'</small><b>'+e(x.text)+'</b></div>').join('')+'</div>':''}function card(x){if(T==='files')return '<div class="record"><h3>'+e(x.name)+'</h3><span class="tag">'+e(x.boardName)+'</span><span class="tag">'+e(x.itemName)+'</span><div class="controls">'+(x.url?'<a class="btn" target="_blank" href="'+e(x.url)+'">Open / Download</a>':'')+(x.itemUrl?'<a class="btn secondary" target="_blank" href="'+e(x.itemUrl)+'">Related Monday Record</a>':'')+'</div></div>';return '<div class="record"><h3>'+e(x.name)+'</h3>'+(x.status?'<span class="tag good">'+e(x.status)+'</span>':'')+(x.boardName?'<span class="tag">'+e(x.boardName)+'</span>':'')+(x.date?'<span class="tag warn">'+e(x.date)+'</span>':'')+(x.amount?'<span class="tag warn">'+mon(x.amount)+'</span>':'')+(x.address?'<p>'+e(x.address)+'</p>':'')+(x.contact||x.email||x.phone?'<p>'+e([x.contact,x.phone,x.email].filter(Boolean).join(' · '))+'</p>':'')+(x.url?'<div class="controls"><a class="btn secondary" target="_blank" href="'+e(x.url)+'">Open in Monday</a></div>':'')+fields(x.fields)+'</div>'}function bars(a){if(!a||!a.length)return '<p>No data yet.</p>';return a.map(x=>'<div class="record"><b>'+e(x.name)+'</b><span class="tag">'+x.count+'</span></div>').join('')}function render(){if(!D)return;tabs.innerHTML=N.map(([k,n])=>'<button class="tab '+(T===k?'active':'')+'" onclick="T=\''+k+'\';render()">'+n+'</button>').join('');let list=T==='overview'?D.tabs.overview:D.tabs[T]||[];let s=(q.value||'').toLowerCase();list=list.filter(x=>!s||JSON.stringify(x).toLowerCase().includes(s));if(T==='overview')pane.innerHTML='<h2>Overview</h2><div class="grid"><div class="card" style="grid-column:span 4"><h3>Boards</h3>'+bars(D.breakdowns.boards)+'</div><div class="card" style="grid-column:span 4"><h3>Project Status</h3>'+bars(D.breakdowns.projectStatus)+'</div><div class="card" style="grid-column:span 4"><h3>Files by Board</h3>'+bars(D.breakdowns.filesByBoard)+'</div></div>';else pane.innerHTML='<h2>'+e(N.find(x=>x[0]===T)?.[1]||T)+'</h2>'+ (list.length?list.map(card).join(''):'<p>No records found.</p>')}async function load(){notice.classList.add('hidden');status.textContent='Refreshing Monday data...';let r=await fetch('/company-data?t='+Date.now(),{cache:'no-store'});D=await r.json();if(!D.ok){status.textContent='Error: '+(D.error||'failed');notice.textContent=D.error||'Failed';notice.classList.remove('hidden');return}metrics.innerHTML=m('Records',D.metrics.records)+m('Boards',D.metrics.boards)+m('Clients',D.metrics.clients)+m('Projects',D.metrics.projects)+m('Schedule',D.metrics.schedule)+m('Files',D.metrics.files)+m('Quotes',D.metrics.quotes)+m('Pipeline',mon(D.metrics.pipeline));if(D.metrics.records===0){notice.textContent='No Monday records returned. Open Debug. If boardsReturned is 0, the Cloudflare MONDAY_API_TOKEN needs to be replaced with a personal Monday API token that can read boards.';notice.classList.remove('hidden')}status.textContent='Loaded '+new Date(D.refreshedAt).toLocaleString();render()}load()</script></body></html>`;}
export default {async fetch(req,env){if(req.method==="OPTIONS")return new Response(null,{headers:h()});const u=new URL(req.url);try{if(u.pathname==="/"||u.pathname==="/health")return j({ok:true,service:"RHP Worker",dashboard:"/dashboard"});if(u.pathname==="/dashboard")return page(ui());if(u.pathname==="/company-data")return j(await data(env));if(u.pathname==="/debug")return j(await debug(env));return j({ok:false,error:"Not found",dashboard:"/dashboard"},404);}catch(e){return j({ok:false,error:e.message},500);}}};
