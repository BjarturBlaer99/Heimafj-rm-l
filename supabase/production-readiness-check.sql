-- READ-ONLY: run before and after the two 2026-09-18 integrity migrations.
-- This script never repairs data, creates objects, or calls a mutation RPC.
-- Run as the project's database administrator so RLS cannot hide legacy rows.
-- BEFORE: all prerequisite checks must pass; installation checks may be false.
-- AFTER: every check must pass, ownership policies must match, and both legacy
-- counts in the NOTICE output must be 0. Review any unexpected extra policies.
-- Historical payments with transaction_id NULL are reported, not rejected.
--
-- Existing-project prerequisite order (only apply missing baseline migrations):
--   Base schema: auth.users/auth.uid(), transactions, set_updated_at().
--   bills-update.sql: monthly bills + bill_payments + series/month uniqueness.
--   savings-buckets-update.sql: enum + balance table + ownership policies.
--     WARNING: raw CREATE TYPE/trigger/policies; do NOT blindly rerun this file.
--   savings-bucket-entries-update.sql: contribution history + ownership policies.
-- Then apply bill-payment-integrity-update.sql followed by
-- savings-contribution-integrity-update.sql and rerun this read-only script.
-- Do not apply schema.sql to an existing database.

begin read only;
set local statement_timeout = '30s';

select current_database() as database_name, current_user as database_role,
       current_setting('server_version') as postgres_version,
       now() as checked_at,
       r.rolsuper or r.rolbypassrls as administrator_can_bypass_rls
from pg_roles r where r.rolname = current_user;

-- Expected: every prerequisite row has passed=true. Tables/columns which are
-- absent identify which baseline migration is missing; do not continue blindly.
with expected_tables(table_name, columns_needed) as (values
  ('public.transactions', array['id','user_id','amount','type','date']),
  ('public.bills', array['id','user_id','series_id','month','amount','is_active']),
  ('public.bill_payments', array['id','user_id','bill_id','transaction_id','month','amount','paid_at']),
  ('public.savings_buckets', array['id','user_id','bucket_type','label','amount']),
  ('public.savings_bucket_entries', array['id','user_id','bucket_type','label','amount','date','note'])
), inspected as (
  select e.table_name, c.oid, c.relrowsecurity,
         array(select unnest(e.columns_needed) except
               select a.attname::text from pg_attribute a
               where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) as missing_columns
  from expected_tables e left join pg_class c on c.oid=to_regclass(e.table_name)
)
select 'prerequisite' as section, table_name as check_name,
       oid is not null and relrowsecurity and cardinality(missing_columns)=0 as passed,
       jsonb_build_object('exists',oid is not null,'rls_enabled',coalesce(relrowsecurity,false),'missing_columns',missing_columns) as details
from inspected
union all
select 'prerequisite','auth.users and auth.uid()',
       to_regclass('auth.users') is not null and to_regprocedure('auth.uid()') is not null,
       '{}'::jsonb
union all
select 'prerequisite','authenticated role',exists(select 1 from pg_roles where rolname='authenticated'),'{}'::jsonb
union all
select 'prerequisite','anon role',exists(select 1 from pg_roles where rolname='anon'),'{}'::jsonb
union all
select 'prerequisite','savings bucket enum',
       coalesce((select array_agg(e.enumlabel::text order by e.enumsortorder) from pg_enum e
        where e.enumtypid=to_regtype('public.savings_bucket_type'))
         = array['serignarsparnadur','husnaedisparnadur','hlutabref','sjodir'],false),
       '{}'::jsonb
union all
select 'prerequisite','updated_at function',to_regprocedure('public.set_updated_at()') is not null,'{}'::jsonb
union all
select 'prerequisite','internal signup seed functions',
       to_regprocedure('public.seed_default_categories(uuid)') is not null
       and to_regprocedure('public.seed_savings_buckets(uuid)') is not null,'{}'::jsonb
order by section,check_name;

-- Expected: the two required conflict targets and history primary key are
-- valid, non-partial unique indexes. The bill-link index is installed by the
-- new bill migration; it must be unique/valid/partial exactly as shown.
with expected(table_name, column_names, partial) as (values
  ('public.bills',array['user_id','series_id','month'],false),
  ('public.bill_payments',array['user_id','bill_id','month'],false),
  ('public.savings_buckets',array['user_id','bucket_type'],false),
  ('public.savings_bucket_entries',array['id'],false),
  ('public.bill_payments',array['transaction_id'],true)
), indexes as (
  select i.*, array(select pg_get_indexdef(i.indexrelid,n,true)
                   from generate_series(1,i.indnkeyatts) n) as columns,
         pg_get_expr(i.indpred,i.indrelid) as predicate
  from pg_index i
)
select case when e.partial then 'installation' else 'prerequisite' end as section,
       e.table_name || ' unique (' || array_to_string(e.column_names,', ') || ')' as check_name,
       exists(select 1 from indexes i where i.indrelid=to_regclass(e.table_name)
              and i.indisunique and i.indisvalid and i.columns=e.column_names
              and case when e.partial then i.predicate='(transaction_id IS NOT NULL)' else i.indpred is null end) as passed,
       case when e.partial then 'transaction_id IS NOT NULL' else 'non-partial unique index' end as expected
from expected e;

-- Expected after migration: all 6 functions present, fixed search_path, and
-- PUBLIC execution revoked. The savings RPC alone grants authenticated access.
with expected(function_name, arguments, security_definer, callable, search_path_setting) as (values
  ('validate_bill_payment_expense','',true,false,'search_path=public, pg_temp'),
  ('protect_linked_bill_expense','',true,false,'search_path=public, pg_temp'),
  ('protect_linked_bill_identity','',true,false,'search_path=public, pg_temp'),
  ('add_savings_bucket_contribution','uuid, savings_bucket_type, numeric, date, text, text',false,true,'search_path=public, pg_temp'),
  ('seed_default_categories','uuid',true,false,'search_path=public'),
  ('seed_savings_buckets','uuid',true,false,'search_path=public')
), inspected as (
  select e.*,p.oid,p.prosecdef,p.proconfig,p.proacl,p.proowner,
         exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                where a.grantee=0 and a.privilege_type='EXECUTE') as public_can_execute,
         case when p.oid is not null and to_regrole('authenticated') is not null
              then has_function_privilege('authenticated',p.oid,'EXECUTE') else false end as authenticated_can_execute,
         case when p.oid is not null and to_regrole('anon') is not null
              then has_function_privilege('anon',p.oid,'EXECUTE') else false end as anon_can_execute
  from expected e left join pg_proc p on p.pronamespace=to_regnamespace('public')
       and p.proname=e.function_name and oidvectortypes(p.proargtypes)=e.arguments
)
select 'installation' as section, function_name as check_name,
       oid is not null and prosecdef=security_definer
       and coalesce(proconfig @> array[search_path_setting],false)
       and not public_can_execute and not anon_can_execute and authenticated_can_execute=callable as passed,
       jsonb_build_object('present',oid is not null,'security_definer',prosecdef,
         'configuration',proconfig,'public_can_execute',public_can_execute,
         'authenticated_can_execute',authenticated_can_execute,'anon_can_execute',anon_can_execute) as details
from inspected;

-- Expected after migration: all trigger checks pass. Definitions expose exact
-- timing/events/function for review; a disabled trigger does not pass.
with expected(table_name,trigger_name,function_name,trigger_type) as (values
  ('public.bill_payments','bill_payment_expense_integrity','validate_bill_payment_expense',23),
  ('public.transactions','protect_linked_bill_expense','protect_linked_bill_expense',27),
  ('public.bills','protect_linked_bill_identity','protect_linked_bill_identity',19)
)
select 'installation' as section,e.trigger_name as check_name,
       coalesce(t.tgenabled in ('O','A') and t.tgtype=e.trigger_type
                and p.proname=e.function_name and p.pronamespace=to_regnamespace('public'),false) as passed,
       case when t.oid is not null then pg_get_triggerdef(t.oid) end as definition
from expected e left join pg_trigger t on t.tgrelid=to_regclass(e.table_name)
  and t.tgname=e.trigger_name and not t.tgisinternal
left join pg_proc p on p.oid=t.tgfoid;

-- Expected: exactly 4 ownership policies per listed table. Extra policies are
-- included deliberately: permissive policies combine with OR and can weaken RLS.
select tablename,policyname,cmd,roles,qual,with_check,
       case cmd when 'SELECT' then qual='(auth.uid() = user_id)'
         when 'DELETE' then qual='(auth.uid() = user_id)'
         when 'INSERT' then with_check='(auth.uid() = user_id)'
         when 'UPDATE' then qual='(auth.uid() = user_id)' and with_check='(auth.uid() = user_id)'
         else false end as owner_filter_matches
from pg_policies where schemaname='public'
  and tablename in ('transactions','bills','bill_payments','savings_buckets','savings_bucket_entries')
order by tablename,cmd,policyname;

with expected(table_name) as (values ('transactions'),('bills'),('bill_payments'),('savings_buckets'),('savings_bucket_entries'))
select 'prerequisite' as section,e.table_name || ' four ownership policies' as check_name,
       count(p.policyname)=4 and count(distinct p.cmd)=4
       and coalesce(bool_and(case p.cmd when 'SELECT' then p.qual='(auth.uid() = user_id)'
         when 'DELETE' then p.qual='(auth.uid() = user_id)'
         when 'INSERT' then p.with_check='(auth.uid() = user_id)'
         when 'UPDATE' then p.qual='(auth.uid() = user_id)' and p.with_check='(auth.uid() = user_id)'
         else false end),false) as passed
from expected e left join pg_policies p on p.schemaname='public' and p.tablename=e.table_name
group by e.table_name;

with expected(table_name) as (values ('public.savings_buckets'),('public.savings_bucket_entries'))
select 'prerequisite' as section,e.table_name || ' authenticated RPC table access' as check_name,
       case when to_regrole('authenticated') is not null and to_regclass(e.table_name) is not null
         then has_table_privilege('authenticated',to_regclass(e.table_name),'SELECT')
          and has_table_privilege('authenticated',to_regclass(e.table_name),'INSERT')
          and has_table_privilege('authenticated',to_regclass(e.table_name),'UPDATE')
         else false end as passed
from expected e;

-- Legacy checks are dynamic so a missing table/column yields a useful NOTICE
-- instead of preventing the catalog checks above from running. Run as an admin;
-- a regular user's RLS visibility is not a valid project-wide preflight.
do $$
declare duplicate_count bigint; mismatch_count bigint; historical_count bigint;
begin
  if to_regclass('public.bill_payments') is null
     or to_regclass('public.transactions') is null or to_regclass('public.bills') is null then
    raise notice 'BLOCKED: legacy checks skipped because bill prerequisite tables are missing.';
    return;
  end if;
  begin
    execute 'select count(*) from (select transaction_id from public.bill_payments where transaction_id is not null group by transaction_id having count(*)>1) duplicates' into duplicate_count;
    execute 'select count(*) from public.bill_payments p join public.transactions t on t.id=p.transaction_id join public.bills b on b.id=p.bill_id where p.user_id<>t.user_id or t.type<>''expense'' or p.amount<>t.amount or p.paid_at<>t.date or p.user_id<>b.user_id or p.month<>b.month' into mismatch_count;
    execute 'select count(*) from public.bill_payments where transaction_id is null' into historical_count;
    raise notice 'LEGACY duplicate transaction links: % (expected 0)',duplicate_count;
    raise notice 'LEGACY mismatched linked payments: % (expected 0)',mismatch_count;
    raise notice 'INFO preserved historical unlinked payments: % (any count allowed)',historical_count;
    if duplicate_count<>0 or mismatch_count<>0 then
      raise notice 'BLOCKED: review legacy links before applying the bill integrity migration. No data was changed.';
    end if;
  exception when undefined_column then
    raise notice 'BLOCKED: legacy checks skipped because prerequisite columns are missing; review bills-update.sql.';
  end;
end $$;

commit;
