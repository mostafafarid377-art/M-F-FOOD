import { createClient } from 'npm:@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply = (status:number,body:unknown) => new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async (req:Request) => {
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply(405,{error:'Method not allowed'});
 try {
  const url=Deno.env.get('SUPABASE_URL'), anon=Deno.env.get('SUPABASE_ANON_KEY'), service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const secret=Deno.env.get('PAYMOB_SECRET_KEY'), pub=Deno.env.get('PAYMOB_PUBLIC_KEY'), integration=Deno.env.get('PAYMOB_INTEGRATION_ID'), app=Deno.env.get('PAYMOB_APP_BASE_URL');
  if(!url||!anon||!service||!secret||!pub||!integration||!/^\d+$/.test(integration)||!app) return reply(503,{error:'Online payments are not configured'});
  const appUrl=new URL(app);if(appUrl.protocol!=='https:'||appUrl.search||appUrl.hash||!appUrl.pathname.endsWith('/'))return reply(503,{error:'Online payments are not configured'});
  const auth=req.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))return reply(401,{error:'Authentication required'});
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user},error:userError}=await userClient.auth.getUser(auth.slice(7));if(userError||!user)return reply(401,{error:'Authentication required'});
  const body=await req.json();const order=body?.order_id,phone=String(body?.phone||'').trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order||'')||phone.length>30||phone.replace(/[^0-9٠-٩۰-۹]/g,'').length<7||!user.email)return reply(400,{error:'Valid order and billing phone are required'});
  const db=createClient(url,service,{auth:{persistSession:false}});
  const {data:claim,error:claimError}=await db.rpc('claim_paymob_intention',{p_order:order,p_user:user.id});
  if(claimError)return reply(403,{error:'Order is not eligible for online payment'});
  if(claim?.state!=='claimed')return reply(409,{error:'Payment may already have been started. Contact the restaurant before trying again.'});
  const notification=new URL('/functions/v1/paymob-webhook',url).toString();const redirect=new URL('payment-return.html',appUrl);redirect.searchParams.set('mf_order',order);
  const names=String(user.user_metadata?.full_name||'Customer').trim().slice(0,150).split(/\s+/);
  let response:Response;
  try {response=await fetch('https://accept.paymob.com/v1/intention/',{method:'POST',headers:{Authorization:`Token ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({amount:claim.amount,currency:'EGP',payment_methods:[Number(integration)],items:[{name:'Restaurant order',amount:claim.amount,quantity:1}],billing_data:{first_name:names[0]||'Customer',last_name:names.slice(1).join(' ')||names[0]||'Customer',email:user.email,phone_number:phone},special_reference:claim.reference,notification_url:notification,redirection_url:redirect.toString(),expiration:3600}),signal:AbortSignal.timeout(15000)});} catch {return reply(503,{error:'Payment request outcome is uncertain. Contact the restaurant before retrying.'});}
  if(!response.ok)return reply(503,{error:'Payment could not be initialized. Contact the restaurant before retrying.'});
  const result=await response.json();if(!/^\d+$/.test(String(result.intention_order_id))||typeof result.id!=='string'||typeof result.client_secret!=='string'||!result.client_secret)return reply(503,{error:'Payment request requires reconciliation. Contact the restaurant.'});
  const {error:saveError}=await db.rpc('finish_paymob_intention',{p_payment:claim.payment_id,p_provider_order:String(result.intention_order_id),p_intention:result.id});
  if(saveError)return reply(503,{error:'Payment request requires reconciliation. Contact the restaurant.'});
  const checkout=new URL('https://eg.checkout.paymob.com/');checkout.searchParams.set('publicKey',pub);checkout.searchParams.set('clientSecret',result.client_secret);
  return reply(200,{checkout_url:checkout.toString()});
 } catch {return reply(500,{error:'Unable to initialize payment. Contact the restaurant before retrying.'});}
});
