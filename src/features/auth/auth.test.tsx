// @vitest-environment jsdom
import React from 'react';
import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({reset:vi.fn(async()=>({error:null})),update:vi.fn(async()=>({error:null})),signout:vi.fn(async()=>({error:null}))}));
vi.mock('../../app/providers',()=>({useAuth:()=>({login:vi.fn(),isDemoMode:false})}));
vi.mock('../../lib/supabase',()=>({supabase:{auth:{resetPasswordForEmail:m.reset,updateUser:m.update,signOut:m.signout}},recoveryReady:Promise.resolve(true)}));
import LoginPage from './LoginPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import RecoveryCallback from './RecoveryCallback';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('toggles the login password without submitting',()=>{
 render(<MemoryRouter><LoginPage/></MemoryRouter>);const password=screen.getByLabelText('Password') as HTMLInputElement;expect(password.type).toBe('password');fireEvent.click(screen.getByRole('button',{name:'Show password'}));expect(password.type).toBe('text');expect(screen.getByRole('button',{name:'Hide password'}).getAttribute('aria-pressed')).toBe('true');expect(screen.getByRole('link',{name:'Forgot password?'}).getAttribute('href')).toBe('/forgot-password');
});
it('requests an email with a root callback and shows a non-enumerating confirmation',async()=>{
 render(<MemoryRouter><ForgotPasswordPage/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Email'),{target:{value:'person@example.com'}});fireEvent.click(screen.getByRole('button',{name:'Send reset link'}));await waitFor(()=>expect(m.reset).toHaveBeenCalledWith('person@example.com',{redirectTo:expect.stringMatching(/\/?\?auth_callback=recovery$/)}));expect((await screen.findByRole('status')).textContent).toContain('If an account exists');
});
it('requires matching new passwords and calls Supabase updateUser',async()=>{
 render(<RecoveryCallback/>);await screen.findByLabelText('New password');fireEvent.change(screen.getByLabelText('New password'),{target:{value:'newpassword'}});fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'different'}});fireEvent.click(screen.getByRole('button',{name:'Save new password'}));expect(screen.getByRole('alert').textContent).toContain('do not match');expect(m.update).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'newpassword'}});fireEvent.click(screen.getByRole('button',{name:'Save new password'}));await waitFor(()=>expect(m.update).toHaveBeenCalledWith({password:'newpassword'}));expect(await screen.findByRole('status')).toBeTruthy();
});
