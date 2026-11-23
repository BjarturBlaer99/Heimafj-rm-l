const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const runtimeModules = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || require.resolve('playwright', { paths: [process.cwd(), runtimeModules] }));
const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const configuredUrl = env.match(/^EXPO_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)/m)?.[1].trim();
if (!configuredUrl) throw new Error('A development Supabase URL is required to match intercepted requests.');
const backend = new URL(configuredUrl).origin;
const userId = '11111111-1111-4111-a111-111111111111';
const catId = '22222222-2222-4222-a222-222222222222';
const month = new Date().toISOString().slice(0,7);
const date = month + '-11';
const user = {id:userId,email:'iphone-test@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{full_name:'Prófun'}};
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = enc({alg:'HS256',typ:'JWT'})+'.'+enc({sub:userId,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,iss:backend+'/auth/v1'})+'.test-signature';
const session = {access_token:token,refresh_token:'local-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
const db = {profiles:[{id:userId,full_name:'Prófun',currency:'ISK'}],categories:[{id:catId,user_id:userId,name:'Matur',type:'expense'}],transactions:Array.from({length:1005},(_,i)=>({id:randomUUID(),user_id:userId,amount:10,type:'expense',date,note:'Sýnifærsla '+i,category_id:catId,created_at:new Date(2026,0,1,0,0,i).toISOString()})),bills:[],bill_payments:[],savings_buckets:[],savings_goals:[],savings_contributions:[]};
let failNextTransaction = false;
let reads = 0;
const errors=[];
function matches(row, params) {
  return [...params].every(([key,filter])=>{
    if (['select','order','limit','offset','on_conflict'].includes(key)) return true;
    const index=filter.indexOf('.'); const op=filter.slice(0,index); const value=filter.slice(index+1); const actual=row[key];
    if(op==='eq')return String(actual)===value;
    if(op==='gte')return String(actual)>=value;
    if(op==='lt')return String(actual)<value;
    if(op==='is')return value==='null'?actual==null:String(actual)===value;
    throw new Error('Unhandled filter '+key+'='+filter);
  });
}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await context.route(backend+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method();
  const fulfill=(body,status=200,headers={})=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*',...headers},body:JSON.stringify(body)});
  if(method==='OPTIONS')return fulfill({});
  if(url.pathname.startsWith('/auth/'))return fulfill(url.pathname.endsWith('/user')?user:session);
  const table=url.pathname.split('/').pop();
  if(!db[table])throw new Error('Unexpected table '+table);
  let rows=db[table].filter(row=>matches(row,url.searchParams));
  if(method==='GET'){
   reads++;
   for(const order of (url.searchParams.get('order')||'').split(',').reverse()) { const [key,direction]=order.split('.'); rows.sort((a,b)=>String(a[key]).localeCompare(String(b[key]))*(direction==='desc'?-1:1)); }
   const start=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||500);
   rows=rows.slice(start,start+limit).map(row=>table==='transactions'?{...row,categories:db.categories.find(c=>c.id===row.category_id)||null}:row);
  } else if(method==='POST') {
   if(table==='transactions'&&failNextTransaction){failNextTransaction=false;return fulfill({code:'42501',message:'synthetic rejection'},403);}
   const input=req.postDataJSON(); const values=Array.isArray(input)?input:[input]; rows=[];
   for(const value of values){
    const conflict=db[table].find(row=>row.id===value.id||table==='savings_buckets'&&row.user_id===value.user_id&&row.bucket_type===value.bucket_type||table==='bill_payments'&&row.bill_id===value.bill_id&&row.month===value.month);
    if(conflict){if(req.headers().prefer?.includes('resolution=merge-duplicates')){Object.assign(conflict,value);rows.push(conflict);continue;}return fulfill({code:'23505',message:'duplicate'},409);}
    const row={id:randomUUID(),created_at:new Date().toISOString(),series_id:randomUUID(),...value};db[table].push(row);rows.push(row);
    if(table==='savings_contributions')db.savings_goals.find(g=>g.id===row.savings_goal_id).current_amount+=row.amount;
   }
  } else if(method==='PATCH'){const update=req.postDataJSON();rows.forEach(row=>Object.assign(row,update));}
  else if(method==='DELETE'){
   rows.forEach(row=>{
    if(table==='savings_contributions')db.savings_goals.find(g=>g.id===row.savings_goal_id).current_amount-=row.amount;
    if(table==='transactions')db.bill_payments.filter(p=>p.transaction_id===row.id).forEach(p=>p.transaction_id=null);
   });db[table]=db[table].filter(row=>!rows.includes(row));
  } else throw new Error('Unexpected method '+method);
  if(req.headers().accept?.includes('vnd.pgrst.object'))return fulfill(rows[0]||null);
  return fulfill(rows);
 });
 await context.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:'sb-'+new URL(backend).hostname.split('.')[0]+'-auth-token',session});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 const click=async name=>{ console.log('button: '+name); await page.getByRole('button',{name,exact:true}).last().click(); };
 const field=async(name,value)=>page.getByRole('textbox',{name,exact:true}).fill(value);
 const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await page.waitForTimeout(100);}throw new Error('Fixture state timeout');};
 try {
  await page.goto(process.env.APP_URL||'http://localhost:8082',{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByText('Fjármálin í dag',{exact:true}).waitFor({timeout:120000});
  await page.getByText('10.050 kr.',{exact:true}).first().waitFor({timeout:30000});
  console.log('navigation');await page.getByRole('tab',{name:'Færslur'}).click();
  await click('Ný færsla');await field('Upphæð (kr.)','1.234,50');await field('Lýsing','QA kaffi');await click('Vista færslu');
  await wait(()=>db.transactions.some(t=>t.note==='QA kaffi'));assert.equal(db.transactions.find(t=>t.note==='QA kaffi').amount,1234.5);
  await page.getByRole('button',{name:/Breyta færslu: QA kaffi/}).click();await field('Upphæð (kr.)','2.000');await click('Vista færslu');await wait(()=>db.transactions.find(t=>t.note==='QA kaffi')?.amount===2000);
  await page.getByRole('button',{name:/Breyta færslu: QA kaffi/}).click();await click('Eyða færslu');await click('Já, eyða færslu');await wait(()=>!db.transactions.some(t=>t.note==='QA kaffi'));
  await click('Ný færsla');await field('Upphæð (kr.)','0');await click('Vista færslu');await page.getByRole('alert').waitFor();assert.equal(db.transactions.length,1005);await field('Upphæð (kr.)','75');await field('Lýsing','QA retry');failNextTransaction=true;await click('Vista færslu');await page.getByRole('alert').waitFor();await click('Vista færslu');await wait(()=>db.transactions.some(t=>t.note==='QA retry'));assert.equal(db.transactions.filter(t=>t.note==='QA retry').length,1);
  console.log('navigation');await page.getByRole('tab',{name:'Reikningar'}).click();await click('Bæta við reikningi');await field('Heiti reiknings','QA rafmagn');await field('Upphæð (kr.)','4500');await click('Bæta við reikningi');await wait(()=>db.bills.length===1);
  await page.getByRole('button',{name:/QA rafmagn.*Opna reikning/}).click();await click('Skrá sem greitt');await click('Skrá greiðslu');await wait(()=>db.bill_payments.length===1);assert.equal(db.transactions.filter(t=>t.note==='QA rafmagn').length,1);
  await page.getByRole('button',{name:/QA rafmagn.*Opna reikning/}).click();await click('Afturkalla greiðslu');await click('Afturkalla greiðslu');await wait(()=>db.bill_payments.length===0);assert.equal(db.transactions.filter(t=>t.note==='QA rafmagn').length,0);
  console.log('navigation');await page.getByRole('tab',{name:'Sparnaður'}).click();await click('Nýtt sparnaðarmarkmið');await field('Heiti markmiðs','QA ferð');await field('Markupphæð (kr.)','100000');await field('Upphafsstaða (kr.)','5000');await click('Búa til markmið');await wait(()=>db.savings_goals.length===1);
  await page.getByRole('button',{name:/QA ferð.*Opna markmið/}).click();await page.getByRole('radio',{name:'Bæta við',exact:true}).click();await field('Framlag (kr.)','1500');await click('Skrá framlag');await wait(()=>db.savings_contributions.length===1);assert.equal(db.savings_goals[0].current_amount,6500);
  await page.getByTestId('finance-form').waitFor({state:'hidden'});console.log('navigation');await page.getByRole('tab',{name:'Meira'}).click();await click('Breyta nafni');await field('Fullt nafn','Prófun iPhone');await click('Vista nafn');await wait(()=>db.profiles[0].full_name==='Prófun iPhone');await page.getByTestId('finance-form').waitFor({state:'hidden'});
  console.log('navigation');await page.getByRole('tab',{name:'Yfirlit'}).click();await page.getByText('Góðan dag, Prófun',{exact:true}).waitFor();await page.getByText('10.125 kr.',{exact:true}).first().waitFor();
  fs.mkdirSync(path.join(__dirname,'../.expo'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../.expo/qa-dashboard.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['totals beyond1000','transaction create/edit/delete','invalid amount and retry','bill pay/unpay linked expense','savings goal and trigger contribution','profile edit and dashboard refresh'],interceptedReads:reads,nativeDeviceTested:false}));
 }catch(error){await page.screenshot({path:path.join(__dirname,'../.expo/qa-failure.png'),fullPage:true});console.error((await page.locator('body').innerText()).slice(-8000));console.error({pageErrors:errors});throw error;}finally{await browser.close();}
})();