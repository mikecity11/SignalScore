const a=require('../lib/auth');
module.exports=async(req,res)=>{
 if(!a.prepare(req,res,'POST'))return;
 if(!a.session(req))return res.status(401).json({error:'Sign in with your Sui wallet first.'});
 if(!process.env.TATUM_API_KEY)return res.status(503).json({error:'Tatum is awaiting its API key.'});
 if(!/^0x[a-fA-F0-9]{64}$/.test(process.env.MEMWAL_ACCOUNT_ID||''))return res.status(503).json({error:'Set the Walrus Memory account ID before checking its Sui evidence.'});
 let transport;
 try{
  const [{SuiGrpcClient},{GrpcTransport},{ChannelCredentials}]=await Promise.all([import('@mysten/sui/grpc'),import('@protobuf-ts/grpc-transport'),import('@grpc/grpc-js')]);
  transport=new GrpcTransport({host:'sui-mainnet-grpc.gateway.tatum.io:443',channelCredentials:ChannelCredentials.createSsl(),meta:{'x-api-key':process.env.TATUM_API_KEY},timeout:12000});
  const client=new SuiGrpcClient({network:'mainnet',transport});
  const {response}=await client.ledgerService.getObject({objectId:process.env.MEMWAL_ACCOUNT_ID,readMask:{paths:['object_id','version','digest','object_type']}});
  if(!response.object?.objectId)throw new Error('No account object returned');
  const o=response.object;
  return res.status(200).json({provider:'Tatum',network:'Sui mainnet',checkedAt:new Date().toISOString(),objectId:o.objectId,version:String(o.version),digest:o.digest,type:o.objectType||null,explorer:'https://suiscan.xyz/mainnet/object/'+o.objectId,note:'Confirms this account object exists on Sui. This alone does not prove individual memories were written.'});
 }catch{return res.status(502).json({error:'Tatum could not read the Sui account object. Check your key, its Sui gRPC access and the mainnet account ID.'});}
 finally{transport?.close();}
};
