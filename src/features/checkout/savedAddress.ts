import { supabase } from '../../lib/supabase';

export type SavedAddress = {
  street: string; building: string; apartment: string; floor: string; phone: string;
  latitude: number; longitude: number;
};
const demoKey = (userId: string) => `mf-food-demo-address:${userId}`;

function validAddress(value: unknown): value is SavedAddress {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return ['street', 'building', 'apartment', 'floor', 'phone'].every(key => typeof a[key] === 'string') &&
    typeof a.latitude === 'number' && Number.isFinite(a.latitude) && Math.abs(a.latitude) <= 90 &&
    typeof a.longitude === 'number' && Number.isFinite(a.longitude) && Math.abs(a.longitude) <= 180;
}

export async function loadSavedAddress(userId: string, demo: boolean): Promise<SavedAddress | null> {
  if (demo) {
    const raw = localStorage.getItem(demoKey(userId));
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return validAddress(data) ? data : null;
  }
  if (!supabase) throw new Error('Saved addresses are unavailable.');
  const { data, error } = await supabase.from('customer_saved_addresses')
    .select('street,building,apartment,floor,phone,latitude,longitude').eq('customer_id', userId).maybeSingle();
  if (error) throw error;
  return validAddress(data) ? data : null;
}

export async function saveAddress(userId: string, demo: boolean, address: SavedAddress): Promise<void> {
  if (demo) { localStorage.setItem(demoKey(userId), JSON.stringify(address)); return; }
  if (!supabase) throw new Error('Saved addresses are unavailable.');
  const { error } = await supabase.from('customer_saved_addresses').upsert({ ...address, customer_id: userId }, { onConflict: 'customer_id' });
  if (error) throw error;
}

export async function deleteAddress(userId: string, demo: boolean): Promise<void> {
  if (demo) { localStorage.removeItem(demoKey(userId)); return; }
  if (!supabase) throw new Error('Saved addresses are unavailable.');
  const { error } = await supabase.from('customer_saved_addresses').delete().eq('customer_id', userId);
  if (error) throw error;
}
