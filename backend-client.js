// Backend client (Supabase)
// You MUST paste your Supabase keys below

const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_KEY";

let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function dbInsert(table, data) {
  if (!supabaseClient) return null;
  const { error, data: res } = await supabaseClient.from(table).insert(data);
  if (error) console.error(error);
  return res;
}

async function dbSelect(table) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.from(table).select('*');
  if (error) console.error(error);
  return data || [];
}

async function dbUpdate(table, id, updates) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(table).update(updates).eq('id', id);
  if (error) console.error(error);
  return data;
}
