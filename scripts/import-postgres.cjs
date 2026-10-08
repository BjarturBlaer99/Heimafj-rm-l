/* Real import actions + isolated PostgreSQL. Never opens a remote database or env file. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const argument = process.argv.find(value => value.startsWith('--tools-dir='));
if (!argument) throw new Error('Pass --tools-dir=<isolated embedded-postgres and pg installation>.');
const load = createRequire(path.join(path.resolve(argument.slice(12)), 'package.json'));
const { Client } = load('pg');
const root = path.resolve(__dirname, '..');
const uid = randomUUID(), otherUid = randomUUID();
let server, admin, connection, count = 0;
const compiled = new Map();
function moduleFor(file, mocks) {
  if (!compiled.has(file)) compiled.set(file, ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
  const exports = {};
  new Function('require','exports',compiled.get(file))(id => Object.hasOwn(mocks,id) ? mocks[id] : id.startsWith('@/') ? moduleFor(`${id.slice(2)}.ts`,mocks) : require(id), exports);
  return exports;
}
async function check(name, test) { const start=performance.now(); await test(); console.log(`ok ${++count} - ${name} (${Math.round(performance.now()-start)} ms)`); }
async function connect(owner) {
  const client=new Client(connection); await client.connect();
  await client.query("set statement_timeout='20s'; set lock_timeout='15s'");
  if(owner) { await client.query('set role authenticated'); await client.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]); }
  return client;
}
async function reset() { await admin.query('truncate auth.users cascade'); await admin.query('insert into auth.users(id) values($1),($2)',[uid,otherUid]); }
const row=(changes={})=>({sourceIndex:0,date:'2026-10-07',note:'Bónus',amount:1250.5,type:'expense',category_id:null,decision:'import',...changes});
const input=(rows=[row()], userId=uid)=>({batchId:randomUUID(),userId,rows});
function barrier(total) { let arrivals=0,release; const ready=new Promise(resolve=>{release=resolve;}); return async()=>{ if(++arrivals===total) release(); await ready; }; }
async function actionClient(owner=uid, options={}) {
  const pg=await connect(owner); let writes=0;
  const client={auth:{getUser:async()=>({data:{user:{id:owner}},error:null})},from(table) {
    assert.ok(['transactions','categories'].includes(table));
    let fields='*',filters=[],parameters=[],offset=0,limit=null,order='',payload;
    const filter=(key,operation,value)=>{ assert.match(key,/^[a-z_]+$/); parameters.push(value); filters.push(`${key} ${operation} $${parameters.length}`); return query; };
    const query={
      select(value){fields=value;assert.match(fields,/^[a-z_,*]+$/);return query;},
      eq(key,value){return filter(key,'=',value);}, gte(key,value){return filter(key,'>=',value);}, lte(key,value){return filter(key,'<=',value);},
      in(key,value){assert.equal(key,'id');parameters.push(value);filters.push(`id=any($${parameters.length}::uuid[])`);return query;},
      order(key){assert.equal(key,'id');order=' order by id';return query;},range(first,last){offset=first;limit=last-first+1;return query;},
      upsert(value,config){assert.deepEqual(config,{onConflict:'id',ignoreDuplicates:true});payload=value;return query;},
      then(resolve,reject){ return (async()=>{
        try {
          if(payload) {
            writes++;
            if(writes===1) await options.beforeFirstWrite?.();
            const result=await pg.query(`insert into transactions(id,user_id,date,note,amount,type,category_id,import_key)
              select id,user_id,date,note,amount,type::transaction_type,category_id,import_key
              from jsonb_to_recordset($1::jsonb) as r(id uuid,user_id uuid,date date,note text,amount numeric,type text,category_id uuid,import_key text)
              on conflict(id) do nothing returning id`,[JSON.stringify(payload)]);
            if(options.uncertainFirstWrite && writes===1) return {data:null,error:{message:'Synthetic connection loss after commit'}};
            return {data:result.rows,error:null};
          }
          const result=await pg.query(`select ${fields} from ${table}${filters.length?' where '+filters.join(' and '):''}${order}${limit===null?'':` limit ${limit} offset ${offset}`}`,parameters);
          return {data:result.rows.map(record=>({...record,...(record.date?{date:record.date.toISOString().slice(0,10)}:{})})),error:null};
        } catch(error) { return {data:null,error:{code:error.code,message:error.message}}; }
      })().then(resolve,reject); }
    }; return query;
  }};
  const actions=moduleFor('lib/import-actions.ts',{'@/lib/supabase/server':{createClient:async()=>client},'next/navigation':{redirect:()=>{throw new Error('AUTH_REQUIRED');}},'next/cache':{revalidatePath(){}}});
  return {actions,pg,get writes(){return writes;},close:()=>pg.end()};
}
async function withClients(owners,options,test) {
  const clients=await Promise.all(owners.map(owner=>actionClient(owner,options)));
  try { await test(clients); } finally { await Promise.all(clients.map(client=>client.close())); }
}
async function main() {
  const EmbeddedPostgres=(await import(pathToFileURL(load.resolve('embedded-postgres')).href)).default;
  const socket=net.createServer(); await new Promise((resolve,reject)=>socket.once('error',reject).listen(0,'127.0.0.1',resolve));
  const port=socket.address().port; await new Promise(resolve=>socket.close(resolve));
  const password=randomUUID(),databaseDir=await fs.mkdtemp(path.join(os.tmpdir(),'finance-import-postgres-'));
  server=new EmbeddedPostgres({databaseDir,port,user:'postgres',password,persistent:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1'],onLog:()=>{},onError:()=>{}});
  await server.initialise(); await server.start(); connection={host:'127.0.0.1',port,user:'postgres',password,database:'postgres'};admin=await connect();
  console.log(`# ${(await admin.query('select version() version')).rows[0].version}`);
  await admin.query("create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'::jsonb); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create role authenticated nologin; create role anon nologin;");
  const schema=await fs.readFile(path.join(root,'supabase/schema.sql'),'utf8'),migration=await fs.readFile(path.join(root,'supabase/import-deduplication-update.sql'),'utf8');
  assert.ok(schema.replace(/\r\n/g,'\n').includes(migration.replace(/\r\n/g,'\n').trim()));
  const marker='-- Atomic duplicate protection across different file-import batches.';
  await admin.query(schema.slice(0,schema.indexOf(marker))); await reset();
  await admin.query("insert into transactions(user_id,date,note,amount,type) values($1,'2026-10-07','Legacy',1250.5,'expense')",[uid]);
  await check('migration preserves existing entries and can be applied twice',async()=>{
    await admin.query(migration);await admin.query(migration);
    assert.equal((await admin.query('select import_key from transactions')).rows[0].import_key,null);
  });
  await admin.query('grant usage on schema public,auth to authenticated,anon; grant select,insert,update,delete on all tables in schema public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon');
  await check('different batches race through preflight; shared row saved once and both unique rows retained',async()=>{
    await reset();await withClients([uid,uid],{beforeFirstWrite:barrier(2)},async([a,b])=>{
      const results=await Promise.all([a.actions.saveReviewedImport(input([row(),row({sourceIndex:1,note:'First only'})])),b.actions.saveReviewedImport(input([row({note:' BÓNUS  '}),row({sourceIndex:1,note:'Second only'})]))]);
      assert.deepEqual(results.map(r=>r.status),['complete','complete']);
      assert.equal(results.reduce((n,r)=>n+r.newlyImported,0),3);assert.equal(results.reduce((n,r)=>n+r.duplicatesSkipped,0),1);
      assert.equal((await admin.query('select id from transactions')).rowCount,3);assert.equal(a.writes+b.writes,3);
    });
  });
  await check('ten concurrent imports preserve exactly one expense and reconcile all results',async()=>{
    await reset();await withClients(Array(10).fill(uid),{beforeFirstWrite:barrier(10)},async clients=>{
      const results=await Promise.all(clients.map(client=>client.actions.saveReviewedImport(input())));
      assert.ok(results.every(r=>r.status==='complete'));assert.equal(results.reduce((n,r)=>n+r.newlyImported,0),1);
      assert.equal(results.reduce((n,r)=>n+r.duplicatesSkipped,0),9);assert.equal((await admin.query('select id from transactions')).rowCount,1);
    });
  });
  await check('same batch concurrency and retries retain one record',async()=>{
    await reset();const batch=input();await withClients([uid,uid],{beforeFirstWrite:barrier(2)},async([a,b])=>{
      const results=await Promise.all([a.actions.saveReviewedImport(batch),b.actions.saveReviewedImport(batch)]);
      assert.ok(results.every(r=>r.status==='complete'&&r.imported===1));assert.equal(results.reduce((n,r)=>n+r.newlyImported,0),1);
    });
  });
  await check('lost commit response is retryable against real stored data',async()=>{
    await reset();await withClients([uid],{uncertainFirstWrite:true},async([a])=>{
      const batch=input();await assert.rejects(a.actions.saveReviewedImport(batch));
      const result=await a.actions.saveReviewedImport(batch);assert.equal(result.imported,1);assert.equal(result.newlyImported,0);
    });
  });
  await check('edited imports release stale keys; a retry reports conflict without overwriting',async()=>{
    await reset();await withClients([uid],{},async([a])=>{
      const batch=input();await a.actions.saveReviewedImport(batch);
      await a.pg.query("update transactions set amount=2000 where user_id=$1",[uid]);
      assert.equal((await a.pg.query('select import_key from transactions')).rows[0].import_key,null);
      assert.equal((await a.actions.saveReviewedImport(batch)).status,'conflict');
      assert.equal((await a.actions.saveReviewedImport(input())).newlyImported,1);
    });
  });
  await check('description, date and type edits each clear the import key; category-only edits preserve it',async()=>{
    await reset();await withClients([uid],{},async([a])=>{
      for(const change of ["note='Edited'","date='2026-09-01'","type='income'"]) {
        await admin.query('delete from transactions');await a.actions.saveReviewedImport(input());await a.pg.query(`update transactions set ${change}`);
        assert.equal((await a.pg.query('select import_key from transactions')).rows[0].import_key,null);
      }
      await admin.query('delete from transactions');await a.actions.saveReviewedImport(input());
      const category=(await a.pg.query("select id from categories where user_id=$1 and type='expense' limit 1",[uid])).rows[0].id;
      await a.pg.query('update transactions set category_id=$1',[category]);assert.ok((await a.pg.query('select import_key from transactions')).rows[0].import_key);
    });
  });
  await check('manual identical entries remain valid and existing manual entries block file duplicates',async()=>{
    await reset();await withClients([uid],{},async([a])=>{
      await a.pg.query("insert into transactions(user_id,date,note,amount,type) values($1,'2026-10-07','Bónus',1250.5,'expense'),($1,'2026-10-07','Bónus',1250.5,'expense')",[uid]);
      const result=await a.actions.saveReviewedImport(input());assert.equal(result.imported,0);assert.equal(result.duplicatesSkipped,1);
      assert.equal((await a.pg.query('select id from transactions')).rowCount,2);
    });
  });
  await check('two users import identical expenses independently; RLS hides the other user',async()=>{
    await reset();await withClients([uid,otherUid],{},async([a,b])=>{
      const results=await Promise.all([a.actions.saveReviewedImport(input()),b.actions.saveReviewedImport(input([row()],otherUid))]);
      assert.ok(results.every(r=>r.newlyImported===1));assert.equal((await a.pg.query('select id from transactions')).rowCount,1);
      assert.equal((await admin.query('select id from transactions')).rowCount,2);
    });
  });
  await check('foreign categories and spoofed owners are rejected without writes',async()=>{
    await reset();const foreign=(await admin.query("select id from categories where user_id=$1 and type='expense' limit 1",[otherUid])).rows[0].id;
    await withClients([uid],{},async([a])=>{
      await assert.rejects(a.actions.saveReviewedImport(input([row({category_id:foreign})])));
      await assert.rejects(a.actions.saveReviewedImport(input([row()],otherUid)));
      assert.equal((await admin.query('select id from transactions')).rowCount,0);
    });
  });
  await check('anonymous requests cannot insert or see imported expenses',async()=>{
    const anon=await connect();try { await anon.query('set role anon');assert.equal((await anon.query('select id from transactions')).rowCount,0);
      await assert.rejects(anon.query("insert into transactions(user_id,date,note,amount,type,import_key) values($1,'2026-10-07','Anon',1,'expense',$2)",[uid,'a'.repeat(64)]),e=>e.code==='42501');
    } finally {await anon.end();}
  });
  await check('1,000-row import and repeat preserve all cents and require no new inserts on retry',async()=>{
    await reset();await withClients([uid],{},async([a])=>{
      const batch=input(Array.from({length:1000},(_,i)=>row({sourceIndex:i,note:`Unique ${i}`,amount:Number((i+0.29).toFixed(2))})));
      const result=await a.actions.saveReviewedImport(batch);assert.equal(result.newlyImported,1000);
      const retry=await a.actions.saveReviewedImport(batch);assert.equal(retry.imported,1000);assert.equal(retry.newlyImported,0);
      assert.equal((await a.pg.query('select id from transactions')).rowCount,1000);
      assert.equal((await a.pg.query('select sum(amount)::text total from transactions')).rows[0].total,'499790.00');
    });
  });
  console.log(`# ${count} real PostgreSQL import checks passed; no remote database accessed.`);
}
(async()=>{let exitCode=0;try{await main();}catch(error){console.error(error);exitCode=1;}finally{try{if(admin)await admin.end();if(server)await server.stop();}catch(error){console.error(error);exitCode=1;}}process.exit(exitCode);})();
