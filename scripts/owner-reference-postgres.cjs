/* Isolated real-PostgreSQL owner-reference acceptance. Never reads env files or a remote DB URL. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');

const argument = process.argv.find(value => value.startsWith('--tools-dir='));
if (!argument) throw new Error('Pass --tools-dir=<isolated embedded-postgres and pg installation>.');
const load = createRequire(path.join(path.resolve(argument.slice(12)), 'package.json'));
const { Client } = load('pg');
const root = path.resolve(__dirname, '..');
const marker = '-- Owner-reference integrity. Requires PostgreSQL 15 or later.';
const uid = randomUUID(), otherUid = randomUUID();
let server, admin, connection, count = 0;
const authSchema = `create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;`;
const grants = 'grant usage on schema public,auth to authenticated; grant select,insert,update,delete on all tables in schema public to authenticated; grant execute on function auth.uid() to authenticated';

async function check(name, test) { await test(); console.log(`ok ${++count} - ${name}`); }
async function connect(owner) {
  const client = new Client(connection);
  await client.connect();
  await client.query("set statement_timeout='8s'; set lock_timeout='6s'");
  if (owner) {
    await client.query('set role authenticated');
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  }
  return client;
}
async function reset() {
  await admin.query('truncate auth.users cascade');
  await admin.query('insert into auth.users(id) values($1),($2)', [uid,otherUid]);
}
async function category(owner) {
  const id = randomUUID();
  await admin.query("insert into categories(id,user_id,name) values($1,$2,$3)", [id,owner,`Synthetic ${id}`]);
  return id;
}
async function goal(owner) {
  const id = randomUUID();
  await admin.query("insert into savings_goals(id,user_id,title,target_amount) values($1,$2,'Synthetic goal',10000)", [id,owner]);
  return id;
}
const relations = [
  { table:'transactions', key:'category_id', parent:'categories', make:category, insert:"insert into transactions(id,user_id,category_id,amount,type,date) values($1,$2,$3,100,'expense','2026-09-22')" },
  { table:'budgets', key:'category_id', parent:'categories', make:category, insert:"insert into budgets(id,user_id,category_id,amount,month) values($1,$2,$3,100,'2026-09-01')" },
  { table:'bills', key:'category_id', parent:'categories', make:category, insert:"insert into bills(id,user_id,category_id,amount,month,name,due_day) values($1,$2,$3,100,'2026-09-01','Synthetic bill',22)" },
  { table:'savings_contributions', key:'savings_goal_id', parent:'savings_goals', make:goal, insert:"insert into savings_contributions(id,user_id,savings_goal_id,amount,date) values($1,$2,$3,100,'2026-09-22')" }
];
async function foreignKeyRejected(client, text, values) {
  await assert.rejects(client.query(text, values), error => error.code === '23503');
}
async function main() {
  const EmbeddedPostgres = (await import(pathToFileURL(load.resolve('embedded-postgres')).href)).default;
  const socket = net.createServer();
  await new Promise((resolve,reject) => socket.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const password = randomUUID();
  const databaseDir = await fs.mkdtemp(path.join(os.tmpdir(),'finance-owner-postgres-'));
  server = new EmbeddedPostgres({databaseDir,port,user:'postgres',password,persistent:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
  await server.initialise(); await server.start();
  connection = {host:'127.0.0.1',port,user:'postgres',password,database:'postgres'};
  admin = await connect();
  console.log(`# ${(await admin.query('select version() version')).rows[0].version}`);
  const schema = await fs.readFile(path.join(root,'supabase/schema.sql'),'utf8');
  const migration = await fs.readFile(path.join(root,'supabase/owner-reference-integrity-update.sql'),'utf8');
  const normalize = value => value.replace(/\r\n/g,'\n').trim();
  assert.ok(schema.includes(marker));
  assert.ok(normalize(schema.slice(schema.indexOf(marker))).startsWith(normalize(migration)), 'Baseline contains the exact owner-reference migration');
  await admin.query(`${authSchema} create role authenticated nologin; create role anon nologin;`);
  await admin.query(schema.slice(0,schema.indexOf(marker)));
  await admin.query(grants);

  await check('reproduce old direct-API gap and reject legacy mismatches without discarding data', async () => {
    await reset();
    const foreignCategory = await category(otherUid), id=randomUUID(), client=await connect(uid);
    try {
      assert.equal((await client.query('select id from categories where id=$1',[foreignCategory])).rowCount,0);
      await client.query(relations[0].insert,[id,uid,foreignCategory]);
    } finally { await client.end(); }
    await assert.rejects(admin.query(migration),/Cross-owner/); await admin.query('rollback');
    assert.equal((await admin.query('select category_id from transactions where id=$1',[id])).rows[0].category_id,foreignCategory);
    assert.equal((await admin.query("select to_regclass('public.categories_id_user_id_unique') as idx")).rows[0].idx,null);
    await reset();
  });
  await check('migration can be applied and replayed', async () => {
    await admin.query(migration); await admin.query(migration);
    const result=await admin.query("select count(*)::int n from pg_constraint where connamespace='public'::regnamespace and contype='f' and array_length(conkey,1)=2 and convalidated");
    assert.equal(result.rows[0].n,4);
  });
  for (const relation of relations) {
    await check(`${relation.table}: owned links succeed; foreign inserts and updates fail for user and administrator`, async () => {
      await reset(); const own=await relation.make(uid), foreign=await relation.make(otherUid), id=randomUUID(), client=await connect(uid);
      try {
        await client.query(relation.insert,[id,uid,own]);
        for (const writer of [client,admin]) {
          await foreignKeyRejected(writer,relation.insert,[randomUUID(),uid,foreign]);
          await foreignKeyRejected(writer,`update ${relation.table} set ${relation.key}=$1 where id=$2`,[foreign,id]);
        }
        await foreignKeyRejected(admin,`update ${relation.table} set user_id=$1 where id=$2`,[otherUid,id]);
        await foreignKeyRejected(admin,`update ${relation.parent} set user_id=$1 where id=$2`,[otherUid,own]);
        assert.equal((await client.query(`select ${relation.key} as parent from ${relation.table} where id=$1`,[id])).rows[0].parent,own);
      } finally { await client.end(); }
    });
  }
  await check('category deletion nulls only category IDs and cascades category budgets', async () => {
    await reset(); const parent=await category(uid);
    for (const relation of relations.slice(0,3)) await admin.query(relation.insert,[randomUUID(),uid,parent]);
    await admin.query('delete from categories where id=$1',[parent]);
    for (const table of ['transactions','bills']) {
      const record=(await admin.query(`select category_id,user_id from ${table}`)).rows[0];
      assert.equal(record.category_id,null); assert.equal(record.user_id,uid);
    }
    assert.equal((await admin.query('select id from budgets')).rowCount,0);
  });
  await check('goal deletion cascades contributions and retains the other account', async () => {
    await reset(); const parent=await goal(uid), other=await goal(otherUid);
    await admin.query(relations[3].insert,[randomUUID(),uid,parent]);
    await admin.query(relations[3].insert,[randomUUID(),otherUid,other]);
    await admin.query('delete from savings_goals where id=$1',[parent]);
    const records=await admin.query('select user_id from savings_contributions');
    assert.equal(records.rowCount,1); assert.equal(records.rows[0].user_id,otherUid);
  });
  await check('account erasure still cascades category links, goals and linked bills', async () => {
    await reset(); const own=await category(uid), other=await category(otherUid), ownGoal=await goal(uid);
    const tx=randomUUID(), bill=randomUUID();
    await admin.query(relations[0].insert,[tx,uid,own]);
    await admin.query(relations[2].insert,[bill,uid,own]);
    await admin.query(relations[1].insert,[randomUUID(),uid,own]);
    await admin.query(relations[3].insert,[randomUUID(),uid,ownGoal]);
    await admin.query(relations[0].insert,[randomUUID(),otherUid,other]);
    await admin.query("insert into bill_payments(user_id,bill_id,transaction_id,month,amount,paid_at) values($1,$2,$3,'2026-09-01',100,'2026-09-22')",[uid,bill,tx]);
    await admin.query('delete from auth.users where id=$1',[uid]);
    for (const table of ['categories','transactions','budgets','bills','bill_payments','savings_goals','savings_contributions']) assert.equal((await admin.query(`select id from ${table} where user_id=$1`,[uid])).rowCount,0);
    assert.equal((await admin.query('select id from transactions where user_id=$1',[otherUid])).rowCount,1);
  });
  await check('concurrent reference insertion prevents parent ownership reassignment', async () => {
    await reset(); const parent=await category(uid), first=await connect(uid), second=await connect();
    try {
      await first.query('begin');
      await first.query(relations[0].insert,[randomUUID(),uid,parent]);
      const pid=(await second.query('select pg_backend_pid() pid')).rows[0].pid;
      let settled=false;
      const pending=second.query('update categories set user_id=$1 where id=$2',[otherUid,parent]).then(value=>{settled=true;return{value};},error=>{settled=true;return{error};});
      let blocked=false;
      for (let attempt=0;attempt<100;attempt++) {
        if ((await admin.query('select wait_event_type from pg_stat_activity where pid=$1',[pid])).rows[0]?.wait_event_type==='Lock') {blocked=true;break;}
        if (settled) break;
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      assert.ok(blocked,'Expected a real PostgreSQL foreign-key lock wait');
      await first.query('commit');
      assert.equal((await pending).error?.code,'23503');
    } finally { await first.query('rollback').catch(()=>{}); await Promise.all([first.end(),second.end()]); }
  });
  await check('complete fresh schema installs with owned relationships enforced', async () => {
    await admin.query('drop schema public cascade; drop schema auth cascade; create schema public');
    await admin.query(authSchema); await admin.query(schema); await reset();
    const foreign=await category(otherUid);
    await foreignKeyRejected(admin,relations[0].insert,[randomUUID(),uid,foreign]);
  });
  console.log(`# ${count} real PostgreSQL checks passed; no remote database was accessed.`);
}
(async()=>{
  let exitCode=0;
  try { await main(); } catch(error) { console.error(error); exitCode=1; }
  finally { try { if(admin) await admin.end(); if(server) await server.stop(); } catch(error) { console.error('Disposable database cleanup failed:',error); exitCode=1; } }
  process.exit(exitCode);
})();
