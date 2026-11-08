// @vitest-environment jsdom
import React from 'react';import {afterEach,expect,it,vi} from 'vitest';import {cleanup,fireEvent,render,screen} from '@testing-library/react';import {MemoryRouter} from 'react-router-dom';
vi.mock('../../lib/supabase',()=>({supabase:null}));
vi.mock('../../app/providers',()=>({useLayout:()=>({currencySymbol:'£'}),useCart:()=>({addItem:vi.fn()})}));
import Menu from './Page';
afterEach(cleanup);
it('opens the category dialog, moves focus, handles Escape and restores focus',()=>{
 render(<MemoryRouter><Menu/></MemoryRouter>);const toggle=screen.getByRole('button',{name:'Categories'});toggle.focus();fireEvent.click(toggle);
 const dialog=screen.getByRole('dialog',{name:'Menu categories'});expect(dialog.contains(document.activeElement)).toBe(true);
 fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(toggle);
});
