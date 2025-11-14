"use client";

// Utilities for exporting files with consistent naming and encodings

export function dateStamp(){
  const d=new Date();
  const pad=(n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export function fileName(base, ext){
  return `adveyes_${base}_${dateStamp()}.${ext}`;
}

export function downloadBlob(blob, name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

export function downloadJSON(baseName, obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
  downloadBlob(blob, fileName(baseName, "json"));
}

const esc=(v)=>{ const s=String(v??""); return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };

export function downloadCSV(baseName, rows, descriptions){
  if(!rows || !rows.length) return;
  const cols=Object.keys(rows[0]);
  const header=cols.join(",");
  const descRow=descriptions?cols.map(c=>esc(descriptions[c]??"")).join(","):"";
  const data=rows.map(r=>cols.map(c=>esc(r[c])).join(",")).join("\r\n");
  const csv = descriptions?"\uFEFF"+header+"\r\n"+descRow+"\r\n"+data:"\uFEFF"+header+"\r\n"+data;
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  downloadBlob(blob, fileName(baseName, "csv"));
}


