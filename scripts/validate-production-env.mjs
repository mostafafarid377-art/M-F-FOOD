// Values are public in Vite bundles; never echo them, including on failure.
const errors=[];
function https(value){try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!/[=_]/.test(u.hostname)&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}}
const url=process.env.VITE_SUPABASE_URL?.trim()||'', key=process.env.VITE_SUPABASE_ANON_KEY?.trim()||'', routing=process.env.VITE_ROUTING_URL?.trim()||'';
if(!https(url)||/your-project-ref|example\.com/i.test(url))errors.push('Invalid or missing public Supabase URL');
let safe=/^sb_publishable_[\w-]+$/.test(key);
if(!safe&&key.split('.').length===3){try{safe=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon';}catch{}}
if(!safe)errors.push('Browser key must be a publishable key or anon JWT, not a privileged key');
if(routing&&!https(routing))errors.push('Routing URL must be HTTPS without credentials, query or fragment');
if(errors.length){console.error('Invalid production configuration:');errors.forEach(e=>console.error('- '+e));process.exitCode=1;}else console.log('Public configuration format validated; verify project and permissions separately.');
