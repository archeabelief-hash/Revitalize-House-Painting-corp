/* Revitalize Monday Bridge
   Keeps the original Revitalize UI, but fills its old localStorage data model
   from the live Cloudflare Worker / Monday data feed.
*/
(function(){
  const WORKER = 'https://rhp-portal-worker.archeabelief.workers.dev';
  const CACHE = 'revitalize_monday_cache';
  const LEADS = 'revitalize_booking_leads';
  const ACCOUNTS = 'revitalize_accounts';
  const AGENTS = 'revitalize_sales_agents';
  const STATUS_ID = 'mondaySyncStatus';

  function safeJson(v,d){try{return JSON.parse(v || JSON.stringify(d));}catch(e){return d;}}
  function money(n){return '$' + Math.round(Number(n)||0).toLocaleString();}
  function text(v){return String(v == null ? '' : v).trim();}
  function lower(v){return text(v).toLowerCase();}
  function getField(item,names){
    const list = item.fields || [];
    for(const name of names){
      const f = list.find(x => lower(x.title) === lower(name));
      if(f && text(f.text)) return text(f.text);
    }
    return '';
  }
  function fieldContains(item,words){
    const hay = JSON.stringify(item || {}).toLowerCase();
    return words.some(w => hay.includes(w));
  }
  function estimate(item){
    if(item.amount) return money(item.amount);
    const vals = ['Estimate Total','Quote Total','Project Total','Total Project Value','Client Price','Customer Price','Premium Price','Materials Quote','Labor Quote Total'];
    for(const v of vals){const got=getField(item,[v]); if(got) return got.startsWith('$') ? got : money(Number(got)||0);}
    return '';
  }
  function leadFrom(item,source){
    const name = item.contact || item.name || getField(item,['Name','Contact Name','Person Name','Customer','Client']) || 'Unnamed Lead';
    const phone = item.phone || getField(item,['Phone','Phone Number','Mobile']);
    const email = item.email || getField(item,['Email','Email Address']);
    const address = item.address || getField(item,['Address','Job Address','Property Address','Location','Street Address']) || item.name || '';
    const service = getField(item,['Service','Service Category','Job Type','Category']) || item.group || item.boardName || source || '';
    const notes = getField(item,['Notes','Project Details','Description']) || (item.fields||[]).map(f=>f.title+': '+f.text).join('\n');
    const est = estimate(item);
    const total = item.amount || Number(String(est).replace(/[^0-9.]/g,'')) || 0;
    return {
      id: Number(String(item.id).replace(/\D/g,'')) || Date.now(),
      mondayId: item.id,
      mondayUrl: item.url || '',
      createdAt: item.date || new Date().toISOString(),
      status: item.status || getField(item,['Intake Status','Project Status','Pay Status']) || 'Monday',
      name, phone, email,
      customerType: getField(item,['Customer Type','Type']) || (fieldContains(item,['property manager']) ? 'Property Manager' : 'Customer'),
      address,
      mainServices: service,
      specificItems: item.name || service,
      roughEstimate: est || '$0',
      projectValue: total,
      adjustedProjectValue: total,
      collectedAmount: Number(getField(item,['Collected Amount','Paid','Amount Paid'])) || 0,
      scheduledDate: item.date || getField(item,['Date','Work Date','Due Date','Follow Up Date']) || '',
      details: notes,
      referralCode: getField(item,['Referral Code','Sales Code']) || ''
    };
  }
  function acctFrom(item,type){
    const name = item.contact || item.name || getField(item,['Name','Client','Customer','Contact Name']) || 'Unnamed Account';
    return {
      id: Number(String(item.id).replace(/\D/g,'')) || Date.now(),
      mondayId: item.id,
      mondayUrl: item.url || '',
      name,
      email: item.email || getField(item,['Email','Email Address']),
      phone: item.phone || getField(item,['Phone','Phone Number','Mobile']),
      type: type || getField(item,['Customer Type','Type']) || 'customer',
      status: item.status || 'active'
    };
  }
  function agentFrom(item){
    const name = item.contact || item.name || getField(item,['Name','Agent Name','Sales Partner']) || 'Sales Partner';
    return {
      id: Number(String(item.id).replace(/\D/g,'')) || Date.now(),
      mondayId: item.id,
      mondayUrl: item.url || '',
      name,
      email: item.email || getField(item,['Email','Email Address']),
      phone: item.phone || getField(item,['Phone','Phone Number']),
      code: getField(item,['Referral Code','Code','Sales Code']) || ('RHP' + String(item.id).slice(-6)),
      status: item.status || 'active'
    };
  }
  function uniqueBy(list,key){
    const seen = new Set();
    return list.filter(x=>{const k=lower(key(x)); if(!k || seen.has(k)) return false; seen.add(k); return true;});
  }
  function apply(data){
    const tabs = data.tabs || {};
    const projectItems = [].concat(tabs.projects||[], tabs.intakes||[]);
    const leadItems = uniqueBy(projectItems.map(x=>leadFrom(x,x.boardName)), x => x.mondayId || x.address + x.name);
    const clientItems = uniqueBy([].concat(tabs.clients||[], tabs.intakes||[], tabs.projects||[]).map(x=>acctFrom(x)), x => x.email || x.phone || x.name);
    const salesItems = uniqueBy((tabs.sales||[]).map(agentFrom), x => x.email || x.code || x.name);

    if(leadItems.length) localStorage.setItem(LEADS, JSON.stringify(leadItems));
    if(clientItems.length) localStorage.setItem(ACCOUNTS, JSON.stringify(clientItems));
    if(salesItems.length) localStorage.setItem(AGENTS, JSON.stringify(salesItems));
    localStorage.setItem(CACHE, JSON.stringify({refreshedAt:data.refreshedAt,metrics:data.metrics||{},tabs:data.tabs||{}}));
    window.REVITALIZE_MONDAY_DATA = data;

    const s = document.getElementById(STATUS_ID);
    if(s) s.textContent = 'Monday synced: ' + (data.metrics && data.metrics.records ? data.metrics.records : leadItems.length) + ' records · ' + new Date(data.refreshedAt || Date.now()).toLocaleString();

    setTimeout(function(){
      try{ if(typeof window.draw === 'function') window.draw(); }catch(e){}
      try{ if(typeof window.init === 'function') window.init(); }catch(e){}
      try{ if(typeof window.render === 'function') window.render(); }catch(e){}
    },50);
  }
  async function sync(){
    const s = document.getElementById(STATUS_ID);
    if(s) s.textContent = 'Syncing Monday data...';
    try{
      const r = await fetch(WORKER + '/company-data?t=' + Date.now(), {cache:'no-store'});
      const d = await r.json();
      if(!r.ok || !d.ok) throw new Error(d.error || 'Monday data failed');
      apply(d);
    }catch(e){
      const cached = safeJson(localStorage.getItem(CACHE), null);
      if(s) s.textContent = 'Monday sync issue: ' + e.message + (cached ? ' · showing cached/local data' : '');
      if(cached) window.REVITALIZE_MONDAY_DATA = cached;
    }
  }
  window.revitalizeSyncMonday = sync;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
