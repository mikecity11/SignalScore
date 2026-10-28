import {getWallets} from '@wallet-standard/app';
window.signalWallet={
 list(){return getWallets().get().filter(w=>w.features['standard:connect']&&w.features['sui:signPersonalMessage']).map(w=>({name:w.name}));},
 async signIn(name){
  const w=getWallets().get().find(w=>w.name===name);if(!w)throw new Error('Wallet not found. Install a Sui wallet extension, then refresh.');
  const connection=await w.features['standard:connect'].connect();
  const account=connection.accounts.find(x=>x.chains.some(c=>c.startsWith('sui:'))&&x.features.includes('sui:signPersonalMessage'));
  if(!account)throw new Error('This wallet has no Sui account with personal-message signing.');
  const challenge=await call({action:'challenge',address:account.address});
  const signed=await w.features['sui:signPersonalMessage'].signPersonalMessage({account,message:new TextEncoder().encode(challenge.message)});
  return call({action:'verify',address:account.address,signature:signed.signature});
 }
};
async function call(body){const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to sign in.');return d;}
