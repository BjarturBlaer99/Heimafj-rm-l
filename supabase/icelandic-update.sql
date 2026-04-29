-- Run this once if you already created the database before switching the app to Icelandic/ISK.

update public.profiles
set currency = 'ISK'
where currency is null or currency = 'USD';

update public.categories set name = 'Húsnæði' where is_default = true and name = 'Housing';
update public.categories set name = 'Matur' where is_default = true and name = 'Food';
update public.categories set name = 'Samgöngur' where is_default = true and name = 'Transport';
update public.categories set name = 'Reikningar' where is_default = true and name = 'Utilities';
update public.categories set name = 'Innkaup' where is_default = true and name = 'Shopping';
update public.categories set name = 'Heilsa' where is_default = true and name = 'Health';
update public.categories set name = 'Afþreying' where is_default = true and name = 'Entertainment';
update public.categories set name = 'Laun' where is_default = true and name = 'Salary';
update public.categories set name = 'Verktakavinna' where is_default = true and name = 'Freelance';
update public.categories set name = 'Sparnaður' where is_default = true and name = 'Savings';
update public.categories set name = 'Annað' where is_default = true and name = 'Other';

insert into public.categories (user_id, name, type, is_default)
select distinct user_id, 'Áskriftir', 'expense', true
from public.categories
on conflict (user_id, name) do nothing;
