// @vitest-environment jsdom
import {it,expect} from 'vitest';import {usablePublicConfig} from './productionConfig';
it('rejects malformed or privileged configuration and allows local development',()=>{
 const jwt=(role:string)=>`h.${btoa(JSON.stringify({role}))}.s`;
 expect(usablePublicConfig('https://project.supabase.co',jwt('anon'),true)).toBe(true);
 expect(usablePublicConfig('https://project.supabase.co',jwt('service_role'),true)).toBe(false);
 expect(usablePublicConfig('https://project.supabase.co','sb_secret_test',true)).toBe(false);
 expect(usablePublicConfig('https://VITE_SUPABASE_URL=https://bad.test','abc',true)).toBe(false);
 expect(usablePublicConfig('http://localhost:54321',jwt('anon'),true)).toBe(false);
 expect(usablePublicConfig('http://localhost:54321',jwt('anon'),false)).toBe(true);
});
