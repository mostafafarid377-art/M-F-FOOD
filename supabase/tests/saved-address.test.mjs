import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('saved addresses are private, valid, editable and removable only by their owner', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create function public.uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
      grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
    await db.exec(await readFile('supabase/migrations/20240108_08_saved_delivery_address.sql', 'utf8'));
    const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
    await db.query('insert into auth.users(id) values($1),($2)', [owner, other]);
    const as = async id => { await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
    await as(owner);
    const query = 'insert into customer_saved_addresses(customer_id,street,building,phone,latitude,longitude) values($1,$2,$3,$4,$5,$6)';
    await assert.rejects(db.query(query,[owner,'Main','1','abc',30,31]), /check constraint/);
    await assert.rejects(db.query(query,[owner,'Main','1','01234567890',91,31]), /check constraint/);
    await assert.rejects(db.query(query,[other,'Main','1','01234567890',30,31]), /row-level security/);
    await db.query(query,[owner,'Main','1','01234567890',30,31]);
    await assert.rejects(db.query(query,[owner,'Main','1','01234567890',30,31]), /unique constraint/);
    await as(other);
    assert.equal((await db.query('select * from customer_saved_addresses')).rows.length,0);
    assert.equal((await db.query("update customer_saved_addresses set street='Stolen' returning id")).rows.length,0);
    assert.equal((await db.query('delete from customer_saved_addresses returning id')).rows.length,0);
    await as(owner);
    await assert.rejects(db.query('update customer_saved_addresses set customer_id=$1',[other]), /row-level security/);
    assert.equal((await db.query("update customer_saved_addresses set street='New street' returning street")).rows[0].street,'New street');
    assert.equal((await db.query('delete from customer_saved_addresses returning id')).rows.length,1);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from customer_saved_addresses'), /permission denied/);
  } finally { await db.close(); }
});
