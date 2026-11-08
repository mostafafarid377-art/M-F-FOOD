/** Read and bound bytes before decoding. Never log request contents. */
export class PayloadTooLarge extends Error {}
export async function readJsonLimited(request, limit) {
 const length=request.headers.get('content-length');
 if(length && /^\d+$/.test(length) && Number(length)>limit) throw new PayloadTooLarge();
 if(!request.body) throw new Error('missing_body');
 const reader=request.body.getReader(), chunks=[]; let size=0;
 try {
  for (;;) {
   const {done,value}=await reader.read(); if(done) break;
   size+=value.byteLength;
   if(size>limit){void reader.cancel().catch(()=>{});throw new PayloadTooLarge();}
   chunks.push(value);
  }
 } finally {reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}
