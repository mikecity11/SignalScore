function assess(row){
 const terminal=['resolved','settled','finalized','finalised'].includes(String(row?.status||'').toLowerCase());
 if(!terminal)return {state:'pending',winnerIndex:null};
 const p=row.payouts;if(!Array.isArray(p)||p.length<2||p.some(x=>x===null||x===''||!Number.isFinite(Number(x))||Number(x)<0))return {state:'unconfirmed',winnerIndex:null};
 const values=p.map(Number);const positives=values.map((x,i)=>x>0?i:-1).filter(x=>x>=0);
 if(positives.length===1)return {state:'resolved',winnerIndex:positives[0]};
 if(values.every(x=>x>0&&x===values[0]))return {state:'refunded',winnerIndex:null};
 return {state:'unconfirmed',winnerIndex:null};
}
async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});
 const condition=new URL(req.url,'https://signalscore.local').searchParams.get('condition');
 if(!/^0x[a-fA-F0-9]{64}$/.test(condition||''))return res.status(400).json({error:'A valid market condition ID is required.'});
 try{
  const upstream='https://data-api.polymarket.com/v2/resolutions?condition='+encodeURIComponent(condition);
  let row;try{const r=await fetch(upstream,{signal:AbortSignal.timeout(7000)});if(r.ok){const data=await r.json();row=data.data?.find(x=>String(x.condition_id).toLowerCase()===condition.toLowerCase());}}catch{}
  if(row && assess(row).state!=='unconfirmed')return res.status(200).json({...assess(row),providerStatus:row.status,resolvedAt:row.resolved_at||null,transactionHash:row.transaction_hash||null,checkedAt:new Date().toISOString(),source:upstream});
  // Legacy CLOB markets expose explicit winner flags. Never infer a winner from price.
  const source='https://clob.polymarket.com/markets/'+encodeURIComponent(condition);
  const legacy=await fetch(source,{signal:AbortSignal.timeout(7000)});if(!legacy.ok)throw new Error();const market=await legacy.json();
  if(String(market.condition_id).toLowerCase()!==condition.toLowerCase())throw new Error();
  const tokens=Array.isArray(market.tokens)?market.tokens:[];const winners=tokens.filter(t=>t.winner===true);
  return res.status(200).json({state:market.closed===true&&winners.length===1?'resolved':market.closed?'unconfirmed':'pending',winnerIndex:null,winnerOutcome:market.closed===true&&winners.length===1?String(winners[0].outcome):null,checkedAt:new Date().toISOString(),source});
 }catch{return res.status(502).json({error:'The resolution source is unavailable. No outcome has been assigned.'});}
}
module.exports=handler;module.exports.assess=assess;
