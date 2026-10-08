// Exercise the built Next.js export routes with a synthetic loopback session.
// No browser cookies, environment secrets, remote accounts, or remote requests.
const assert = require('node:assert/strict');
const { createServerClient } = require('@supabase/ssr');
const { writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const origin='http://127.0.0.1:5191',backend='http://127.0.0.1:5193';
const checks=[];
const cookieJar=new Map();
async function check(name,fn){await fn();checks.push(name);console.log(`ok ${checks.length} - ${name}`);}
(async()=>{
  const supabase=createServerClient(backend,'synthetic-local-anon-key',{cookies:{getAll:()=>[...cookieJar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>cookieJar.set(name,value))}});
  const {data,error}=await supabase.auth.signInWithPassword({email:'preview@example.invalid',password:'preview-password'});
  assert.equal(error,null);assert.equal(data.user.email,'preview@example.invalid');
  const headers={cookie:[...cookieJar].map(([name,value])=>`${name}=${value}`).join('; ')};
  const get=async format=>fetch(`${origin}/api/data/export?format=${format}`,{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
  let json,count;
  await check('JSON download includes the synthetic account and all ten data tables',async()=>{
    const result=await get('json');assert.equal(result.status,200);assert.match(result.headers.get('content-disposition'),/attachment; filename="min-fjarmal-.*\.json"/);
    assert.match(result.headers.get('cache-control'),/private, no-store/);json=await result.json();assert.equal(json.account.email,'preview@example.invalid');
    assert.equal(Object.keys(json.data).length,10);count=json.data.transactions.length;assert.ok(count>=36);
    for(const [table,rows] of Object.entries(json.data)) assert.ok(rows.every(row=>(table==='profiles'?row.id:row.user_id)===data.user.id));
  });
  await check('CSV attachment contains the same transaction count and preserved Icelandic text',async()=>{
    const result=await get('csv');assert.equal(result.status,200);assert.match(result.headers.get('content-disposition'),/\.csv"/);
    assert.match(result.headers.get('content-type'),/text\/csv/);const csv=await result.text();
    assert.equal(csv.split('\r\n').length-1,count);assert.ok(csv.includes('Mánaðarlaun'));assert.ok(csv.includes('Húsnæðislán og fasteignagjöld'));
  });
  await check('unsupported export format returns 400 without a downloadable file',async()=>{const result=await get('html');assert.equal(result.status,400);assert.equal(result.headers.get('content-disposition'),null);});
  await check('a partial backend read failure prevents misleading partial downloads',async()=>{
    const setFailure=async failReadTable=>fetch(`${backend}/__control`,{method:'POST',headers:{authorization:`Bearer ${data.session.access_token}`,'content-type':'application/json'},body:JSON.stringify({failReadTable})});
    assert.equal((await setFailure('transactions')).status,200);
    try { const result=await get('csv');assert.equal(result.status,503);assert.equal(result.headers.get('content-disposition'),null); }
    finally { assert.equal((await setFailure(null)).status,200); }
    const retry=await get('csv');assert.equal(retry.status,200);
  });
  await check('anonymous export does not return account data',async()=>{const result=await fetch(`${origin}/api/data/export?format=json`);assert.equal(result.status,401);assert.equal(result.headers.get('content-disposition'),null);});
  await writeFile(resolve('docs/qa/2026-10-07/local-exports.json'),JSON.stringify({timestamp:new Date().toISOString(),passed:checks.length,checks,transactionCount:count,account:'synthetic preview only'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
