import {test} from 'node:test';import assert from 'node:assert/strict';
import {readJsonLimited,PayloadTooLarge} from '../functions/_shared/http.mjs';
test('payment JSON size limits include streamed bodies and reject invalid input',async()=>{
 assert.deepEqual(await readJsonLimited(new Request('https://test.invalid',{method:'POST',body:'{"ok":true}'}),20),{ok:true});
 await assert.rejects(readJsonLimited(new Request('https://test.invalid',{method:'POST',headers:{'content-length':'100'},body:'{}'}),20),PayloadTooLarge);
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(15));c.enqueue(new Uint8Array(15));c.close();}});
 await assert.rejects(readJsonLimited(new Request('https://test.invalid',{method:'POST',body:stream,duplex:'half'}),20),PayloadTooLarge);
 await assert.rejects(readJsonLimited(new Request('https://test.invalid',{method:'POST',body:'{bad'}),20),SyntaxError);
});
