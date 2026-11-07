import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('atomic delivery checkout, server pricing and private contact access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
      create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;`);
    const core=await readFile('supabase/migrations/20240101_01_create_core_tables.sql','utf8');
    await db.exec(core.replace('create extension if not exists "uuid-ossp";', '-- test UUID'));
    await db.exec('create publication supabase_realtime');
    for (const file of ['20240102_02_auth_and_order_creation.sql','20240103_03_admin_kitchen.sql','20240104_04_tables_delivery.sql']) await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
    await db.exec('grant select,insert,update,delete on all tables in schema public to authenticated');
    await db.exec(await readFile('supabase/migrations/20240105_05_checkout_details.sql','utf8'));
    const ids={admin:'00000000-0000-4000-8000-000000000101',customer:'00000000-0000-4000-8000-000000000102',other:'00000000-0000-4000-8000-000000000103',driver:'00000000-0000-4000-8000-000000000104',driver2:'00000000-0000-4000-8000-000000000105',chef:'00000000-0000-4000-8000-000000000107',manager:'00000000-0000-4000-8000-000000000108',item:'00000000-0000-4000-8000-100000000001'};
    for (const id of [ids.admin,ids.customer,ids.other,ids.driver,ids.driver2,ids.chef,ids.manager]) await db.query('insert into auth.users(id,raw_user_meta_data) values ($1,$2::jsonb)',[id,'{}']);
    await db.query("update profiles set role='admin' where id=$1",[ids.admin]);
    await db.query("update profiles set role='staff' where id=$1",[ids.chef]);
    await db.query("update profiles set role='staff' where id=$1",[ids.manager]);
    await db.query("insert into staff_members(profile_id,role) values($1,'chef'),($2,'manager')",[ids.chef,ids.manager]);
    await db.query("insert into menu_items(id,name,price) values($1,'Burger',12500)",[ids.item]);
    const as=async id=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
    await as(ids.admin); const driver=(await db.query("insert into delivery_drivers(profile_id,display_name) values($1,'Driver') returning id",[ids.driver])).rows[0].id;
    const call='select create_order_with_delivery_details($1::jsonb,$2,$3,$4,$5,$6,$7,$8,$9) as id';
    const args=[JSON.stringify([{menu_item_id:ids.item,quantity:2,price:1}]),'  B  ',' 3 ',' 2 ',' Main St ',' 01234567890 ',' Side door ',30.05,31.22];
    await as(ids.customer);
    for (const [index,value] of [[1,' '],[4,''],[5,'123'],[5,'abcdefg'],[7,null],[8,181],[6,'x'.repeat(1001)]]) {
      const invalid=[...args];invalid[index]=value;await assert.rejects(db.query(call,invalid),/invalid_delivery_details|invalid_coordinates/);
    }
    assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,0);
    // Force a failure after create_order has run, proving rollback of the whole RPC.
    await db.exec('reset role');
    await db.exec("create function fail_details() returns trigger language plpgsql as $$ begin raise exception 'forced_insert_failure'; end $$; create trigger fail_details before insert on delivery_details for each row execute function fail_details()");
    await as(ids.customer);await assert.rejects(db.query(call,args),/forced_insert_failure/);assert.equal((await db.query('select count(*)::int as n from orders')).rows[0].n,0);
    await db.exec('reset role');await db.exec('drop trigger fail_details on delivery_details; drop function fail_details()');await as(ids.customer);
    const id=(await db.query(call,args)).rows[0].id;
    const order=(await db.query('select * from orders where id=$1',[id])).rows[0];
    assert.equal(order.total_price,25000);assert.equal(order.notes,'Side door');assert.match(order.delivery_address,/Main St, Building: B, Floor: 2, Apartment: 3/);assert.ok(!order.delivery_address.includes('01234567890'));
    const details=(await db.query('select * from delivery_details where order_id=$1',[id])).rows[0];assert.equal(details.phone,'01234567890');assert.equal(details.street,'Main St');assert.equal(details.apartment,'3');
    assert.equal((await db.query('select latitude from delivery_destinations where order_id=$1',[id])).rows[0].latitude,30.05);
    await assert.rejects(db.query('update delivery_details set phone=$1 where order_id=$2',['0000000',id]),/permission denied|row-level security/);
    await as(ids.other);assert.equal((await db.query('select * from delivery_details where order_id=$1',[id])).rows.length,0);
    await as(ids.chef);assert.equal((await db.query('select * from orders where id=$1',[id])).rows.length,1);assert.equal((await db.query('select * from delivery_details where order_id=$1',[id])).rows.length,0);
    await as(ids.manager);assert.equal((await db.query('select phone from delivery_details where order_id=$1',[id])).rows[0].phone,'01234567890');
    await as(ids.admin);assert.equal((await db.query('select phone from delivery_details where order_id=$1',[id])).rows[0].phone,'01234567890');await db.query('select assign_delivery($1,$2)',[id,driver]);
    await as(ids.driver2);assert.equal((await db.query('select * from delivery_details where order_id=$1',[id])).rows.length,0);
    await as(ids.driver);assert.equal((await db.query('select phone from delivery_details where order_id=$1',[id])).rows[0].phone,'01234567890');
    await as(ids.admin);await db.query('select cancel_delivery($1)',[id]);
    await as(ids.driver);assert.equal((await db.query('select * from delivery_details where order_id=$1',[id])).rows.length,0);
  } finally { await db.close(); }
});
