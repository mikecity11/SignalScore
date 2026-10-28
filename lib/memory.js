const {namespace}=require('./auth');
function configured(){return Boolean(process.env.MEMWAL_PRIVATE_KEY&&process.env.MEMWAL_ACCOUNT_ID);}
async function client(address){
  if(!configured())throw new Error('Walrus Memory is not configured.');
  const {MemWal}=await import('@mysten-incubation/memwal');
  return MemWal.create({key:process.env.MEMWAL_PRIVATE_KEY,accountId:process.env.MEMWAL_ACCOUNT_ID,serverUrl:'https://relayer.memory.walrus.xyz',namespace:namespace(address),requestTimeoutMs:20000});
}
function validateEntry(e){
  if(!e||typeof e!=='object'||typeof e.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(e.id)||typeof e.question!=='string'||!e.question.trim()||e.question.length>500||typeof e.reason!=='string'||!e.reason.trim()||e.reason.length>5000||typeof e.side!=='string'||e.side.length>150)throw new Error('Invalid prediction');
  const result={id:e.id,question:e.question,reason:e.reason,side:e.side,topic:String(e.topic||'Other').slice(0,100),createdAt:typeof e.createdAt==='string'?e.createdAt:null,confidence:e.confidence?String(e.confidence).slice(0,3):null,url:typeof e.url==='string'?e.url.slice(0,1500):''};
  if(e.market){result.market={id:String(e.market.id||'').slice(0,50),conditionId:String(e.market.conditionId||'').slice(0,66),slug:String(e.market.slug||'').slice(0,300),description:String(e.market.description||'').slice(0,15000),outcomes:Array.isArray(e.market.outcomes)?e.market.outcomes.slice(0,10).map(x=>String(x).slice(0,150)):[],prices:Array.isArray(e.market.prices)?e.market.prices.slice(0,10).map(x=>typeof x==='number'&&x>=0&&x<=1?x:null):[],capturedAt:String(e.market.capturedAt||'').slice(0,50),endDate:String(e.market.endDate||'').slice(0,50)};}
  return result;
}
module.exports={configured,client,validateEntry};
