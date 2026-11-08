import React from 'react';
import {Button} from './ui';
import {tr, useArabic} from '../features/phase5/Shell';
export function Pagination({page,hasNext,onChange,label}:{page:number;hasNext:boolean;onChange:(page:number)=>void;label:string}) {
 const ar=useArabic();
 return <nav aria-label={label} className="mt-4 flex flex-wrap items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>onChange(page-1)}>{tr(ar,'Previous','السابق')}</Button><span role="status">{tr(ar,'Page','الصفحة')} {page+1}</span><Button variant="outline" disabled={!hasNext} onClick={()=>onChange(page+1)}>{tr(ar,'Next','التالي')}</Button></nav>;
}
