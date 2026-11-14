/* Bungalow Supplies — sync adapter.
   Always keeps a local mirror (localStorage) so the app works fully offline.
   If window.BS_FIREBASE_CONFIG.apiKey is set, it also syncs in real time via Firebase Firestore:
     rooms/{roomKey}/{items|staples|history|meals|config}/{docId}
   roomKey is a 64-hex PBKDF2 key derived from the household code; the code itself is never stored or sent. */
(function(){
const COLLS=['items','staples','history','meals','config'];
const SDK='10.12.2';
const enabled=()=>{const c=window.BS_FIREBASE_CONFIG||{};return !!(c.apiKey&&c.projectId&&c.appId)};

async function deriveRoomKey(code){
  const norm=code.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
  const enc=new TextEncoder();
  const km=await crypto.subtle.importKey('raw',enc.encode(norm),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode('bungalow-supplies/room/v1'),iterations:600000},km,256);
  return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ---------- local mirror ---------- */
function Local(room){
  const K='bs:d:'+room.slice(0,24), PK='bs:p:'+room.slice(0,24);
  let data; try{data=JSON.parse(localStorage.getItem(K))}catch(e){}
  data=data||{}; COLLS.forEach(c=>data[c]=data[c]||{});
  let pending; try{pending=JSON.parse(localStorage.getItem(PK))||{}}catch(e){pending={}}
  const save=()=>{try{localStorage.setItem(K,JSON.stringify(data))}catch(e){console.warn(e)}};
  const savePending=()=>localStorage.setItem(PK,JSON.stringify(pending));
  return {data,pending,
    put(c,id,doc,track){data[c][id]=doc;save();if(track){pending[c+'/'+id]=1;savePending()}},
    del(c,id,track){delete data[c][id];save();if(track){pending[c+'/'+id]=1;savePending()}},
    setColl(c,map){data[c]=map;save()},
    clearPending(){pending={};savePending()},
    hasData(){return Object.keys(data.items).length+Object.keys(data.staples).length+Object.keys(data.config).length>0},
    wipe(){localStorage.removeItem(K);localStorage.removeItem(PK)}};
}

/* ---------- adapter ---------- */
async function createSync(room,onData,onStatus){
  const L=Local(room); let fb=null, mode=enabled()?'firebase':'local', status=mode==='local'?'local':'offline';
  const meta={}; COLLS.forEach(c=>meta[c]={cache:true,pending:false});
  const bc=('BroadcastChannel'in window)?new BroadcastChannel('bs-'+room.slice(0,12)):null;
  const emitAll=()=>COLLS.forEach(c=>onData(c,L.data[c]));
  const setStatus=s=>{if(s!==status){status=s;onStatus(s)}};
  const recompute=()=>{
    if(mode==='local')return setStatus('local');
    if(!fb||!navigator.onLine)return setStatus('offline');
    const v=Object.values(meta);
    setStatus(v.some(m=>m.pending)?'syncing':v.some(m=>m.cache)?'offline':'synced');
  };
  if(bc)bc.onmessage=()=>{const L2=Local(room);COLLS.forEach(c=>{L.data[c]=L2.data[c];onData(c,L.data[c])})};
  window.addEventListener('online',recompute);window.addEventListener('offline',recompute);
  emitAll(); onStatus(status);

  const api={mode,local:L,
    get status(){return status},
    put(c,id,doc){doc.updatedAt=Date.now();L.put(c,id,doc,mode==='firebase'&&!fb);if(fb)fb.fs.setDoc(fb.fs.doc(fb.db,'rooms',room,c,id),doc).catch(e=>console.warn('put',e));
      if(bc)bc.postMessage(1);onData(c,L.data[c])},
    del(c,id){L.del(c,id,mode==='firebase'&&!fb);if(fb)fb.fs.deleteDoc(fb.fs.doc(fb.db,'rooms',room,c,id)).catch(e=>console.warn('del',e));
      if(bc)bc.postMessage(1);onData(c,L.data[c])},
    // Does a household list already exist for this key? true / false / null (unknown, e.g. offline)
    async exists(){if(mode==='local')return L.hasData();if(!fb)return null;
      try{const s=await Promise.race([fb.fs.getDocFromServer(fb.fs.doc(fb.db,'rooms',room,'config','main')),new Promise((_,r)=>setTimeout(()=>r('timeout'),8000))]);return s.exists()}catch(e){return null}},
    stop(){if(fb)fb.unsubs.forEach(u=>u());if(bc)bc.close()}
  };
  if(mode==='firebase'){
    try{
      const [appM,fs]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${SDK}/firebase-firestore.js`)]);
      const app=appM.getApps().length?appM.getApp():appM.initializeApp(window.BS_FIREBASE_CONFIG);
      let db; try{db=fs.initializeFirestore(app,{localCache:fs.persistentLocalCache({tabManager:fs.persistentMultipleTabManager()})})}catch(e){db=fs.getFirestore(app)}
      if(window.BS_FIREBASE_CONFIG.emulatorHost){const [h,p]=window.BS_FIREBASE_CONFIG.emulatorHost.split(':');try{fs.connectFirestoreEmulator(db,h,+p)}catch(e){}} // testing only
      fb={fs,db,unsubs:[]};
      // flush anything written while the SDK couldn't load
      Object.keys(L.pending).forEach(k=>{const [c,id]=k.split('/');const d=L.data[c][id];
        d?fs.setDoc(fs.doc(db,'rooms',room,c,id),d):fs.deleteDoc(fs.doc(db,'rooms',room,c,id))});L.clearPending();
      const firstKey='bs:fbinit:'+room.slice(0,24);let seeded=!!localStorage.getItem(firstKey);const before=seeded?null:JSON.parse(JSON.stringify(L.data));
      COLLS.forEach(c=>{
        fb.unsubs.push(fs.onSnapshot(fs.collection(db,'rooms',room,c),{includeMetadataChanges:true},snap=>{
          meta[c]={cache:snap.metadata.fromCache,pending:snap.metadata.hasPendingWrites};
          if(c==='config'&&!snap.metadata.fromCache&&!seeded){seeded=true;localStorage.setItem(firstKey,'1');
            if(snap.empty&&before&&Object.keys(before.config).length){ // first time on Firebase: upload this phone's local list
              COLLS.forEach(cc=>Object.entries(before[cc]).forEach(([id,d])=>fs.setDoc(fs.doc(db,'rooms',room,cc,id),d)));return}}
          if(!snap.metadata.fromCache||snap.size||!L.hasData()){const m={};snap.forEach(d=>m[d.id]=d.data());L.setColl(c,m);onData(c,m)}
          recompute();
        },err=>{console.warn('snapshot',c,err);meta[c].cache=true;recompute()}));
      });
    }catch(e){console.warn('Firebase unavailable, using local mirror',e);fb=null}
    recompute();
  }
  return api;
}
window.BSync={createSync,deriveRoomKey,firebaseEnabled:enabled};
})();
