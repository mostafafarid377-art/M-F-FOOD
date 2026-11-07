// Paymob's documented transaction-processed callback HMAC order (2026).
const fields = ['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order.id','owner','pending','source_data.pan','source_data.sub_type','source_data.type','success'];
const valueAt = (obj, path) => path.split('.').reduce((v,k) => v && typeof v === 'object' ? v[k] : undefined, obj);
export function transactionString(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('invalid_transaction');
  const parts=fields.map(key=>valueAt(obj,key));
  if (parts.some(v=>v===undefined || v===null || (typeof v!=='string' && typeof v!=='number' && typeof v!=='boolean'))) throw new Error('missing_signed_field');
  return parts.map(String).join('');
}
export async function verifyTransaction(obj,signature,secret) {
  if (!secret || !/^[0-9a-f]{128}$/i.test(signature || '')) return false;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-512'},false,['verify']);
  const bytes=Uint8Array.from(signature.match(/../g).map(x=>parseInt(x,16)));
  try { return await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(transactionString(obj))); } catch { return false; }
}
export function signedEvent(obj, expectedIntegration) {
  const bools=['error_occured','has_parent_transaction','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','pending','success'];
  if (bools.some(k=>typeof obj[k]!=='boolean') || !Number.isSafeInteger(obj.amount_cents) || obj.amount_cents<=0 || obj.currency!=='EGP') throw new Error('invalid_event');
  if ([obj.id,obj.order?.id,obj.integration_id,obj.owner].some(v=>typeof v==='number' && !Number.isSafeInteger(v))) throw new Error('invalid_event');
  const id=String(obj.id), order=String(obj.order?.id), integration=String(obj.integration_id);
  if (!/^\d+$/.test(id) || !/^\d+$/.test(order) || integration!==String(expectedIntegration)) throw new Error('invalid_event');
  // Refund/void/capture and child transactions require separate reconciliation;
  // these fields must never be mistaken for a successful purchase.
  if (obj.is_auth || obj.is_capture || obj.is_refunded || obj.is_voided || !obj.is_standalone_payment || obj.has_parent_transaction) throw new Error('unsupported_event');
  if (obj.success && obj.error_occured) throw new Error('invalid_event');
  return {order, transaction:id, amount:obj.amount_cents, currency:obj.currency, state:obj.pending?'processing':(obj.success?'paid':'failed')};
}
