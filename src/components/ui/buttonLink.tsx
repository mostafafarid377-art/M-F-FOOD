import React from 'react';
import {Link, type LinkProps} from 'react-router-dom';
import {sizeClasses,variantClasses,type ButtonSize,type ButtonVariant} from './button';
export function ButtonLink({variant='primary',size='md',fullWidth=false,className='',...props}:LinkProps & {variant?:ButtonVariant;size?:ButtonSize;fullWidth?:boolean}) {
 return <Link {...props} className={['inline-flex min-h-11 items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',variantClasses[variant],sizeClasses[size],fullWidth?'w-full':'',className].join(' ')} />;
}
