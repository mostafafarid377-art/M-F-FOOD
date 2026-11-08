import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyTransaction, signedEvent } from '../_shared/paymob.mjs';
import { PayloadTooLarge, readJsonLimited } from '../_shared/http.mjs';
Deno.serve(async (req:Request) => {
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('PAYMOB_HMAC_SECRET'),integration=Deno.env.get('PAYMOB_INTEGRATION_ID'),url=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!integration||!url||!service)return new Response('Not configured',{status:503});
 try {
  const body=await readJsonLimited(req,65536),obj=body?.obj;const hmac=new URL(req.url).searchParams.get('hmac')||'';
  if(body?.type!=='TRANSACTION'||!await verifyTransaction(obj,hmac,secret))return new Response('Invalid signature',{status:401});
  let event;try{event=signedEvent(obj,integration);}catch{return new Response('Unsupported or invalid transaction',{status:422});}
  const db=createClient(url,service,{auth:{persistSession:false}});
  const {error}=await db.rpc('apply_paymob_transaction',{p_provider_order:event.order,p_transaction:event.transaction,p_amount:event.amount,p_currency:event.currency,p_state:event.state});
  // A missing payment can be a callback racing the intention response; let
  // Paymob retry. No callback payload, card data or secrets are logged.
  if(error)return new Response('Unable to process event',{status:503});
  return new Response('OK',{status:200});
 } catch(error) {return new Response(error instanceof PayloadTooLarge?'Request too large':'Invalid request',{status:error instanceof PayloadTooLarge?413:400});}
});
