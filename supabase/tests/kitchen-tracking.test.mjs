import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('active staff kitchen access and immutable post-checkout destinations', async () => {
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
      create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;`);
    const core=await readFile('supabase/migrations/20240101_01_create_core_tables.sql','utf8');
    await db.exec(core.replace('create extension if not exists "uuid-ossp";', '-- test UUID'));
    await db.exec('create publication supabase_realtime');
    for (const file of ['20240102_02_auth_and_order_creation.sql','20240103_03_admin_kitchen.sql','20240104_04_tables_delivery.sql','20240105_05_checkout_details.sql']) await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
    // Model Supabase's default table grants; the migration must revoke writes.
    await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated');
    await db.exec(await readFile('supabase/migrations/20240106_06_kitchen_tracking_permissions.sql','utf8'));
    const ids={customer:'00000000-0000-4000-8000-000000000101',other:'00000000-0000-4000-8000-000000000102',server:'00000000-0000-4000-8000-000000000103',cashier:'00000000-0000-4000-8000-000000000104',chef:'00000000-0000-4000-8000-000000000105',inactive:'00000000-0000-4000-8000-000000000106',manager:'00000000-0000-4000-8000-000000000107',item:'00000000-0000-4000-8000-100000000001'};
    for (const id of [ids.customer,ids.other,ids.server,ids.cashier,ids.chef,ids.inactive,ids.manager]) await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',[id,'{}']);
    await db.query("update profiles set role='staff' where id in ($1,$2,$3,$4,$5)",[ids.server,ids.cashier,ids.chef,ids.inactive,ids.manager]);
    await db.query("insert into staff_members(profile_id,role,is_active) values($1,'server',true),($2,'cashier',true),($3,'chef',true),($4,'server',false),($5,'manager',true)",[ids.server,ids.cashier,ids.chef,ids.inactive,ids.manager]);
    await db.query("insert into menu_items(id,name,price) values($1,'Burger',12500)",[ids.item]);
    const as=async(id)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
    await as(ids.customer);
    const items=JSON.stringify([{menu_item_id:ids.item,quantity:1}]);
    const order=(await db.query("select create_order_with_delivery_details($1::jsonb,'B','3','2','Main St','01234567890','Door',30.05,31.22) as id",[items])).rows[0].id;
    const legacy=(await db.query("select create_order($1::jsonb,'Old address',null) as id",[items])).rows[0].id;
    await assert.rejects(db.query('select set_delivery_destination($1,29,30)',[order]),/permission denied/);
    await assert.rejects(db.query('select set_delivery_destination($1,29,30)',[legacy]),/permission denied/);
    await assert.rejects(db.query('update delivery_destinations set latitude=29 where order_id=$1',[order]),/permission denied/);
    await assert.rejects(db.query('insert into delivery_destinations(order_id,latitude,longitude) values($1,29,30)',[legacy]),/permission denied/);
    const tracking=(await db.query('select customer_tracking($1) as data',[order])).rows[0].data;assert.deepEqual(tracking.destination,{lat:30.05,lng:31.22});
    assert.equal((await db.query('select customer_tracking($1) as data',[legacy])).rows[0].data.destination,null);
    await as(ids.other);await assert.rejects(db.query('select customer_tracking($1)',[order]),/not_authorized/);await assert.rejects(db.query('select set_delivery_destination($1,29,30)',[order]),/permission denied/);
    await as(ids.inactive);assert.equal((await db.query('select is_kitchen() as value')).rows[0].value,false);assert.equal((await db.query('select * from orders where id=$1',[order])).rows.length,0);await assert.rejects(db.query("select transition_order($1,'pending','confirmed')",[order]),/not_authorized/);
    for(const id of [ids.server,ids.cashier,ids.chef]){await as(id);assert.equal((await db.query('select is_kitchen() as value')).rows[0].value,true);assert.equal((await db.query('select is_manager() as value')).rows[0].value,false);assert.equal((await db.query('select * from orders where id=$1',[order])).rows.length,1);assert.equal((await db.query('select * from delivery_details where order_id=$1',[order])).rows.length,0);}
    await as(ids.server);await db.query("select transition_order($1,'pending','confirmed')",[order]);
    await as(ids.cashier);await db.query("select transition_order($1,'confirmed','preparing')",[order]);
    await as(ids.chef);await db.query("select transition_order($1,'preparing','ready')",[order]);
    await as(ids.server);await assert.rejects(db.query("select transition_order($1,'ready','completed')",[order]),/invalid_or_unauthorized_transition/);
    await as(ids.cashier);await assert.rejects(db.query("select transition_order($1,'ready','cancelled')",[order]),/invalid_or_unauthorized_transition/);
    await as(ids.manager);assert.equal((await db.query('select phone from delivery_details where order_id=$1',[order])).rows[0].phone,'01234567890');
    await as(ids.customer);assert.deepEqual((await db.query('select customer_tracking($1) as data',[order])).rows[0].data.destination,{lat:30.05,lng:31.22});
  } finally { await db.close(); }
});
