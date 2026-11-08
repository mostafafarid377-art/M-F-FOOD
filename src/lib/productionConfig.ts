/** Reject missing, malformed and recognizably privileged browser configuration. */
export function usablePublicConfig(url: string | undefined, key: string | undefined, production: boolean): boolean {
 if(!url||!key||/your-project-ref|your-anon-public-key/i.test(`${url} ${key}`)||/^sb_secret_/i.test(key))return false;
 try {
  const parsed=new URL(url);
  if((production?parsed.protocol!=='https:':!['http:','https:'].includes(parsed.protocol))||!parsed.hostname||/[=_]/.test(parsed.hostname)||(production && /(^|\.)example\.(com|org|net)$/i.test(parsed.hostname))||parsed.username||parsed.password||parsed.search||parsed.hash)return false;
  const parts=key.split('.');
  if(parts.length===3){const payload=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));return payload.role==='anon';}
  return /^sb_publishable_[\w-]+$/.test(key);
 } catch{return false;}
}
