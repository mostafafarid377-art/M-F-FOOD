// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state = vi.hoisted(() => ({ user: null as any, staffRole: 'chef', active: true }));
vi.mock('../../app/providers', () => ({ useAuth: () => ({ user: state.user, isLoading: false, isDemoMode: false }) }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: state.staffRole, is_active: state.active }, error: null }) }) }) }) } }));
import { ManagementGate } from './access';
function show(kitchen = false) { return render(<MemoryRouter><ManagementGate kitchen={kitchen}><div>Protected content</div></ManagementGate></MemoryRouter>); }
afterEach(() => cleanup());
describe('management route gate', () => {
  it('rejects customers', async () => { state.user = { id: 'customer', role: 'customer' }; show(); expect(await screen.findByText('Access denied')).toBeTruthy(); expect(screen.queryByText('Protected content')).toBeNull(); });
  it('blocks kitchen staff from admin but allows the kitchen', async () => { state.user = { id: 'chef', role: 'staff' }; state.staffRole = 'chef'; state.active = true; const view = show(); expect(await screen.findByText('Access denied')).toBeTruthy(); view.unmount(); show(true); expect(await screen.findByText('Protected content')).toBeTruthy(); });
  it('blocks inactive staff', async () => { state.user = { id: 'chef', role: 'staff' }; state.staffRole = 'chef'; state.active = false; show(true); expect(await screen.findByText('Access denied')).toBeTruthy(); });
  it('allows active managers to dashboard', async () => { state.user = { id: 'manager', role: 'staff' }; state.staffRole = 'manager'; state.active = true; show(); expect(await screen.findByText('Protected content')).toBeTruthy(); });
});
