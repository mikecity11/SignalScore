const a=require('../lib/auth');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET')return res.status(200).json({configured:Boolean(process.env.SESSION_SECRET),address:a.session(req)?.address||null});
  if(!a.prepare(req,res,'POST'))return;
  try{
    const b=a.body(req);
    if(b.action==='logout'){res.setHeader('Set-Cookie',[a.cookie(a.SESSION,'',0),a.cookie(a.CHALLENGE,'',0)]);return res.status(200).json({ok:true});}
    if(!process.env.SESSION_SECRET)return res.status(503).json({error:'Wallet sign-in is awaiting server setup.'});
    if(b.action==='challenge'){
      if(!/^0x[a-fA-F0-9]{64}$/.test(b.address||''))return res.status(400).json({error:'A valid Sui wallet address is required.'});
      const payload={kind:'challenge',address:b.address.toLowerCase(),host:req.headers.host,nonce:a.nonce(),exp:Date.now()+300000};
      const message=`Sign in to SignalScore\nDomain: ${payload.host}\nWallet: ${payload.address}\nNonce: ${payload.nonce}\nExpires: ${new Date(payload.exp).toISOString()}\nThis proves wallet ownership only. It does not authorize a payment or transaction.`;
      payload.message=message;
      res.setHeader('Set-Cookie',a.cookie(a.CHALLENGE,a.sign(payload),300));return res.status(200).json({message});
    }
    if(b.action==='verify'){
      const c=a.verify(a.cookies(req)[a.CHALLENGE]);
      if(c?.kind!=='challenge'||c.host!==req.headers.host||c.address!==String(b.address).toLowerCase())return res.status(401).json({error:'Sign-in challenge expired. Connect again.'});
      if(typeof b.signature!=='string'||b.signature.length>5000)return res.status(400).json({error:'Invalid wallet signature.'});
      try{const {verifyPersonalMessageSignature}=await import('@mysten/sui/verify');await verifyPersonalMessageSignature(new TextEncoder().encode(c.message),b.signature,{address:c.address});}
      catch{return res.status(401).json({error:'Wallet signature could not be verified. Use a Sui wallet with personal-message signing.'});}
      res.setHeader('Set-Cookie',[a.cookie(a.SESSION,a.sign({kind:'session',address:c.address,exp:Date.now()+86400000}),86400),a.cookie(a.CHALLENGE,'',0)]);
      return res.status(200).json({address:c.address});
    }
    return res.status(400).json({error:'Unknown sign-in action.'});
  }catch{return res.status(400).json({error:'Unable to process sign-in. Please try again.'});}
};
