/* Real PostgreSQL integration suite. No application env files or remote DB URL are read.
 * See docs/bill-payment-deployment.md for the isolated, pinned tools installation.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');

const toolsArg = process.argv.find((value) => value.startsWith('--tools-dir='));
if (!toolsArg) throw new Error('Pass --tools-dir=<isolated directory containing embedded-postgres and pg>.');
const load = createRequire(path.join(path.resolve(toolsArg.slice(12)), 'package.json'));
const { Client } = load('pg');
const root = path.resolve(__dirname, '..');
const marker = '-- Apply before deploying existing-expense bill linking.';
const savingsMarker = '-- Apply before deploying atomic savings contributions.';
let admin, server, connection, count = 0;
const uid = randomUUID(), otherUid = randomUUID();

async function check(name, run) {
  await run();
  console.log(`ok ${++count} - ${name}`);
}
async function freePort() {
  const socket = net.createServer();
  await new Promise((resolve, reject) => socket.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
async function connect(userId) {
  const client = new Client(connection);
  await client.connect();
  await client.query("set statement_timeout = '8s'; set lock_timeout = '6s'");
  if (userId) {
    await client.query('set role authenticated');
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  }
  return client;
}
async function reset() {
  await admin.query('truncate auth.users cascade');
  await admin.query('insert into auth.users(id) values($1),($2)', [uid, otherUid]);
}
async function expense(owner = uid, amount = 1200, type = 'expense') {
  const id = randomUUID();
  await admin.query("insert into public.transactions(id,user_id,amount,type,date) values($1,$2,$3,$4,'2026-09-18')", [id,owner,amount,type]);
  return id;
}
async function bill(owner = uid) {
  const id = randomUUID();
  await admin.query("insert into public.bills(id,user_id,name,month,amount,due_day) values($1,$2,'Synthetic test bill','2026-09-01',1200,18)", [id,owner]);
  return id;
}
function paymentQuery(tx, b, overrides = {}) {
  return {text:'insert into public.bill_payments(id,user_id,bill_id,transaction_id,month,amount,paid_at) values($1,$2,$3,$4,$5,$6,$7)', values:[randomUUID(),overrides.owner ?? uid,b,tx,overrides.month ?? '2026-09-01',overrides.amount ?? 1200,overrides.date ?? '2026-09-18']};
}
async function rejected(client, query, pattern) {
  await assert.rejects(client.query(query), pattern);
}
// Return an object so the async helper does not await/adopt the blocked query promise.
async function beginBlocked(waiting, query) {
  const pid = (await waiting.query('select pg_backend_pid() pid')).rows[0].pid;
  let settled = false;
  const result = waiting.query(query).then(value => { settled = true; return { value }; },error => { settled = true; return { error }; });
  for (let i = 0; i < 100; i++) {
    const activity = await admin.query('select wait_event_type from pg_stat_activity where pid=$1', [pid]);
    if (activity.rows[0]?.wait_event_type === 'Lock') return { result };
    if (settled) { const outcome = await result; throw new Error(`Expected PostgreSQL lock wait: ${outcome.error?.message ?? 'query completed early'}`); }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Timed out waiting for the competing PostgreSQL write to block.');
}
async function race(firstQuery, secondQuery, expectedError) {
  const first = await connect(uid), second = await connect(uid);
  try {
    await first.query('begin');
    await first.query(firstQuery);
    const pending = await beginBlocked(second, secondQuery);
    await first.query('commit');
    const outcome = await pending.result;
    if (expectedError) assert.match(outcome.error?.message ?? '', expectedError);
    else assert.ifError(outcome.error);
  } finally {
    await first.query('rollback').catch(() => {});
    await Promise.all([first.end(),second.end()]);
  }
}

async function main() {
  const EmbeddedPostgres = (await import(pathToFileURL(load.resolve('embedded-postgres')).href)).default;
  const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'finance-bill-postgres-'));
  const port = await freePort();
  const password = randomUUID();
  server = new EmbeddedPostgres({databaseDir, port, user:'postgres', password, persistent:false, initdbFlags:['--encoding=UTF8','--locale=C'], postgresFlags:['-h','127.0.0.1'], onLog:()=>{}, onError:()=>{}});
  await server.initialise();
  await server.start();
  connection = {host:'127.0.0.1',port,user:'postgres',password,database:'postgres'};
  admin = await connect();
  console.log(`# ${(await admin.query('select version() version')).rows[0].version}`);
  const migration = await fs.readFile(path.join(root,'supabase/bill-payment-integrity-update.sql'),'utf8');
  const schema = await fs.readFile(path.join(root,'supabase/schema.sql'),'utf8');
  const savingsMigration = await fs.readFile(path.join(root,'supabase/savings-contribution-integrity-update.sql'),'utf8');
  const preflight = await fs.readFile(path.join(root,'supabase/production-readiness-check.sql'),'utf8');
  assert.equal(schema.slice(schema.indexOf(marker),schema.indexOf(savingsMarker)).replace(/\r\n/g,'\n').trim(), migration.replace(/\r\n/g,'\n').trim(), 'Fresh schema and bill upgrade migration must match');
  assert.equal(schema.slice(schema.indexOf(savingsMarker)).replace(/\r\n/g,'\n').trim(), savingsMigration.replace(/\r\n/g,'\n').trim(), 'Fresh schema and savings upgrade migration must match');
  const authSchema = `create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;`;
  await admin.query(`${authSchema} create role authenticated nologin; create role anon nologin; alter default privileges in schema public grant execute on functions to anon,authenticated;`);
  await admin.query(schema.slice(0,schema.indexOf(marker)));
  await admin.query('grant usage on schema public,auth to authenticated; grant select,insert,update,delete on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated');
  await check('read-only production preflight detects missing integrity installation without false baseline failures', async () => {
    const results = await admin.query(preflight);
    const rows=results.flatMap(result=>result.rows);
    assert.ok(rows.filter(row=>row.section==='prerequisite').every(row=>row.passed===true));
    assert.ok(rows.filter(row=>row.section==='installation').every(row=>row.passed===false));
  });
  await reset();
  await check('legacy duplicate links stop migration atomically without deleting records', async () => {
    const tx=await expense(), b1=await bill(), b2=await bill();
    await admin.query(paymentQuery(tx,b1)); await admin.query(paymentQuery(tx,b2));
    await rejected(admin,migration,/linked to multiple/);
    await admin.query('rollback');
    assert.equal((await admin.query('select count(*)::int n from bill_payments')).rows[0].n,2);
    assert.equal((await admin.query("select to_regclass('public.bill_payments_transaction_unique') as idx")).rows[0].idx,null);
    await reset();
  });
  await check('legacy mismatched links stop migration without rewriting financial history', async () => {
    const tx=await expense(), b=await bill(); await admin.query(paymentQuery(tx,b,{amount:1100}));
    await rejected(admin,migration,/differs from its expense or bill/); await admin.query('rollback');
    assert.equal((await admin.query('select amount from bill_payments')).rows[0].amount,'1100.00'); await reset();
  });
  await check('legacy unlinked historical payments remain intact', async () => {
    const b=await bill(); await admin.query(paymentQuery(null,b)); await admin.query(migration);
    assert.equal((await admin.query('select count(*)::int n from bill_payments where transaction_id is null')).rows[0].n,1); await reset();
  });
  await check('upgrade migration executes twice and revokes direct trigger execution', async () => {
    await admin.query(migration); await admin.query(migration);
    assert.equal((await admin.query("select has_function_privilege('authenticated','public.validate_bill_payment_expense()','execute') allowed")).rows[0].allowed,false);
  });
  await check('valid owned expense links and remains editable in non-financial fields', async () => {
    await reset(); const tx=await expense(), b=await bill(), client=await connect(uid);
    try { await client.query(paymentQuery(tx,b)); await client.query('update transactions set note=$1 where id=$2',['Updated note',tx]); }
    finally { await client.end(); }
    assert.equal((await admin.query('select count(*)::int n from bill_payments')).rows[0].n,1);
  });
  await check('amount, date, type, owner and direct deletion of linked expense are protected', async () => {
    await reset(); const tx=await expense(), b=await bill(); await admin.query(paymentQuery(tx,b));
    for (const sql of ['amount=1300',"date='2026-09-19'","type='income'",`user_id='${otherUid}'`]) await rejected(admin,`update transactions set ${sql} where id='${tx}'`,/Unlink/);
    await rejected(admin,`delete from transactions where id='${tx}'`,/Unlink/);
  });
  await check('mismatched amount/date/type/bill-month and missing expense are rejected', async () => {
    await reset(); const tx=await expense(), b=await bill(), income=await expense(uid,1200,'income');
    for (const params of [{amount:1199},{date:'2026-09-17'},{month:'2026-08-01'}]) await rejected(admin,paymentQuery(tx,b,params),/changed|owner and month/);
    await rejected(admin,paymentQuery(income,b),/expense owned/);
    await rejected(admin,paymentQuery(null,b),/must link/);
  });
  await check('RLS hides other owners and rejects cross-user payment/expense/bill ownership', async () => {
    await reset(); const tx=await expense(), otherTx=await expense(otherUid), b=await bill(), otherBill=await bill(otherUid), client=await connect(uid);
    try {
      assert.equal((await client.query('select * from transactions where id=$1',[otherTx])).rowCount,0);
      await rejected(client,paymentQuery(otherTx,b),/expense owned/);
      await rejected(client,paymentQuery(tx,otherBill),/owner and month/);
      await rejected(client,paymentQuery(otherTx,otherBill,{owner:otherUid}),/row-level security/);
    } finally { await client.end(); }
  });
  await check('duplicate links reject even when payment UUIDs differ', async () => {
    await reset(); const tx=await expense(), b1=await bill(), b2=await bill(); await admin.query(paymentQuery(tx,b1)); await rejected(admin,paymentQuery(tx,b2),/duplicate key/);
  });
  await check('unlink preserves expense and restores amount editing/deletion', async () => {
    await reset(); const tx=await expense(), b=await bill(); await admin.query(paymentQuery(tx,b)); await admin.query('delete from bill_payments');
    assert.equal((await admin.query('select count(*)::int n from transactions')).rows[0].n,1);
    await admin.query('update transactions set amount=1300 where id=$1',[tx]); await admin.query('delete from transactions where id=$1',[tx]);
  });
  await check('auth account deletion cascades linked records but leaves other account intact', async () => {
    await reset(); const tx=await expense(), b=await bill(), other=await expense(otherUid); await admin.query(paymentQuery(tx,b));
    await admin.query('delete from auth.users where id=$1',[uid]);
    for(const table of ['transactions','bills','bill_payments']) assert.equal((await admin.query(`select count(*)::int n from ${table} where user_id=$1`,[uid])).rows[0].n,0);
    assert.equal((await admin.query('select id from transactions where id=$1',[other])).rowCount,1);
  });
  await check('concurrent link wins over later expense edit', async () => {
    await reset(); const tx=await expense(), b=await bill(); await race(paymentQuery(tx,b),{text:'update transactions set amount=1300 where id=$1',values:[tx]},/Unlink/);
  });
  await check('concurrent expense edit wins and rejects stale link snapshot', async () => {
    await reset(); const tx=await expense(), b=await bill(); await race({text:'update transactions set amount=1300 where id=$1',values:[tx]},paymentQuery(tx,b),/changed/);
  });
  await check('concurrent link wins over later expense deletion', async () => {
    await reset(); const tx=await expense(), b=await bill(); await race(paymentQuery(tx,b),{text:'delete from transactions where id=$1',values:[tx]},/Unlink/);
  });
  await check('concurrent expense deletion wins and rejects waiting link', async () => {
    await reset(); const tx=await expense(), b=await bill(); await race({text:'delete from transactions where id=$1',values:[tx]},paymentQuery(tx,b),/expense owned/);
  });
  await check('competing links to one expense serialize and keep exactly one payment', async () => {
    await reset(); const tx=await expense(), b1=await bill(), b2=await bill(); await race(paymentQuery(tx,b1),paymentQuery(tx,b2),/duplicate key/);
    assert.equal((await admin.query('select count(*)::int n from bill_payments')).rows[0].n,1);
  });
  await check('linked bill month and owner are protected while descriptive edits remain available', async () => {
    await reset(); const tx=await expense(), b=await bill(); await admin.query(paymentQuery(tx,b));
    await rejected(admin,`update bills set month='2026-10-01' where id='${b}'`,/Unlink/);
    await rejected(admin,`update bills set user_id='${otherUid}' where id='${b}'`,/Unlink/);
    await admin.query('update bills set name=$1 where id=$2',['Revised description',b]);
  });
  await check('concurrent link wins over later bill month edit', async () => {
    await reset(); const tx=await expense(), b=await bill(); await race(paymentQuery(tx,b),{text:"update bills set month='2026-10-01' where id=$1",values:[b]},/Unlink/);
  });
  await check('concurrent bill month edit wins and rejects a stale link', async () => {
    await reset(); const tx=await expense(), b=await bill(); await race({text:"update bills set month='2026-10-01' where id=$1",values:[b]},paymentQuery(tx,b),/owner and month/);
  });
  function contribution(id = randomUUID(), amount = 100, overrides = {}) {
    return { text:'select * from public.add_savings_bucket_contribution($1,$2,$3,$4,$5,$6)', values:[id,overrides.bucket ?? 'sjodir',amount,overrides.date ?? '2026-09-18',overrides.note ?? null,overrides.label ?? 'Sjóðir'] };
  }
  async function balance(owner = uid) {
    return Number((await admin.query("select amount from savings_buckets where user_id=$1 and bucket_type='sjodir'",[owner])).rows[0]?.amount ?? 0);
  }
  await check('atomic savings migration executes twice with restricted invoker permissions', async () => {
    await admin.query(savingsMigration); await admin.query(savingsMigration);
    const fn='public.add_savings_bucket_contribution(uuid,public.savings_bucket_type,numeric,date,text,text)';
    assert.equal((await admin.query('select has_function_privilege($1,$2,$3) allowed',['anon',fn,'execute'])).rows[0].allowed,false);
    assert.equal((await admin.query('select prosecdef from pg_proc where oid=$1::regprocedure',[fn])).rows[0].prosecdef,false);
  });
  await check('a savings contribution atomically increments balance and stores its history', async () => {
    await reset(); const client=await connect(uid);
    try {
      const result=await client.query(contribution()); assert.equal(result.rows[0].already_recorded,false); assert.equal(Number(result.rows[0].balance),100);
    } finally { await client.end(); }
    assert.equal(await balance(),100);
    assert.equal((await admin.query('select count(*)::int n from savings_bucket_entries')).rows[0].n,1);
  });
  await check('internal seed RPCs deny cross-owner access while signup still creates categories and buckets', async () => {
    await reset(); const client=await connect(uid);
    try {
      await rejected(client,{text:'select public.seed_default_categories($1)',values:[otherUid]},/permission denied/);
      await rejected(client,{text:'select public.seed_savings_buckets($1)',values:[otherUid]},/permission denied/);
    } finally { await client.end(); }
    assert.equal((await admin.query('select count(*)::int n from categories where user_id=$1',[uid])).rows[0].n,12);
    assert.equal((await admin.query('select count(*)::int n from savings_buckets where user_id=$1',[uid])).rows[0].n,4);
    for(const fn of ['seed_default_categories(uuid)','seed_savings_buckets(uuid)']) {
      assert.equal((await admin.query('select has_function_privilege($1,$2,$3) allowed',['anon',`public.${fn}`,'EXECUTE'])).rows[0].allowed,false);
    }
  });
  await check('savings retries are idempotent and reject changed details', async () => {
    await reset(); const client=await connect(uid), request=randomUUID();
    try {
      await client.query(contribution(request)); const repeat=await client.query(contribution(request)); assert.equal(repeat.rows[0].already_recorded,true);
      for (const query of [contribution(request,200),contribution(request,100,{date:'2026-09-17'}),contribution(request,100,{bucket:'hlutabref'}),contribution(request,100,{note:'Changed'}),contribution(request,100,{label:'Changed'})]) await rejected(client,query,/different details/);
    } finally { await client.end(); }
    assert.equal(await balance(),100);
    assert.equal((await admin.query('select count(*)::int n from savings_bucket_entries')).rows[0].n,1);
  });
  await check('savings RPC rejects anonymous identity and cross-user request UUID reuse', async () => {
    await reset(); const client=await connect(uid), otherClient=await connect(otherUid), anonymous=await connect(), request=randomUUID();
    try {
      await anonymous.query('set role authenticated'); await rejected(anonymous,contribution(),/Authentication is required/);
      await client.query(contribution(request)); await rejected(otherClient,contribution(request),/request ID is unavailable/);
      assert.equal((await otherClient.query('select * from savings_bucket_entries where id=$1',[request])).rowCount,0);
    } finally { await Promise.all([client.end(),otherClient.end(),anonymous.end()]); }
    assert.equal(await balance(otherUid),0);
  });
  await check('savings RPC rejects invalid amounts, precision and excessive note/label lengths', async () => {
    await reset(); const client=await connect(uid);
    try {
      for (const amount of [0,-1,'NaN','Infinity',10000000000,0.001]) await rejected(client,contribution(randomUUID(),amount),/positive amount/);
      await rejected(client,contribution(randomUUID(),100,{note:'n'.repeat(501)}),/too long/);
      await rejected(client,contribution(randomUUID(),100,{label:'l'.repeat(81)}),/too long/);
      await rejected(client,contribution(randomUUID(),100,{date:'infinity'}),/positive amount/);
    } finally { await client.end(); }
    assert.equal(await balance(),0);
  });
  await check('savings contribution creates a missing bucket without losing its history', async () => {
    await reset(); await admin.query("delete from savings_buckets where user_id=$1 and bucket_type='sjodir'",[uid]); const client=await connect(uid);
    try { await client.query(contribution()); } finally { await client.end(); }
    assert.equal(await balance(),100);
    assert.equal((await admin.query('select count(*)::int n from savings_bucket_entries')).rows[0].n,1);
  });
  await check('savings history failure leaves balance untouched', async () => {
    await reset(); const client=await connect(uid);
    await admin.query("create function public.test_reject_history() returns trigger language plpgsql as $$ begin raise exception 'Synthetic history write failure'; end $$; create trigger test_reject_history before insert on public.savings_bucket_entries for each row execute function public.test_reject_history()");
    try { await rejected(client,contribution(),/Synthetic history write failure/); }
    finally { await client.end(); await admin.query('drop trigger test_reject_history on public.savings_bucket_entries; drop function public.test_reject_history()'); }
    assert.equal(await balance(),0);
    assert.equal((await admin.query('select count(*)::int n from savings_bucket_entries')).rows[0].n,0);
  });
  await check('savings balance overflow rolls the previously inserted history back', async () => {
    await reset(); await admin.query("update savings_buckets set amount=9999999999.99 where user_id=$1 and bucket_type='sjodir'",[uid]); const client=await connect(uid);
    try { await rejected(client,contribution(),/numeric field overflow/); }
    finally { await client.end(); }
    assert.equal(await balance(),9999999999.99);
    assert.equal((await admin.query('select count(*)::int n from savings_bucket_entries')).rows[0].n,0);
  });
  await check('simultaneous savings contributions retain both increments', async () => {
    await reset(); await race(contribution(randomUUID(),100),contribution(randomUUID(),250));
    assert.equal(await balance(),350);
    assert.equal((await admin.query('select count(*)::int n from savings_bucket_entries')).rows[0].n,2);
  });
  await check('simultaneous retry of one savings request increments only once', async () => {
    await reset(); const request=randomUUID(); await race(contribution(request),contribution(request));
    assert.equal(await balance(),100);
    assert.equal((await admin.query('select count(*)::int n from savings_bucket_entries')).rows[0].n,1);
  });
  await check('fresh-install schema executes in PostgreSQL with both migrations included', async () => {
    await admin.query('drop schema public cascade; drop schema auth cascade; create schema public');
    await admin.query(authSchema); await admin.query(schema); await reset();
    const tx=await expense(), b=await bill(); await admin.query(paymentQuery(tx,b));
    await rejected(admin,`update transactions set amount=1300 where id='${tx}'`,/Unlink/);
  });
  await check('read-only production verification passes with both integrity migrations installed', async () => {
    await admin.query('grant usage on schema public,auth to authenticated; grant select,insert,update,delete on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated');
    const results=await admin.query(preflight), rows=results.flatMap(result=>result.rows);
    assert.ok(rows.filter(row=>row.section).every(row=>row.passed===true),JSON.stringify(rows.filter(row=>row.section && !row.passed)));
    assert.ok(rows.filter(row=>Object.hasOwn(row,'owner_filter_matches')).every(row=>row.owner_filter_matches===true));
  });
  console.log(`# ${count} real PostgreSQL checks passed; no remote database was accessed.`);
}
(async () => {
  let exitCode=0;
  try { await main(); } catch(error) { console.error(error); exitCode=1; }
  finally {
    try { if(admin) await admin.end(); if(server) await server.stop(); }
    catch(error) { console.error('Disposable database cleanup failed:',error); exitCode=1; }
  }
  // embedded-postgres's beforeExit hook otherwise turns a failed suite into 0.
  // All clients and the disposable cluster have already been stopped above.
  process.exit(exitCode);
})();
