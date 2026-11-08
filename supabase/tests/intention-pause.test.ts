// Deno-only, entirely local: intercept Deno.serve before importing the endpoint.
Deno.test('direct intention requests stay paused without reaching provider or database', async () => {
 const original = Deno.serve;
 let handler: ((request: Request) => Promise<Response>) | undefined;
 Object.defineProperty(Deno, 'serve', {configurable:true, value:(fn: typeof handler) => {handler=fn;}});
 try {
  await import('../functions/paymob-create-intention/index.ts');
  if (!handler) throw new Error('endpoint did not register');
  const post=await handler(new Request('https://local.test', {method:'POST', body:JSON.stringify({order_id:'00000000-0000-4000-8000-000000000001'})}));
  if(post.status!==503 || !(await post.text()).includes('paused'))throw new Error(`unexpected POST status ${post.status}`);
  const options=await handler(new Request('https://local.test',{method:'OPTIONS'}));if(options.status!==200)throw new Error('preflight failed');
  const get=await handler(new Request('https://local.test'));if(get.status!==405)throw new Error('unexpected method accepted');
 } finally {Object.defineProperty(Deno,'serve',{configurable:true,value:original});}
});
