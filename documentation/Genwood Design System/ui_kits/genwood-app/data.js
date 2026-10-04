(function(){
const MAT=[0.5,1,1.5,2,2.5,3,4,5,6,7,8,9,10,12,15,20,25,30,35,40];
const DATES=['2026-10-01','2026-09-30','2026-09-29','2026-09-28','2026-09-25','2026-09-24','2026-09-23','2026-09-22','2026-09-21','2026-09-18'];
function curve(kind,di){const s=Math.sin(di*1.7)*0.025+di*0.006;return MAT.map(t=>{let y;
 if(kind==='nominal')y=3.86+0.92*(1-Math.exp(-t/9))-0.24*Math.exp(-t/1.5)-(t>22?0.0045*(t-22):0);
 else if(kind==='real')y=0.38+1.12*(1-Math.exp(-t/10))+(t<3?0.28*(3-t)/3:0)-(t>25?0.003*(t-25):0);
 else y=3.48-0.2*(1-Math.exp(-t/6))+(t<2?0.15*(2-t)/2:0)-(t>20?0.002*(t-20):0);
 const tilt=Math.cos(di*2.3+1)*0.018*Math.log1p(t)-Math.sin(di*1.1)*0.012*Math.exp(-t/3);return [t,+(y-s+tilt).toFixed(4)];});}
const KINDS={nominal:'Nominal spot',real:'Real spot',inflation:'Inflation spot'};
const FILE={nominal:'GLC Nominal daily data',real:'GLC Real daily data',inflation:'GLC Inflation daily data'};
const files=[];let id=1;
DATES.forEach((d,di)=>['nominal','real','inflation'].forEach((k,ki)=>{
 let status='success',label='Imported',warnings=0,error=null;
 if(di===0&&k==='inflation'){status='danger';label='Failed';error="Sheet '4. spot curve' not found in workbook."}
 else if((di===0&&k==='real')||(di===4&&k==='nominal')){status='warning';warnings=3;label='3 warnings'}
 const dd=d.slice(8)+' '+['Sep','Oct'][+d.slice(5,7)-9];
 files.push({id:id++,kind:k,curve:KINDS[k],file:FILE[k]+'_'+d+'.xlsx',date:d,received:dd+' 07:4'+(2+ki),rows:status==='danger'?null:(k==='nominal'?1180:k==='real'?1062:1062),size:(k==='nominal'?'284 KB':'261 KB'),status,label,warnings,error,user:'system (scheduled)',duration:status==='danger'?'0.8s':(2.1+ki*0.3).toFixed(1)+'s'});
}));
const curves={};['nominal','real','inflation'].forEach(k=>curves[k]=DATES.map((d,di)=>({date:d,points:curve(k,di)})));
window.GW_DATA={MAT,DATES,KINDS,files,curves,
 warnings:['Row 46: missing value at 39.5Y — interpolated from neighbours.','Row 47: missing value at 40.0Y — carried forward.','Header row contains an unexpected blank column (Z).']};
})();