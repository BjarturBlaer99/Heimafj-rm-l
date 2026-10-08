// Local built-server email callback integration; synthetic single-use tokens only.
const assert=require('node:assert/strict');
const {writeFile}=require('node:fs/promises');
// Next.js normalizes loopback callback origins to localhost.
const origin='http://localhost:5191',checks=[];
const callback=(token,type,next='')=>fetch(`${origin}/auth/callback?token_hash=${token}&type=${type}${next}`,{redirect:'manual'});
const cookies=response=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
async function check(name,fn){await fn();checks.push(name);console.log(`ok ${checks.length} - ${name}`);}
(async()=>{
  const fixture=await (await fetch('http://127.0.0.1:5193/__fixture')).json();
  const reset=await fetch('http://127.0.0.1:5193/__control',{method:'POST',headers:{authorization:`Bearer ${fixture.session.access_token}`,'content-type':'application/json'},body:JSON.stringify({resetEmailTokens:true})});
  assert.equal(reset.status,200);
  await check('email recovery without browser cookies establishes a session and opens the reset form',async()=>{
    const result=await callback('synthetic-recovery-http','recovery','&next=https://evil.example');
    assert.equal(result.status,307);assert.equal(result.headers.get('location'),`${origin}/reset-password`);
    assert.match(result.headers.get('cache-control'),/no-store/);assert.equal(result.headers.get('referrer-policy'),'no-referrer');
    assert.ok(cookies(result));const page=await fetch(`${origin}/reset-password`,{headers:{cookie:cookies(result)},redirect:'manual'});
    assert.equal(page.status,200);assert.ok((await page.text()).includes('Veldu nýtt lykilorð'));
  });
  await check('reused recovery link redirects to a clear error without issuing another session',async()=>{
    const result=await callback('synthetic-recovery-http','recovery');assert.equal(result.headers.get('location'),`${origin}/login?error=invalid_auth_link`);assert.equal(cookies(result),'');
  });
  await check('new signup email establishes a usable session without the initiating browser',async()=>{
    const result=await callback('synthetic-signup-http','signup');assert.equal(result.headers.get('location'),`${origin}/dashboard`);
    const page=await fetch(`${origin}/dashboard`,{headers:{cookie:cookies(result)},redirect:'manual'});assert.equal(page.status,200);assert.ok((await page.text()).includes('Góðan daginn'));
  });
  await check('invalid email token never opens a protected account',async()=>{
    const result=await callback('synthetic-invalid','recovery');assert.equal(result.headers.get('location'),`${origin}/login?error=invalid_auth_link`);assert.equal(cookies(result),'');
  });
  await check('reset form without a session returns to password recovery',async()=>{
    const result=await fetch(`${origin}/reset-password`,{redirect:'manual'});
    if(result.headers.get('location')) assert.equal(new URL(result.headers.get('location'),origin).href,`${origin}/forgot-password?error=invalid_reset_link`);
    else {
      // Once the public layout is streamed, Next.js sends the redirect in HTML.
      const body=await result.text();assert.equal(result.status,200);
      assert.match(body,/<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=\/forgot-password\?error=invalid_reset_link"/);
      assert.doesNotMatch(body,/<input[^>]+name="password"/);
    }
  });
  await writeFile('docs/qa/2026-10-07/local-auth.json',JSON.stringify({timestamp:new Date().toISOString(),passed:checks.length,checks,backend:'Synthetic loopback Auth; real inbox flow still requires live templates and deployment'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
