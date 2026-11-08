import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {parse} from 'yaml';
test('PR workflow is non-deploying and runs required checks',async()=>{
 const workflow=parse(await readFile('.github/workflows/phase7-pr-checks.yml','utf8'));
 assert.deepEqual(Object.keys(workflow.on),['pull_request']);assert.deepEqual(workflow.on.pull_request.branches,['main']);
 assert.deepEqual(workflow.permissions,{contents:'read'});
 const steps=Object.values(workflow.jobs).flatMap(job=>job.steps);
 const run=steps.map(s=>s.run||'').join('\n');const actions=steps.map(s=>s.uses||'').join('\n');
 for(const command of ['npm ci','npm test','npm run typecheck','npm run build','npm run validate:production-env','npm audit','deno check','deno test'])assert.ok(run.includes(command),command);
 assert.ok(run.includes('VITE_BASE_PATH')||steps.some(s=>s.env?.VITE_BASE_PATH==='/M-F-FOOD/'));
 assert.doesNotMatch(run+'\n'+actions,/deploy-pages|upload-pages-artifact|gh pr merge|supabase\s+(db\s+push|functions\s+deploy)|firebase/i);
});
