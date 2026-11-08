// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), delete: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: db.from } }));
import { deleteAddress, loadSavedAddress, saveAddress } from './savedAddress';
const address = {street:'Main',building:'2',apartment:'1',floor:'3',phone:'01234567890',latitude:30,longitude:31};
afterEach(() => { localStorage.clear(); vi.resetAllMocks(); });
it('saves, loads and removes a demo address scoped to one browser account', async () => {
 await saveAddress('alice',true,address);
 expect(await loadSavedAddress('alice',true)).toEqual(address);
 expect(await loadSavedAddress('bob',true)).toBeNull();
 await deleteAddress('alice',true);
 expect(await loadSavedAddress('alice',true)).toBeNull();
 expect(db.from).not.toHaveBeenCalled();
});
it('scopes Supabase reads and deletes and upserts the signed-in customer address', async () => {
 db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db);
 db.maybeSingle.mockResolvedValue({data:address,error:null});db.upsert.mockResolvedValue({error:null});
 expect(await loadSavedAddress('alice',false)).toEqual(address);
 expect(db.from).toHaveBeenCalledWith('customer_saved_addresses');
 expect(db.eq).toHaveBeenCalledWith('customer_id','alice');
 await saveAddress('alice',false,address);
 expect(db.upsert).toHaveBeenCalledWith({...address,customer_id:'alice'},{onConflict:'customer_id'});
 db.delete.mockReturnValue(db);db.eq.mockResolvedValue({error:null});
 await deleteAddress('alice',false);expect(db.eq).toHaveBeenLastCalledWith('customer_id','alice');
});
it('propagates storage errors and refuses malformed loaded data', async () => {
 db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db);
 db.maybeSingle.mockResolvedValue({data:{...address,latitude:200},error:null});
 expect(await loadSavedAddress('alice',false)).toBeNull();
 db.maybeSingle.mockResolvedValue({data:null,error:{message:'unavailable'}});
 await expect(loadSavedAddress('alice',false)).rejects.toEqual({message:'unavailable'});
 db.upsert.mockResolvedValue({error:{message:'unavailable'}});
 await expect(saveAddress('alice',false,address)).rejects.toEqual({message:'unavailable'});
});
