// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {Phase5Shell} from './Shell';
import {ButtonLink} from '../../components/ui';
afterEach(()=>{cleanup();localStorage.clear();});
it('switches document language and direction and restores them on unmount',()=>{
 document.documentElement.lang='en';document.documentElement.dir='ltr';
 const view=render(<Phase5Shell><p>Content</p></Phase5Shell>);
 fireEvent.click(screen.getByRole('button',{name:'العربية'}));expect(document.documentElement.lang).toBe('ar');expect(document.documentElement.dir).toBe('rtl');
 fireEvent.click(screen.getByRole('button',{name:'English'}));expect(document.documentElement.dir).toBe('ltr');view.unmount();expect(document.documentElement.lang).toBe('en');
});
it('renders a styled navigation link as a single interactive element',()=>{
 render(<MemoryRouter><ButtonLink to="/menu">Menu</ButtonLink></MemoryRouter>);const link=screen.getByRole('link',{name:'Menu'});expect(link.querySelector('button,a,input')).toBeNull();expect(link.getAttribute('href')).toBe('/menu');
});
