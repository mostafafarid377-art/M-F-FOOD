import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('phase 7 isolated migration preserves cash and reconciliation while blocking new online payments',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;
 create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;`);
 const core=await readFile('supabase/migrations/20240101_01_create_core_tables.sql','utf8');await db.exec(core.replace('create extension if not exists "uuid-ossp";','-- test uuid'));await db.exec('create publication supabase_realtime');
 for(const file of ['20240102_02_auth_and_order_creation.sql','20240103_03_admin_kitchen.sql','20240104_04_tables_delivery.sql','20240105_05_checkout_details.sql','20240106_06_kitchen_tracking_permissions.sql','20240107_07_payments.sql','20240108_08_saved_delivery_address.sql'])await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated');
 const id='00000000-0000-4000-8000-000000000101', item='00000000-0000-4000-8000-100000000001';
 await db.query('insert into auth.users(id,raw_user_meta_data) values($1,\'{}\')',[id]);await db.query("insert into menu_items(id,name,price) values($1,'Burger',12500)",[item]);
 await db.exec("update payment_methods set enabled=true where code='paymob'");
 const items=JSON.stringify([{menu_item_id:item,quantity:2,price:1}]);const call='select create_checkout_order($1,$2::jsonb,$3,1,null,null,null,null,null,null,null,null) as id';
 const as=async()=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
 await as();const online=(await db.query(call,['00000000-0000-4000-8000-000000001101',items,'paymob'])).rows[0].id;
 const unclaimed=(await db.query(call,['00000000-0000-4000-8000-000000001102',items,'paymob'])).rows[0].id;
 await db.exec('reset role;set role service_role');const claim=(await db.query('select claim_paymob_intention($1,$2) as data',[online,id])).rows[0].data;
 await db.exec('reset role');await db.exec(await readFile('supabase/migrations/20240109_09_phase7_safety.sql','utf8'));
 await as();const cash=(await db.query(call,['00000000-0000-4000-8000-000000001103',items,'cash'])).rows[0].id;
 assert.equal((await db.query('select amount from payments where order_id=$1',[cash])).rows[0].amount,25000);
 await assert.rejects(db.query(call,['00000000-0000-4000-8000-000000001104',items,'paymob']),/online_payments_paused/);
 const legacy=(await db.query('select create_order($1::jsonb,null,1) as id',[items])).rows[0].id;
 assert.equal((await db.query('select amount from payments where order_id=$1',[legacy])).rows[0].amount,25000);
 await assert.rejects(db.query('select create_order($1::jsonb,null,1)',[JSON.stringify([{menu_item_id:item,quantity:101}])]),/invalid_quantity/);
 // Authenticated inactive staff do not inherit legacy table-session access.
 await db.exec("reset role;select set_config('request.jwt.claim.sub','',false)");const employee='00000000-0000-4000-8000-000000000105';
 await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{}')",[employee]);
 await db.query("update profiles set role='staff' where id=$1",[employee]);
 await db.query("insert into staff_members(profile_id,role,is_active) values($1,'server',false)",[employee]);
 await db.exec("insert into table_sessions(table_number,status) values(77,'occupied')");
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[employee]);
 assert.equal((await db.query('select * from table_sessions where table_number=77')).rows.length,0);
 await db.exec('reset role');await db.query('update staff_members set is_active=true where profile_id=$1',[employee]);
 await db.exec('set role authenticated');assert.equal((await db.query('select * from table_sessions where table_number=77')).rows.length,1);
 await db.exec('reset role;set role service_role');await assert.rejects(db.query('select claim_paymob_intention($1,$2)',[unclaimed,id]),/online_payments_paused/);
 await db.query("select finish_paymob_intention($1,'111','pi_test_example')",[claim.payment_id]);
 assert.equal((await db.query("select apply_paymob_transaction('111','123',25000,'EGP','paid') as state")).rows[0].state,'ok');
 }finally{await db.close();}
});
