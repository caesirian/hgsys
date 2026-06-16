export const now=()=>new Date().toISOString();
export const fmt=(d)=>d?new Intl.DateTimeFormat('es-AR').format(new Date(d)):'-';
export const daysUntil=(d)=>Math.ceil((new Date(d)-new Date())/86400000);
