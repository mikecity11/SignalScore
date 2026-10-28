const {test}=require('node:test');const assert=require('node:assert/strict');
process.env.SESSION_SECRET='test-only-session-secret-with-over-32-characters';
const a=require('../lib/auth');const auth=require('../api/auth');const memory=require('../lib/memory');const memoryHandler=require('../api/memory');const tatum=require('../api/tatum');const {assess}=require('../api/resolution');
function response(){return{code:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};}
const headers={host:'test.signalscore.app',origin:'https://test.signalscore.app'};
function user(address='0x'+'a'.repeat(64)){return a.cookie(a.SESSION,a.sign({kind:'session',address,exp:Date.now()+60000}),60).split(';')[0];}
test('session tokens reject tampering, expiry and challenge tokens',()=>{
 const token=a.sign({kind:'session',address:'0x'+'a'.repeat(64),exp:Date.now()+10000});
 assert.equal(a.verify(token+'x'),null);assert.equal(a.verify(a.sign({exp:1})),null);
 assert.equal(a.session({headers:{cookie:a.SESSION+'='+a.sign({kind:'challenge',address:'0x'+'a'.repeat(64),exp:Date.now()+10000})}}),null);
 assert.notEqual(a.namespace('0x'+'a'.repeat(64)),a.namespace('0x'+'b'.repeat(64)));
 assert.equal(a.sameOrigin({headers:{...headers,origin:'https://attacker.example'}}),false);
});
test('wallet sign-in verifies a real Sui personal-message signature and wallet binding',async()=>{
 const {Ed25519Keypair}=await import('@mysten/sui/keypairs/ed25519');const key=Ed25519Keypair.generate();const address=key.toSuiAddress();
 const c=response();await auth({method:'POST',headers,body:{action:'challenge',address}},c);assert.equal(c.code,200);
 const signed=await key.signPersonalMessage(new TextEncoder().encode(c.body.message));
 const r=response();await auth({method:'POST',headers:{...headers,cookie:c.headers['Set-Cookie'].split(';')[0]},body:{action:'verify',address,signature:signed.signature}},r);assert.equal(r.code,200);assert.equal(r.body.address,address);assert.ok(r.headers['Set-Cookie'][0].includes('HttpOnly; Secure; SameSite=Strict'));
 const wrong=response();await auth({method:'POST',headers:{...headers,cookie:c.headers['Set-Cookie'].split(';')[0]},body:{action:'verify',address:'0x'+'b'.repeat(64),signature:signed.signature}},wrong);assert.equal(wrong.code,401);
});
test('cloud routes require identity and reject cross-site requests',async()=>{
 const r=response();await memoryHandler({method:'POST',headers,body:{action:'recall',query:'private'}},r);assert.equal(r.code,401);
 const x=response();await memoryHandler({method:'POST',headers:{...headers,origin:'https://attacker.example',cookie:user()},body:{action:'recall',query:'private'}},x);assert.equal(x.code,403);
 const t=response();await tatum({method:'POST',headers,body:{}},t);assert.equal(t.code,401);
});
test('memory validates bounded entries and never accepts a namespace from user input',async()=>{
 assert.throws(()=>memory.validateEntry({id:'x',question:'?',side:'Yes',reason:''}));
 assert.throws(()=>memory.validateEntry({id:'x',question:'?',side:'Yes',reason:'a'.repeat(5001)}));
 const oldConfig=memory.configured,oldClient=memory.client;memory.configured=()=>true;let ns;
 memory.client=async address=>{ns=a.namespace(address);return{getRememberStatus:async()=>({status:'done',namespace:'signalscore-another-user',blob_id:'private-blob'})};};
 try{const r=response();await memoryHandler({method:'POST',headers:{...headers,cookie:user()},body:{action:'status',jobId:'abc',namespace:'signalscore-another-user'}},r);assert.equal(r.code,404);assert.equal(r.body.blobId,undefined);assert.equal(ns,'signalscore-0x'+'a'.repeat(64));}finally{memory.configured=oldConfig;memory.client=oldClient;}
});
test('remember retries use stable operation keys and acceptance is not a completed write',async()=>{
 const oc=memory.configured,og=memory.client;memory.configured=()=>true;const keys=[];memory.client=async()=>({remember:async(text,opts)=>{keys.push(opts.idempotencyKey);return{job_id:'job-1',status:'running'};}});
 const entry={id:'prediction-1',question:'Will it happen?',reason:'Evidence',side:'Yes',createdAt:'2026-10-28T12:00:00Z'};
 try{for(let i=0;i<2;i++){const r=response();await memoryHandler({method:'POST',headers:{...headers,cookie:user()},body:{action:'remember',entry}},r);assert.equal(r.code,202);assert.equal(r.body.status,'running');assert.equal(r.body.blobId,undefined);}assert.equal(keys[0],keys[1]);}finally{memory.configured=oc;memory.client=og;}
});
test('outcome checks require terminal status and actual payout data',()=>{
 assert.equal(assess({status:'pending',payouts:[1,0],price:'1'}).state,'pending');
 assert.equal(assess({status:'resolved',price:'1'}).state,'unconfirmed');
 assert.equal(assess({status:'resolved',payouts:[0,1]}).winnerIndex,1);
 assert.equal(assess({status:'resolved',payouts:[.5,.5]}).state,'refunded');
 assert.equal(assess({status:'resolved',payouts:[null,1]}).state,'unconfirmed');
});
test('resolution uses explicit legacy winner flags if payout data is absent',async()=>{
 const old=global.fetch;const condition='0x'+'c'.repeat(64);let calls=0;
 global.fetch=async()=>({ok:true,json:async()=>++calls===1?{data:[{condition_id:condition,status:'resolved'}]}:{condition_id:condition,closed:true,tokens:[{outcome:'Yes',winner:false,price:0},{outcome:'No',winner:true,price:1}]}});
 try{const r=response();await require('../api/resolution')({method:'GET',url:'/api/resolution?condition='+condition},r);assert.equal(r.code,200);assert.equal(r.body.state,'resolved');assert.equal(r.body.winnerOutcome,'No');}finally{global.fetch=old;}
});
test('a closed legacy market without winner flags remains unconfirmed',async()=>{
 const old=global.fetch;const condition='0x'+'c'.repeat(64);let calls=0;
 global.fetch=async()=>({ok:true,json:async()=>++calls===1?{data:[]}:{condition_id:condition,closed:true,tokens:[{outcome:'Yes',winner:false,price:1},{outcome:'No',winner:false,price:0}]}});
 try{const r=response();await require('../api/resolution')({method:'GET',url:'/api/resolution?condition='+condition},r);assert.equal(r.body.state,'unconfirmed');assert.equal(r.body.winnerOutcome,null);}finally{global.fetch=old;}
});
