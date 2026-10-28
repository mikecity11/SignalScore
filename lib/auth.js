const {createHmac,randomBytes,timingSafeEqual}=require('node:crypto');
const SESSION='__Host-signalscore-session';
const CHALLENGE='__Host-signalscore-challenge';
function secret(){const s=process.env.SESSION_SECRET;if(!s||s.length<32)throw new Error('Authentication is not configured.');return s;}
function sign(data){const text=Buffer.from(JSON.stringify(data)).toString('base64url');return text+'.'+createHmac('sha256',secret()).update(text).digest('base64url');}
function verify(token){try{const [data,mac,...rest]=String(token||'').split('.');if(rest.length||!data||!mac)return null;const expected=createHmac('sha256',secret()).update(data).digest();const supplied=Buffer.from(mac,'base64url');if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return null;const value=JSON.parse(Buffer.from(data,'base64url'));return value.exp>Date.now()?value:null;}catch{return null;}}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim().split(/=(.*)/s)).filter(x=>x[0]));}
function session(req){const s=verify(cookies(req)[SESSION]);return s?.kind==='session'&&/^0x[a-f0-9]{64}$/.test(s.address)?s:null;}
function namespace(address){if(!/^0x[a-f0-9]{64}$/.test(address))throw new Error('Invalid wallet identity');return 'signalscore-'+address;}
function cookie(name,value,maxAge){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;}
function sameOrigin(req){const origin=req.headers.origin;if(!origin)return false;try{const u=new URL(origin);return u.protocol==='https:'&&u.host===req.headers.host;}catch{return false;}}
function prepare(req,res,method){res.setHeader('Cache-Control','no-store');if(req.method!==method){res.setHeader('Allow',method);res.status(405).json({error:'Method not allowed.'});return false;}if(method==='POST'&&!sameOrigin(req)){res.status(403).json({error:'Invalid request origin.'});return false;}return true;}
function body(req){let b=typeof req.body==='string'?JSON.parse(req.body):req.body;if(!b||typeof b!=='object'||Array.isArray(b)||JSON.stringify(b).length>50000)throw new Error('Invalid request');return b;}
module.exports={SESSION,CHALLENGE,sign,verify,cookies,session,namespace,cookie,sameOrigin,prepare,body,nonce:()=>randomBytes(24).toString('hex')};
