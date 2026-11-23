const fs = require('node:fs');
const path = require('node:path');
const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const get = name => envText.match(new RegExp('^'+name+'\\s*=\\s*["\']?([^"\'\\r\\n]+)','m'))?.[1].trim();
const url = get('EXPO_PUBLIC_SUPABASE_URL');
const key = get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
if (!url || !key || url.includes('gtgqxgddlqcvspegvxzt')) throw new Error('Configure the development project before checking its schema.');
(async () => {
 const tables = ['profiles','categories','transactions','budgets','bills','bill_payments','savings_buckets','savings_bucket_entries','savings_goals','savings_contributions'];
 let failed = false;
 for (const table of tables) {
  try { const response = await fetch(url+'/rest/v1/'+table+'?select=id&limit=0',{headers:{apikey:key},signal:AbortSignal.timeout(12000)}); console.log(table+': '+response.status); if(!response.ok)failed=true; }
  catch (error) { console.log(table+': connection failed ('+(error.cause?.code || error.name)+')'); failed=true; break; }
 }
 if(failed)process.exitCode=1;
})();
