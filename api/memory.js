const a=require('../lib/auth');const memory=require('../lib/memory');const {createHash}=require('node:crypto');
module.exports=async(req,res)=>{
 if(!a.prepare(req,res,'POST'))return;
 const s=a.session(req);if(!s)return res.status(401).json({error:'Connect and sign in with your Sui wallet first.'});
 if(!memory.configured())return res.status(503).json({error:'Walrus Memory is awaiting account configuration.'});
 let b;try{b=a.body(req);}catch{return res.status(400).json({error:'Invalid memory request.'});}
 try{
  const client=await memory.client(s.address);
  if(b.action==='remember'){
   let entry;try{entry=memory.validateEntry(b.entry);}catch{return res.status(400).json({error:'This prediction is missing a question, outcome or reasoning.'});}
   if(entry.market?.conditionId && b.entry.resolution){
    // Resolve again server-side; never write a client-supplied verdict as verified evidence.
    const resolution=require('./resolution');let result;let code;
    await resolution({method:'GET',url:'/api/resolution?condition='+encodeURIComponent(entry.market.conditionId)},{setHeader(){},status(c){code=c;return this;},json(v){result=v;}});
    if(code===200)entry.resolution={state:result.state,winnerIndex:result.winnerIndex,winnerOutcome:result.winnerOutcome||null,source:result.source,resolvedAt:result.resolvedAt||null};
   }
   const text=JSON.stringify({schema:'signalscore.prediction.v1',entry,clientRecordedAt:entry.createdAt||null});
   // The same user, prediction and content reuse one operation key on retries.
   const key=createHash('sha256').update(a.namespace(s.address)+JSON.stringify(memory.validateEntry(b.entry))+(entry.resolution?JSON.stringify({state:entry.resolution.state,winnerIndex:entry.resolution.winnerIndex,winnerOutcome:entry.resolution.winnerOutcome}):'')).digest('hex');
   const job=await client.remember(text,{idempotencyKey:key,dedupe:true});
   return res.status(202).json({jobId:job.job_id,status:job.status,network:'mainnet',wallet:s.address});
  }
  if(b.action==='status'){
   if(!/^[a-zA-Z0-9_-]{1,200}$/.test(b.jobId||''))return res.status(400).json({error:'Invalid memory job.'});
   const job=await client.getRememberStatus(b.jobId);
   if(job.namespace&&job.namespace!==a.namespace(s.address))return res.status(404).json({error:'Memory job not found.'});
   return res.status(200).json({jobId:b.jobId,status:job.status,blobId:job.status==='done'&&job.namespace===a.namespace(s.address)?job.blob_id:null,network:'mainnet',wallet:s.address});
  }
  if(b.action==='recall'||b.action==='probe'){
   const query=b.action==='probe'?'SignalScore prediction journal':String(b.query||'').trim();
   if(!query||query.length>500)return res.status(400).json({error:'Enter a memory question of up to 500 characters.'});
   const result=await client.recall({query,limit:b.action==='probe'?1:10,namespace:a.namespace(s.address)});
   return res.status(200).json({verified:true,network:'mainnet',wallet:s.address,results:b.action==='probe'?[]:result.results.map(x=>({text:x.text,blobId:x.blob_id,distance:x.distance,createdAt:x.created_at})),total:result.total,droppedCount:result.dropped_count||0});
  }
  return res.status(400).json({error:'Unknown memory action.'});
 }catch{return res.status(502).json({error:'Walrus could not complete the request. Check the account and delegate settings, then retry. Pending writes may still complete; check their status before resubmitting.'});}
};
