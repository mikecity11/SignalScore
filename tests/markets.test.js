const {test}=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/markets');
function res(){return {code:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.body=v;return this;}};}
test('normalizes upstream arrays and rejects invalid price values',()=>{
  const m=handler.normalize({id:1,question:'A?',outcomes:'["Yes","No","Other"]',outcomePrices:'["0.7",null,"bad"]'});
  assert.deepEqual(m.prices,[.7,null,null]);assert.deepEqual(m.outcomes,['Yes','No','Other']);
  assert.deepEqual(handler.normalize({id:2,outcomes:'invalid'}).outcomes,[]);
});
test('gateway rejects invalid offsets and non-read operations',async()=>{
  const a=res();await handler({method:'GET',url:'/api/markets?offset=bad'},a);assert.equal(a.code,400);
  const b=res();await handler({method:'POST',url:'/api/markets'},b);assert.equal(b.code,405);assert.equal(b.headers.Allow,'GET');
});
test('bounded public request returns a normalized response and pagination',async()=>{
  const old=global.fetch;let requested;
  global.fetch=async url=>{requested=new URL(url);return {ok:true,json:async()=>Array.from({length:24},(_,i)=>({id:i+1,question:'Question',outcomes:['Yes','No'],outcomePrices:['0.6','0.4']}))};};
  try {const a=res();await handler({method:'GET',url:'/api/markets?offset=24&url=https://example.com'},a);assert.equal(a.code,200);assert.equal(requested.hostname,'gamma-api.polymarket.com');assert.equal(requested.searchParams.get('offset'),'24');assert.equal(requested.searchParams.get('limit'),'24');assert.equal(a.body.nextOffset,48);assert.equal(a.body.markets.length,24);}finally{global.fetch=old;}
});
test('upstream failure returns an error rather than sample market data',async()=>{
  const old=global.fetch;global.fetch=async()=>({ok:false,status:503});
  try{const a=res();await handler({method:'GET',url:'/api/markets'},a);assert.equal(a.code,502);assert.equal(a.body.markets,undefined);}finally{global.fetch=old;}
});
