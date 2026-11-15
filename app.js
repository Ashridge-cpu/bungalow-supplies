/* Bungalow Supplies v1 — shared shopping list. No prices or money anywhere, by design. */
(function(){
'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);

/* ---------- reference data ---------- */
const CATS=[
 {id:'produce',name:'Produce',col:'#6cc24a'},{id:'dairy',name:'Dairy',col:'#5aa9ff'},{id:'bakery',name:'Bakery',col:'#e8a54b'},
 {id:'meat',name:'Meat & Fish',col:'#ef6b6b'},{id:'frozen',name:'Frozen',col:'#7fd6e8'},{id:'pantry',name:'Pantry',col:'#d4b483'},
 {id:'drinks',name:'Drinks',col:'#f28fb1'},{id:'pharmacy',name:'Pharmacy & Toiletries',col:'#b98cff'},{id:'household',name:'Household',col:'#4fd1b5'},
 {id:'homeware',name:'Homeware',col:'#f2c94c'},{id:'other',name:'Other',col:'#9aa0a6'}];
const CAT=Object.fromEntries(CATS.map(c=>[c.id,c]));
const DEFAULT_STORES=[
 {id:'waitrose',name:'Waitrose',col:'#5b8c2a'},{id:'ms',name:'M&S',col:'#0e3b2e'},{id:'boots',name:'Boots',col:'#0b1f6b'},
 {id:'sainsburys',name:"Sainsbury's",col:'#f06c00'},{id:'johnlewis',name:'John Lewis',col:'#000000'},{id:'misc',name:'Misc',col:'#5f6368'}];
const UNITS=['','g','kg','ml','L','pints','packs','tins','bottles'];
const STEP={g:50,kg:.5,ml:100,L:.5};
const KW={
 produce:'apple apples banana bananas orange oranges lemon lemons lime limes grape grapes pear pears plum plums peach nectarine melon watermelon pineapple mango kiwi berries strawberries raspberries blueberries blackberries cherries avocado avocados tomato tomatoes cherry tomatoes potato potatoes new potatoes sweet potato onion onions red onion red onions spring onions shallots garlic ginger carrot carrots parsnip parsnips swede turnip leek leeks celery cucumber lettuce salad rocket spinach kale cabbage broccoli cauliflower sprouts brussels courgette courgettes aubergine pepper peppers chilli chillies mushroom mushrooms beetroot asparagus green beans runner beans peas sweetcorn corn on the cob herbs coriander parsley basil mint rosemary thyme fruit veg vegetables butternut squash pak choi radish fennel',
 dairy:'milk semi-skimmed skimmed whole milk oat milk almond milk butter cheese cheddar mozzarella parmesan feta halloumi brie stilton cream double cream single cream creme fraiche sour cream yoghurt yogurt greek yoghurt eggs egg custard margarine spread clotted cream cottage cheese mascarpone ricotta',
 bakery:'bread loaf sourdough wholemeal baguette rolls bread rolls crumpets muffins bagels croissants pastries pitta wraps tortillas naan scones teacakes cake doughnuts hot cross buns brioche english muffins',
 meat:'chicken chicken breast chicken thighs beef mince steak pork pork chops lamb bacon sausages ham turkey gammon duck salmon cod haddock tuna prawns fish mackerel sea bass kippers chorizo salami pepperoni meatballs burgers fish fingers',
 frozen:'frozen ice cream ice lollies frozen peas oven chips chips frozen veg ice cubes sorbet pizza frozen pizza',
 pantry:'pasta spaghetti penne rice noodles flour sugar salt pepper oil olive oil vegetable oil vinegar stock cubes stock gravy beans baked beans chickpeas lentils tinned tomatoes chopped tomatoes passata tomato puree soup cereal porridge oats muesli granola jam marmalade honey peanut butter nutella marmite ketchup mayonnaise mayo mustard brown sauce soy sauce curry paste spices paprika cumin cinnamon herbs dried crackers biscuits crisps chocolate sweets nuts raisins tea teabags tea bags coffee instant coffee hot chocolate cocoa baking powder yeast custard powder tinned tuna sweetcorn tin',
 drinks:'water sparkling water juice orange juice apple juice squash cola coke lemonade tonic soda beer lager cider wine red wine white wine prosecco champagne gin vodka whisky rum smoothie kombucha',
 pharmacy:'toothpaste toothbrush mouthwash floss shampoo conditioner shower gel soap hand soap deodorant razor razors shaving foam sun cream suncream moisturiser lotion paracetamol ibuprofen aspirin plasters vitamins tissues cotton wool cotton buds sanitary tampons lip balm hand cream make up makeup nail polish remover hair gel hairspray antihistamine cold medicine lemsip strepsils prescription contact lens solution eye drops',
 household:'toilet roll toilet paper kitchen roll bin bags bin liners washing up liquid washing-up liquid dishwasher tablets laundry detergent washing powder washing liquid fabric conditioner softener bleach cleaner surface spray polish sponges scourers cloths foil cling film baking paper sandwich bags batteries light bulb bulbs matches candles air freshener dettol fairy zoflora',
 homeware:'towel towels bedding duvet pillow pillows sheets cushion mug mugs plates bowls glasses cutlery saucepan pan frying pan baking tray tupperware storage box lamp vase frame rug curtains blanket throw kettle toaster'};
const KWLIST=[];Object.entries(KW).forEach(([c,s])=>{const words=s.split(' ');
 // build phrases: greedy pairs present in list text (multi-word phrases are listed adjacently, so also add 2- and 3-word windows that appear in the source string)
 words.forEach((w,i)=>{KWLIST.push([w,c]);if(words[i+1])KWLIST.push([w+' '+words[i+1],c]);if(words[i+2])KWLIST.push([w+' '+words[i+1]+' '+words[i+2],c])})});
const OVERRIDE={'peanut butter':'pantry','butter beans':'pantry','ice cream':'frozen','frozen peas':'frozen','fish fingers':'frozen','cream crackers':'pantry','cherry tomatoes':'produce','tinned tomatoes':'pantry','chopped tomatoes':'pantry','tomato puree':'pantry','coconut milk':'pantry','oat milk':'dairy','hot chocolate':'pantry','washing up liquid':'household','hand soap':'pharmacy','dog food':'other','cat food':'other','tea towel':'homeware','tea towels':'homeware','kitchen roll':'household','orange juice':'drinks','apple juice':'drinks','sun cream':'pharmacy','frozen pizza':'frozen','pizza':'frozen','corn flakes':'pantry','tinned tuna':'pantry','olive oil':'pantry'};
function categorise(name){
 const n=' '+name.toLowerCase().replace(/[^a-z0-9' -]/g,' ').replace(/\s+/g,' ').trim()+' ';
 for(const k in OVERRIDE)if(n.includes(' '+k+' '))return OVERRIDE[k];
 let best=null,bl=0;
 for(const [k,c] of KWLIST){if(k.length>bl&&n.includes(' '+k+' ')){best=c;bl=k.length}}
 if(!best){for(const [k,c] of KWLIST){if(k.length>3&&k.length>bl&&n.includes(' '+k.replace(/s$/,'')+' ')){best=c;bl=k.length}}}
 return best||'other';
}
const norm=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
const keyOf=s=>norm(s).split(' ').map(w=>w.length>3&&!/ss$/.test(w)?w.replace(/(oes|ches|shes)$/,m=>m.slice(0,-2)).replace(/s$/,''):w).join(' ');
const UNITMAP={g:'g',gram:'g',grams:'g',kg:'kg',kilo:'kg',kilos:'kg',ml:'ml',l:'L',litre:'L',litres:'L',liter:'L',liters:'L',pint:'pints',pints:'pints',pack:'packs',packs:'packs',tin:'tins',tins:'tins',can:'tins',cans:'tins',bottle:'bottles',bottles:'bottles'};
const UNITRX='(g|grams?|kg|kilos?|ml|l|litres?|liters?|pints?|packs?|tins?|cans?|bottles?)';
function parseLine(raw){
 let s=raw.replace(/^\s*(?:[-*•▪◦]|\[\s?\]|\d+[.)])\s+/,'').trim(); if(!s)return null;
 let note='',qty=null,unit='';
 const nm=s.match(/^(.*?)\s*\(([^)]+)\)\s*$/); if(nm){s=nm[1];note=nm[2]}
 let m;
 if((m=s.match(new RegExp('^(\\d+(?:\\.\\d+)?)\\s*'+UNITRX+'\\.?\\s+(?:of\\s+)?(.+)$','i')))){qty=+m[1];unit=UNITMAP[m[2].toLowerCase()];s=m[3]}
 else if((m=s.match(/^(\d+(?:\.\d+)?)\s*(?:x|×)?\s+(.+)$/i))){qty=+m[1];s=m[2]}
 else if((m=s.match(new RegExp('^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*'+UNITRX+'$','i')))){s=m[1];qty=+m[2];unit=UNITMAP[m[3].toLowerCase()]}
 else if((m=s.match(/^(.+?)\s*(?:x|×)\s*(\d+)$/i))){s=m[1];qty=+m[2]}
 else if((m=s.match(/^(a|an|one|two|three|four|five|six)\s+(.+)$/i))){const w={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6}[m[1].toLowerCase()];qty=w;s=m[2]}
 s=s.trim(); if(!s)return null;
 return {name:s.charAt(0).toUpperCase()+s.slice(1),qty,unit,note};
}
function fmtQty(it){const q=+(+it.qty).toFixed(2);if(!it.unit)return q>1?'×'+q:'';
 if(['g','kg','ml','L'].includes(it.unit))return q+it.unit;return q+' '+(q===1?it.unit.replace(/s$/,''):it.unit)}

/* ---------- state ---------- */
const S={items:{},staples:{},history:{},meals:{},config:{}};
let G=0, sync=null, room=localStorage.getItem('bs:room'), filter=localStorage.getItem('bs:filter')||'all', page='list', rbOpen=false;
const cfg=()=>S.config.main||{};
const stores=()=>(cfg().stores&&cfg().stores.length?cfg().stores:DEFAULT_STORES);
const storeById=id=>stores().find(s=>s.id===id)||stores().find(s=>s.id==='misc')||{id:'misc',name:'Misc',col:'#5f6368'};
const catOrder=f=>{const o=(cfg().catOrder||{})[f]||(cfg().catOrder||{}).all||[];return [...o.filter(c=>CAT[c]),...CATS.map(c=>c.id).filter(c=>!o.includes(c))]};
const textOn=hex=>{const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>150?'#111':'#fff'};
function saveCfg(patch){sync.put('config','main',Object.assign({},cfg(),patch))}

/* ---------- item ops ---------- */
function addItem(p,opt={}){
 if(!p||!p.name)return null;
 const key=keyOf(p.name), h=S.history[key]||{};
 const shop=opt.shop||(filter!=='all'?filter:(h.shop&&stores().some(s=>s.id===h.shop)?h.shop:'misc'));
 const cat=opt.cat||h.cat||categorise(p.name);
 const unit=p.qty!=null?p.unit:(h.unit||''), qty=p.qty!=null?p.qty:(h.qty||1);
 const items=Object.values(S.items);
 const active=items.find(i=>i.status!=='bought'&&i.key===key);
 let it;
 if(active){ // merge duplicates (e.g. 2 onions + 1 onion = 3 onions)
  it=Object.assign({},active);
  if((active.unit||'')===(unit||''))it.qty=+(+active.qty+ +qty).toFixed(2);else if(p.qty!=null){it.qty=qty;it.unit=unit}
  if(p.note)it.note=it.note?it.note+'; '+p.note:p.note;
 }else{
  const old=items.find(i=>i.status==='bought'&&i.key===key);
  it=Object.assign({},old||{id:uid()},{name:old&&!opt.rename?old.name:p.name,key,qty,unit,shop,cat,note:p.note||(old&&old.note)||'',status:'active',addedAt:Date.now(),boughtAt:null});
 }
 sync.put('items',it.id,it);
 sync.put('history',key||'x',{name:it.name,qty:active?(h.qty||qty):qty,unit,shop:it.shop,cat:it.cat,count:(h.count||0)+1,last:Date.now()});
 return {it,merged:!!active};
}
function addMany(lines,src){let n=0,m=0;lines.forEach(l=>{const r=addItem(parseLine(l));if(r){n++;if(r.merged)m++}});
 if(n)toast((n===1?'Added 1 item':'Added '+n+' items')+(m?' ('+m+' merged)':'')+(src?' from '+src:''));render();return n}
function setBought(id,b){const it=S.items[id];if(!it)return;sync.put('items',id,Object.assign({},it,{status:b?'bought':'active',boughtAt:b?Date.now():null,addedAt:b?it.addedAt:Date.now()}))}
function bump(id,d){const it=S.items[id];if(!it)return;const st=STEP[it.unit]||1;let q=+(+it.qty+d*st).toFixed(2);if(q<st)q=st;if(q===it.qty)return;sync.put('items',id,Object.assign({},it,{qty:q}))}

/* ---------- rendering ---------- */
function renderChips(){
 const act=Object.values(S.items).filter(i=>i.status!=='bought'),cnt=id=>act.filter(i=>id==='all'||i.shop===id).length;
 let h='<button class="chip'+(filter==='all'?' on':'')+'" data-f="all" style="background:#ff7726;color:#1a0d04;border-color:#ff7726">All <span class="n">'+cnt('all')+'</span></button>';
 stores().forEach(s=>{const c=cnt(s.id);h+='<button class="chip'+(filter===s.id?' on':'')+'" data-f="'+esc(s.id)+'" style="background:'+s.col+';color:'+textOn(s.col)+'">'+esc(s.name)+(c?' <span class="n">'+c+'</span>':'')+'</button>'});
 h+='<button class="chip add" data-addstore>+ Add store</button>';
 $('#chips').innerHTML=h;
}
function rowHTML(it){const s=storeById(it.shop),q=fmtQty(it);
 return '<div class="row" data-id="'+it.id+'"><button class="tick" data-tick aria-label="Bought '+esc(it.name)+'"><i></i></button><span class="dot" style="background:'+s.col+'" title="'+esc(s.name)+'"></span>'+
 '<div class="nm" data-tick><b>'+esc(it.name)+(q?' '+esc(q):'')+'</b>'+(it.note?'<span>'+esc(it.note)+'</span>':'')+'</div>'+
 '<button class="st" data-dec aria-label="Less">−</button><button class="st" data-inc aria-label="More">+</button><button class="more" data-edit aria-label="Edit">⋮</button></div>'}
function renderList(){
 const inF=i=>filter==='all'||i.shop===filter;
 const act=Object.values(S.items).filter(i=>i.status!=='bought'&&inF(i));
 const bought=Object.values(S.items).filter(i=>i.status==='bought'&&inF(i)).sort((a,b)=>(b.boughtAt||0)-(a.boughtAt||0));
 let h='';
 if(!act.length)h+='<div class="empty"><b>'+(Object.keys(S.items).length?'All done here 🎉':'Your list is empty')+'</b>Type below, tap the mic, or paste a whole list.<br>Tap an item when it’s in the trolley.</div>';
 catOrder(filter).forEach(cid=>{const its=act.filter(i=>(CAT[i.cat]?i.cat:'other')===cid).sort((a,b)=>a.name.localeCompare(b.name));if(!its.length)return;
  h+='<div class="cat" style="color:'+CAT[cid].col+'">'+esc(CAT[cid].name)+'<small>'+its.length+'</small></div><div class="grp">'+its.map(rowHTML).join('')+'</div>'});
 if(bought.length){h+='<div class="rb"><button data-rb>Recently Bought ('+bought.length+')<span>'+(rbOpen?'⌄':'›')+'</span></button>';
  if(rbOpen)h+=bought.slice(0,40).map(it=>'<div class="row" data-id="'+it.id+'"><span class="tick"><i style="background:#3a3a3c;border-color:#555"></i></span><span class="dot" style="background:'+storeById(it.shop).col+'"></span><div class="nm"><b>'+esc(it.name)+'</b></div><button class="readd" data-readd>+ Add again</button></div>').join('');
  h+='</div>'}
 $('#list').innerHTML=h;
}
function renderStaples(){
 const act=Object.values(S.items).filter(i=>i.status!=='bought');
 const list=Object.values(S.staples).sort((a,b)=>a.name.localeCompare(b.name));
 let h='<h2>Staples</h2><p class="hint">Everyday essentials — one tap puts it on the list.</p><div class="addrow"><input id="stadd" placeholder="Add a staple, e.g. 2 pints milk" enterkeyhint="done"><button class="btn p" data-stadd>Add</button></div><div class="tiles">';
 list.forEach(s=>{const on=act.some(i=>i.key===s.key);h+='<button class="tile'+(on?' onl':'')+'" data-staple="'+s.id+'"><b>'+esc(s.name)+'</b><span>'+(on?'✓ On the list':esc([fmtQty(s),storeById(s.shop).name].filter(Boolean).join(' · ')))+'</span><span class="x" data-strm="'+s.id+'" role="button" aria-label="Remove staple">×</span></button>'});
 h+='</div>'+(list.length?'':'<div class="empty">No staples yet.</div>');
 $('#p-staples').innerHTML=h;
}
const DAYS=[['mon','Monday'],['tue','Tuesday'],['wed','Wednesday'],['thu','Thursday'],['fri','Friday'],['sat','Saturday'],['sun','Sunday']];
function renderMeals(){
 if($('#p-meals').contains(document.activeElement)&&document.activeElement.tagName!=='BUTTON')return;
 const now=new Date(),dow=(now.getDay()+6)%7,mon=new Date(now);mon.setDate(now.getDate()-dow);
 let h='<h2>This week’s dinners</h2><p class="hint">Plan dinners, list ingredients one per line, then send them to the list. Duplicates merge automatically.</p>';
 DAYS.forEach(([id,name],i)=>{const m=S.meals[id]||{},d=new Date(mon);d.setDate(mon.getDate()+i);
  h+='<div class="meal'+(i===dow?' today':'')+'" data-day="'+id+'"><div class="dh">'+name+'<small>'+(i===dow?'Today · ':'')+d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+'</small></div>'+
  '<input data-mf="dinner" placeholder="Dinner…" value="'+esc(m.dinner||'')+'"><textarea data-mf="ingredients" placeholder="Ingredients, one per line&#10;e.g. 2 red onions&#10;500g mince">'+esc(m.ingredients||'')+'</textarea>'+
  '<div class="ma"><span>'+(m.sentAt?'✓ Sent to list '+new Date(m.sentAt).toLocaleDateString('en-GB',{weekday:'short'}):'')+'</span><button class="btn p" data-send>Send to list</button></div></div>'});
 h+='<button class="btn d" data-clearweek style="width:100%">Clear the week</button>';
 $('#p-meals').innerHTML=h;
}
function renderSettings(){
 if($('#p-settings').contains(document.activeElement)&&document.activeElement.tagName==='INPUT')return;
 const st=sync?sync.status:'local',fbOn=window.BSync.firebaseEnabled();
 const ordShop=renderSettings.shop||'all';
 let h='<h2>Household</h2><div class="card"><p style="margin:0 0 8px">Household code is set on this phone ✓<br><span class="hint" style="margin:0">Key fingerprint '+(room?room.slice(0,4).toUpperCase()+'-'+room.slice(4,8).toUpperCase():'')+' — should match on both phones.</span></p>'+
 '<p class="hint" style="margin:4px 0 10px">'+(fbOn?'Live sync: '+({synced:'connected and up to date',syncing:'sending changes…',offline:'offline — changes will sync when back in signal',local:'local'}[st]):'Local mode — the list is saved on this phone only. Live sync with Emma’s phone switches on once Firebase is set up.')+'</p>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-changecode>Change household code</button><button class="btn" data-leave>Use a different code on this phone</button></div></div>';
 h+='<h2>Shops</h2><div class="card">'+stores().map(s=>'<div class="srow" data-store="'+esc(s.id)+'"><input type="color" value="'+s.col+'" data-scol aria-label="Colour"><input type="text" value="'+esc(s.name)+'" data-sname aria-label="Name">'+(s.id==='misc'?'<span style="width:44px"></span>':'<button class="rm" data-srm aria-label="Remove">🗑</button>')+'</div>').join('')+
 '<button class="btn" data-addstore style="width:100%;margin-top:8px">+ Add store</button></div>';
 h+='<h2>Aisle order</h2><p class="hint">Drag ≡ (or use ▲▼) so sections match how you walk round each shop.</p><div class="chips" style="position:static;padding:0 0 10px;background:none;margin:0">'+
 [{id:'all',name:'All shops',col:'#ff7726'}].concat(stores()).map(s=>'<button class="chip'+(ordShop===s.id?' on':'')+'" data-ordshop="'+esc(s.id)+'" style="background:'+s.col+';color:'+textOn(s.col)+'">'+esc(s.name)+'</button>').join('')+'</div>'+
 '<div class="grp" id="ordlist">'+catOrder(ordShop).map(c=>'<div class="ord" data-cat="'+c+'"><button class="h" data-drag aria-label="Drag">≡</button><span class="sw" style="background:'+CAT[c].col+'"></span><span>'+esc(CAT[c].name)+'</span><button class="ud" data-up>▲</button><button class="ud" data-dn>▼</button></div>').join('')+'</div>'+
 (ordShop!=='all'&&(cfg().catOrder||{})[ordShop]?'<button class="btn" data-ordreset style="margin-top:8px">Reset to “All shops” order</button>':'');
 h+='<h2>Take to the shops</h2><div class="card"><button class="btn" data-print style="width:100%">Print list</button><p class="hint" style="margin:8px 0 0">Prints one A4 page of shops still to buy, with cut-out boxes you can fold for your pocket.</p></div>';
 h+='<h2>Backup</h2><div class="card" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-export>Save a backup file</button><label class="btn" style="display:flex;align-items:center">Restore from file<input type="file" accept="application/json" data-import hidden></label>'+
 '<button class="btn d" data-clearbought>Clear Recently Bought</button></div>';
 h+='<p class="hint" style="text-align:center;margin:20px 0">Bungalow Supplies v1 · shopping list only — spending lives with Stirling.</p>';
 $('#p-settings').innerHTML=h;
}
function render(){renderChips();if(page==='list')renderList();if(page==='staples')renderStaples();if(page==='meals')renderMeals();if(page==='settings')renderSettings()}
let rq=0;function soon(){if(!rq)rq=requestAnimationFrame(()=>{rq=0;render()})}

/* ---------- UI helpers ---------- */
let tt;function toast(msg,undo){clearTimeout(tt);let t=$('.toast');if(t)t.remove();t=document.createElement('div');t.className='toast';t.innerHTML='<span>'+esc(msg)+'</span>'+(undo?'<button>Undo</button>':'');
 document.body.appendChild(t);if(undo)t.querySelector('button').onclick=()=>{undo();t.remove()};tt=setTimeout(()=>t.remove(),undo?5000:2600)}
function sheet(html,bind){const ot=$('.toast');if(ot)ot.remove();const bg=document.createElement('div');bg.className='sheet-bg';bg.innerHTML='<div class="sheet">'+html+'</div>';document.body.appendChild(bg);
 const close=()=>bg.remove();bg.addEventListener('click',e=>{if(e.target===bg||e.target.closest('[data-close]'))close()});bind&&bind(bg.firstChild,close);return close}
const opts=(arr,sel)=>arr.map(([v,l])=>'<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(l)+'</option>').join('');
function editItem(id,coll='items'){
 const it=Object.assign({},S[coll][id]);if(!it.id)return;
 sheet('<h3>'+(coll==='staples'?'Edit staple':'Edit item')+'</h3><label>Item</label><input id="e-name" value="'+esc(it.name)+'">'+
 '<label>Quantity</label><div class="two"><div class="qty"><button class="st" data-q="-1">−</button><output id="e-qty">'+it.qty+'</output><button class="st" data-q="1">+</button></div><select id="e-unit">'+opts(UNITS.map(u=>[u,u||'items']),it.unit||'')+'</select></div>'+
 '<div class="two"><div><label>Shop</label><select id="e-shop">'+opts(stores().map(s=>[s.id,s.name]),it.shop)+'</select></div><div><label>Section</label><select id="e-cat">'+opts(CATS.map(c=>[c.id,c.name]),it.cat)+'</select></div></div>'+
 '<label>Note</label><textarea id="e-note" rows="2" placeholder="e.g. get the unsalted one, or a substitute">'+esc(it.note||'')+'</textarea>'+
 '<div class="acts">'+(coll==='items'?'<button class="btn" id="e-staple">☆ Save as staple</button>':'')+'<button class="btn d" id="e-del">Delete</button><button class="btn p" id="e-save">Save</button></div>',(el,close)=>{
  let q=+it.qty;el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const st=STEP[el.querySelector('#e-unit').value]||1;q=Math.max(st,+(q+ +b.dataset.q*st).toFixed(2));el.querySelector('#e-qty').textContent=q});
  el.querySelector('#e-unit').onchange=e=>{const st=STEP[e.target.value];if(st&&q<st){q=e.target.value==='g'?250:e.target.value==='ml'?500:1;el.querySelector('#e-qty').textContent=q}};
  const read=()=>({name:el.querySelector('#e-name').value.trim()||it.name,qty:q,unit:el.querySelector('#e-unit').value,shop:el.querySelector('#e-shop').value,cat:el.querySelector('#e-cat').value,note:el.querySelector('#e-note').value.trim()});
  el.querySelector('#e-save').onclick=()=>{const v=read();const n=Object.assign(it,v,{key:keyOf(v.name)});sync.put(coll,it.id,n);
   const hk=n.key||'x',h=S.history[hk]||{};sync.put('history',hk,Object.assign({},h,{name:n.name,qty:n.qty,unit:n.unit,shop:n.shop,cat:n.cat,count:h.count||1,last:Date.now()}));close();render()};
  el.querySelector('#e-del').onclick=()=>{const copy=Object.assign({},S[coll][id]);sync.del(coll,id);close();render();toast('Deleted '+copy.name,()=>{sync.put(coll,id,copy);render()})};
  const sb=el.querySelector('#e-staple');if(sb)sb.onclick=()=>{const v=read();addStaple(v);close();toast('Saved '+v.name+' as a staple')};
 });
}
function addStaple(v){const key=keyOf(v.name);const ex=Object.values(S.staples).find(s=>s.key===key);const id=ex?ex.id:uid();
 sync.put('staples',id,{id,key,name:v.name,qty:v.qty||1,unit:v.unit||'',shop:v.shop||'misc',cat:v.cat||categorise(v.name),note:v.note||''});}
function storeSheet(s){const isNew=!s;s=s||{id:'',name:'',col:'#7a5cff'};
 sheet('<h3>'+(isNew?'Add a shop':'Edit shop')+'</h3><label>Name</label><input id="s-name" value="'+esc(s.name)+'" placeholder="e.g. Tesco"><label>Colour</label><input id="s-col" type="color" value="'+s.col+'" style="height:52px;padding:4px">'+
 '<div class="acts"><button class="btn" data-close>Cancel</button><button class="btn p" id="s-save">'+(isNew?'Add shop':'Save')+'</button></div>',(el,close)=>{
  setTimeout(()=>el.querySelector('#s-name').focus(),50);
  el.querySelector('#s-save').onclick=()=>{const name=el.querySelector('#s-name').value.trim();if(!name)return;const col=el.querySelector('#s-col').value;let list=stores().slice();
   if(isNew){let id=norm(name).replace(/ /g,'-')||uid();if(list.some(x=>x.id===id))id+='-'+uid().slice(-3);const mi=list.findIndex(x=>x.id==='misc');list.splice(mi<0?list.length:mi,0,{id,name,col})}
   else list=list.map(x=>x.id===s.id?Object.assign({},x,{name,col}):x);
   saveCfg({stores:list});close();render()}});
}
function removeStore(id){const s=storeById(id);if(!confirm('Remove '+s.name+'? Its items move to Misc.'))return;
 Object.values(S.items).filter(i=>i.shop===id).forEach(i=>sync.put('items',i.id,Object.assign({},i,{shop:'misc'})));
 Object.values(S.staples).filter(i=>i.shop===id).forEach(i=>sync.put('staples',i.id,Object.assign({},i,{shop:'misc'})));
 const co=Object.assign({},cfg().catOrder||{});delete co[id];saveCfg({stores:stores().filter(x=>x.id!==id),catOrder:co});if(filter===id)setFilter('all');render()}
function setFilter(f){filter=f;localStorage.setItem('bs:filter',f);render();const c=document.querySelector('.chip.on');if(c)c.scrollIntoView({inline:'nearest',block:'nearest'})}
function setPage(p){page=p;document.querySelectorAll('.page').forEach(x=>x.classList.toggle('on',x.id==='p-'+p));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));
 $('#bar').hidden=p!=='list';hideSug();window.scrollTo(0,0);render()}

/* ---------- events: list ---------- */
let lp=null,lpFired=false;
$('#list').addEventListener('pointerdown',e=>{const r=e.target.closest('.row[data-id]');if(!r||e.target.closest('.st,.readd'))return;lpFired=false;lp=setTimeout(()=>{lpFired=true;if(navigator.vibrate)navigator.vibrate(15);editItem(r.dataset.id)},550)});
['pointerup','pointercancel','pointerleave','pointermove'].forEach(ev=>$('#list').addEventListener(ev,e=>{if(ev==='pointermove'&&Math.abs(e.movementY)<4)return;clearTimeout(lp)}));
$('#list').addEventListener('contextmenu',e=>{if(e.target.closest('.row'))e.preventDefault()});
$('#list').addEventListener('click',e=>{
 if(lpFired){lpFired=false;return}
 if(e.target.closest('[data-rb]')){rbOpen=!rbOpen;renderList();return}
 const r=e.target.closest('.row[data-id]');if(!r)return;const id=r.dataset.id,it=S.items[id];if(!it)return;
 if(e.target.closest('[data-inc]'))return bump(id,1);
 if(e.target.closest('[data-dec]'))return bump(id,-1);
 if(e.target.closest('[data-edit]'))return editItem(id);
 if(e.target.closest('[data-readd]')){setBought(id,false);toast('Added '+it.name+' back');return}
 if(e.target.closest('[data-tick]')&&!r.classList.contains('done')){r.classList.add('done');if(navigator.vibrate)navigator.vibrate(10);
  setTimeout(()=>{setBought(id,true);toast('Bought '+it.name,()=>setBought(id,false))},380)}
});
$('#chips').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-addstore'))return storeSheet();setFilter(b.dataset.f);if(page!=='list')setPage('list')});
$('#nav').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setPage(b.dataset.p)});

/* ---------- input: autocomplete, enter-to-add, brain-dump paste, voice ---------- */
const inp=$('#add'),sug=$('#sug');
function hideSug(){sug.hidden=true}
function showSug(){
 const q=norm(inp.value);let h='';
 if(!q){h='<button data-dump>📋 <span>Brain-dump: add lots at once</span><small>paste or type a list</small></button>'}
 else{const act=new Set(Object.values(S.items).filter(i=>i.status!=='bought').map(i=>i.key));
  const m=Object.entries(S.history).filter(([k,v])=>norm(v.name).includes(q)).sort((a,b)=>(norm(b[1].name).startsWith(q)-norm(a[1].name).startsWith(q))||(b[1].count-a[1].count)).slice(0,5);
  h=m.map(([k,v])=>'<button data-hist="'+esc(k)+'"><span>'+esc(v.name)+(act.has(keyOf(v.name))?' <small style="margin:0">· on list</small>':'')+'</span><small>'+esc([fmtQty(v),storeById(v.shop).name].filter(Boolean).join(' · '))+'</small></button>').join('')}
 sug.innerHTML=h;sug.hidden=!h;
}
inp.addEventListener('input',showSug);inp.addEventListener('focus',showSug);
inp.addEventListener('blur',()=>setTimeout(hideSug,180));
inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const v=inp.value.trim();if(!v)return;
 const r=addItem(parseLine(v));inp.value='';showSug();render();if(r)toast((r.merged?'Updated ':'Added ')+r.it.name+(fmtQty(r.it)?' '+fmtQty(r.it):'')+' · '+storeById(r.it.shop).name)}});
inp.addEventListener('paste',e=>{const t=(e.clipboardData||window.clipboardData).getData('text');if(t&&/\n/.test(t.trim())){e.preventDefault();addMany(t.split(/\r?\n/));inp.value='';hideSug()}});
sug.addEventListener('pointerdown',e=>e.preventDefault());
sug.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-dump')){hideSug();inp.blur();return dumpSheet()}
 const h=S.history[b.dataset.hist];if(!h)return;const r=addItem({name:h.name,qty:null,unit:'',note:''},{shop:filter!=='all'?filter:h.shop,cat:h.cat});
 inp.value='';showSug();render();if(r)toast((r.merged?'Updated ':'Added ')+h.name)});
function dumpSheet(){sheet('<h3>Brain-dump</h3><p class="hint" style="margin:0 0 8px">One item per line. Quantities work too: “2 tins chopped tomatoes”, “milk x2”, “500g mince”, “butter (unsalted)”.</p><textarea id="dump" rows="9" placeholder="Bananas&#10;2 pints milk&#10;Bread&#10;Toothpaste"></textarea><div class="acts"><button class="btn" data-close>Cancel</button><button class="btn p" id="dump-go">Add all</button></div>',
 (el,close)=>{setTimeout(()=>el.querySelector('#dump').focus(),50);el.querySelector('#dump-go').onclick=()=>{addMany(el.querySelector('#dump').value.split(/\r?\n/));close()}})}
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null;
$('#mic').addEventListener('click',()=>{
 if(!SR)return toast('Voice input isn’t available in this browser');
 if(rec){rec.stop();return}
 rec=new SR();rec.lang='en-GB';rec.interimResults=false;rec.maxAlternatives=1;$('#mic').classList.add('live');toast('Listening… say e.g. “milk, bread and six eggs”');
 rec.onresult=e=>{const t=Array.from(e.results).map(r=>r[0].transcript).join(' ');addMany(t.split(/,|\band then\b|\bplus\b|\band\b/i).map(s=>s.trim()).filter(Boolean),'voice')};
 rec.onerror=e=>{if(e.error==='not-allowed')toast('Allow microphone access for voice input');else if(e.error==='network')toast('Voice input needs a signal');else if(e.error!=='no-speech'&&e.error!=='aborted')toast('Voice input: '+e.error)};
 rec.onend=()=>{rec=null;$('#mic').classList.remove('live')};rec.start();
});

/* ---------- events: staples / meals / settings ---------- */
$('#p-staples').addEventListener('click',e=>{
 const rm=e.target.closest('[data-strm]');if(rm){e.stopPropagation();const s=S.staples[rm.dataset.strm];sync.del('staples',s.id);render();toast('Removed staple '+s.name,()=>{sync.put('staples',s.id,s);render()});return}
 if(e.target.closest('[data-stadd]')){const p=parseLine($('#stadd').value);if(p){addStaple({name:p.name,qty:p.qty||(S.history[keyOf(p.name)]||{}).qty||1,unit:p.unit,note:p.note,shop:(S.history[keyOf(p.name)]||{}).shop});render();$('#stadd').focus()}return}
 const t=e.target.closest('[data-staple]');if(!t)return;const s=S.staples[t.dataset.staple];
 if(Object.values(S.items).some(i=>i.status!=='bought'&&i.key===s.key))return toast(s.name+' is already on the list');
 addItem({name:s.name,qty:s.qty,unit:s.unit,note:s.note},{shop:s.shop,cat:s.cat});render();toast('Added '+s.name)});
$('#p-staples').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='stadd'){e.preventDefault();$('[data-stadd]').click()}});
let stLp;$('#p-staples').addEventListener('pointerdown',e=>{const t=e.target.closest('[data-staple]');if(!t||e.target.closest('[data-strm]'))return;stLp=setTimeout(()=>{lpFired=true;editItem(t.dataset.staple,'staples')},550)});
['pointerup','pointercancel','pointerleave'].forEach(ev=>$('#p-staples').addEventListener(ev,()=>clearTimeout(stLp)));
$('#p-staples').addEventListener('click',e=>{if(lpFired){lpFired=false;e.stopImmediatePropagation()}},true);
$('#p-meals').addEventListener('change',e=>{const f=e.target.dataset.mf;if(!f)return;const d=e.target.closest('[data-day]').dataset.day;sync.put('meals',d,Object.assign({},S.meals[d]||{},{[f]:e.target.value}))});
$('#p-meals').addEventListener('click',e=>{
 if(e.target.closest('[data-clearweek]')){if(confirm('Clear all seven dinners?')){DAYS.forEach(([d])=>S.meals[d]&&sync.del('meals',d));render()}return}
 const b=e.target.closest('[data-send]');if(!b)return;const card=b.closest('[data-day]'),d=card.dataset.day;
 const dinner=card.querySelector('[data-mf=dinner]').value,ing=card.querySelector('[data-mf=ingredients]').value;
 const lines=ing.split(/\r?\n|,/).map(s=>s.trim()).filter(Boolean);if(!lines.length)return toast('Add some ingredients first');
 document.activeElement.blur();sync.put('meals',d,Object.assign({},S.meals[d]||{},{dinner,ingredients:ing,sentAt:Date.now()}));addMany(lines,dinner||'the meal plan')});
$('#p-settings').addEventListener('change',e=>{
 const r=e.target.closest('[data-store]');if(r){const id=r.dataset.store;const name=r.querySelector('[data-sname]').value.trim(),col=r.querySelector('[data-scol]').value;
  if(name)saveCfg({stores:stores().map(s=>s.id===id?Object.assign({},s,{name,col}):s)});return}
 if(e.target.matches('[data-import]')){const f=e.target.files[0];if(!f)return;f.text().then(t=>{const d=JSON.parse(t);if(!d||!d.app||d.app!=='bungalow-supplies')throw 0;
  if(!confirm('Restore this backup? It merges into the current list.'))return;['items','staples','history','meals','config'].forEach(c=>Object.entries(d[c]||{}).forEach(([id,v])=>sync.put(c,id,v)));toast('Backup restored');render()}).catch(()=>toast('That doesn’t look like a Bungalow Supplies backup'))}
});
$('#p-settings').addEventListener('click',e=>{
 const t=e.target;
 if(t.closest('[data-print]'))return printList();
 if(t.closest('[data-addstore]'))return storeSheet();
 if(t.closest('[data-srm]'))return removeStore(t.closest('[data-store]').dataset.store);
 if(t.closest('[data-ordshop]')){renderSettings.shop=t.closest('[data-ordshop]').dataset.ordshop;return renderSettings()}
 if(t.closest('[data-ordreset]')){const co=Object.assign({},cfg().catOrder||{});delete co[renderSettings.shop];saveCfg({catOrder:co});return renderSettings()}
 const ud=t.closest('[data-up],[data-dn]');if(ud){const row=ud.closest('.ord'),sib=ud.hasAttribute('data-up')?row.previousElementSibling:row.nextElementSibling;if(!sib)return;
  ud.hasAttribute('data-up')?row.parentNode.insertBefore(row,sib):row.parentNode.insertBefore(sib,row);saveOrder();return}
 if(t.closest('[data-export]')){const d=Object.assign({app:'bungalow-supplies',v:1,exported:new Date().toISOString()},S);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,1)],{type:'application/json'}));a.download='bungalow-supplies-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();return}
 if(t.closest('[data-clearbought]')){const b=Object.values(S.items).filter(i=>i.status==='bought');if(b.length&&confirm('Clear '+b.length+' recently bought items?')){b.forEach(i=>sync.del('items',i.id));render()}return}
 if(t.closest('[data-changecode]'))return showSetup('change');
 if(t.closest('[data-leave]')){if(confirm('Enter a different household code on this phone? (Your list stays saved under the current code.)'))showSetup('switch');return}
});
function saveOrder(){const order=[...document.querySelectorAll('#ordlist .ord')].map(x=>x.dataset.cat);saveCfg({catOrder:Object.assign({},cfg().catOrder||{},{[renderSettings.shop||'all']:order})})}
// drag-to-reorder (pointer events, works with touch)
let drag=null;
$('#p-settings').addEventListener('pointerdown',e=>{const h=e.target.closest('[data-drag]');if(!h)return;e.preventDefault();const row=h.closest('.ord');drag={row,y:e.clientY,h:row.offsetHeight};row.classList.add('drag');h.setPointerCapture(e.pointerId)});
$('#p-settings').addEventListener('pointermove',e=>{if(!drag)return;const dy=e.clientY-drag.y;drag.row.style.transform='translateY('+dy+'px)';
 const sib=dy<0?drag.row.previousElementSibling:drag.row.nextElementSibling;
 if(sib&&Math.abs(dy)>drag.h*.6){dy<0?drag.row.parentNode.insertBefore(drag.row,sib):drag.row.parentNode.insertBefore(sib,drag.row);drag.y+=dy<0?-drag.h:drag.h;drag.row.style.transform='translateY('+(e.clientY-drag.y)+'px)'}});
const endDrag=()=>{if(!drag)return;drag.row.classList.remove('drag');drag.row.style.transform='';drag=null;saveOrder()};
$('#p-settings').addEventListener('pointerup',endDrag);$('#p-settings').addEventListener('pointercancel',endDrag);


/* ---------- print list (one A4 page, shop boxes to cut out) ---------- */
function printDate(){return new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).replace(/,/g,'')}
function mmPx(mm){const d=document.createElement('div');d.style.cssText='position:absolute;left:-9999px;top:0;width:'+mm+'mm;height:0';document.body.appendChild(d);const px=d.offsetWidth;d.remove();return px}
function printGroups(){
 const act=Object.values(S.items).filter(i=>i.status!=='bought');
 const groups=[];const seen=new Set();
 stores().forEach(s=>{
  const items=act.filter(i=>storeById(i.shop).id===s.id).sort((a,b)=>a.name.localeCompare(b.name,'en-GB'));
  if(items.length){groups.push({store:s,items});items.forEach(i=>seen.add(i.id))}
 });
 const left=act.filter(i=>!seen.has(i.id)).sort((a,b)=>a.name.localeCompare(b.name,'en-GB'));
 if(left.length)groups.push({store:{id:'_other',name:'Other'},items:left});
 return groups;
}
function printItemHTML(it){const q=fmtQty(it);
 return '<div class="pi"><span class="box" aria-hidden="true">☐</span><span class="pn"><b>'+esc(it.name)+(q?' '+esc(q):'')+'</b>'+(it.note?'<i>'+esc(it.note)+'</i>':'')+'</span></div>'}
function buildPrintSheet(){
 const groups=printGroups();
 let el=$('#print-sheet');if(el)el.remove();
 el=document.createElement('div');el.id='print-sheet';
 if(!groups.length){el.innerHTML='<div class="ph"><h1>Bungalow Supplies</h1><span class="dt">'+esc(printDate())+'</span></div><p>Nothing to buy.</p>';document.body.appendChild(el);return el}
 const n=groups.reduce((a,g)=>a+g.items.length,0);
 el.innerHTML='<div class="ph"><h1>Bungalow Supplies</h1><span class="dt">'+esc(printDate())+'</span></div><div class="shops">'+
  groups.map(g=>'<section class="shop"><h2><span class="cut" aria-hidden="true">✂</span>'+esc(g.store.name)+'</h2>'+g.items.map(printItemHTML).join('')+'</section>').join('')+'</div>';
 document.body.appendChild(el);
 fitPrintSheet(el,n,groups.length);
 return el;
}
function fitPrintSheet(el,nItems,nShops){
 const maxH=mmPx(277);
 el.style.width='190mm';el.style.height='auto';el.style.overflow='visible';
 el.style.display='block';el.style.position='absolute';el.style.left='-9999px';el.style.top='0';el.style.visibility='hidden';
 let cols=(nShops>=6||nItems>20)?3:2,pt=11,pad=2.2;
 const apply=()=>{el.style.setProperty('--print-cols',cols);el.style.fontSize=pt+'pt';el.style.setProperty('--print-pad',pad+'mm')};
 const overflow=()=>el.scrollHeight>maxH+1;
 const shrink=()=>{while(overflow()&&pt>7){pt=Math.round((pt-.25)*100)/100;apply()}while(overflow()&&pad>1){pad=Math.round((pad-.2)*10)/10;apply()}};
 apply();shrink();
 if(overflow()&&cols===2){cols=3;pt=Math.min(11,pt+1);pad=2.2;apply();shrink()}
 if(overflow()){while(overflow()&&pt>5.5){pt=Math.round((pt-.2)*100)/100;apply()}}
 // clear measuring styles so @media print can place the sheet on the page (keep font/cols/pad)
 el.style.width='';el.style.height='';el.style.overflow='';el.style.display='';el.style.position='';el.style.left='';el.style.top='';el.style.visibility='';
}
function printList(opt){
 opt=opt||{};
 const groups=printGroups();
 if(!groups.length&&!opt.preview){toast('Nothing to print — the list is empty or everything is ticked off');return null}
 const el=buildPrintSheet();
 if(opt.preview)return el;
 const done=()=>{window.removeEventListener('afterprint',done);if(el&&el.parentNode)el.remove()};
 window.addEventListener('afterprint',done);
 // Two frames so print CSS applies before Android Chrome opens the system print dialog.
 // Do not remove the sheet on a timer — a short delay can blank the preview. afterprint (or the next Print tap) cleans up.
 requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
 return el;
}
$('#print-list').addEventListener('click',()=>printList());

/* ---------- badge ---------- */
function setBadge(s){const b=$('#badge');const L={synced:'Synced',syncing:'Syncing…',offline:'Offline',local:navigator.onLine?'Local':'Offline'};b.textContent=L[s]||s;
 b.className='badge b-'+(s==='local'&&!navigator.onLine?'offline':s);b.title=s==='local'?'Saved on this phone. Live sync starts once Firebase is set up.':'';if(page==='settings')renderSettings()}
window.addEventListener('online',()=>sync&&setBadge(sync.status));window.addEventListener('offline',()=>sync&&setBadge(sync.status));

/* ---------- household code (first run) ---------- */
function seed(){
 saveCfg({stores:DEFAULT_STORES,catOrder:{all:['produce','bakery','meat','dairy','pantry','drinks','frozen','household','pharmacy','homeware','other']},created:Date.now()});
 [['Semi-skimmed milk',2,'pints','waitrose'],['Bread',1,'','waitrose'],['Unsalted butter',250,'g','waitrose'],['Free range eggs',6,'','waitrose'],['Bananas',6,'','sainsburys'],['Tea bags',1,'packs','sainsburys'],['Toilet roll',1,'packs','sainsburys'],['Washing up liquid',1,'bottles','sainsburys'],['Toothpaste',1,'','boots']]
 .forEach(([name,qty,unit,shop])=>addStaple({name,qty,unit,shop}));
}
function showSetup(why){
 const el=$('#setup');el.hidden=false;const fb=window.BSync.firebaseEnabled();
 el.innerHTML='<header class="hero" style="height:170px"><div class="top"><img class="stir" src="stirling.gif" alt=""><h1>Bungalow Supplies</h1></div></header><div class="in">'+
 (why==='retired'?'<p style="color:#ffd99a">This list has moved to a new household code. Enter the new code to carry on.</p>':'')+
 '<h2>'+(why==='change'?'Choose a new household code':'Household code')+'</h2><p>'+(why==='change'?'Your list moves to the new code. Then enter the same new code on the other phone.':
 'Enter the code you and Emma share. Use the same code on both phones and it links them to the same list. You only do this once per phone.')+'</p>'+
 '<input id="c1" type="password" autocomplete="off" placeholder="Household code" enterkeyhint="next"><input id="c2" type="password" autocomplete="off" placeholder="Type it again" enterkeyhint="go">'+
 '<label style="display:flex;gap:8px;align-items:center;color:var(--mut);font-size:14px"><input type="checkbox" id="cshow" style="width:auto;margin:0"> Show code</label>'+
 '<p class="hint" style="margin:10px 0">At least 8 characters — a short phrase you’ll both remember is easiest (pick your own). Capitals and spaces don’t matter. The code itself is never saved; the phone keeps only a scrambled key.</p>'+
 '<div class="err" id="cerr"></div><button class="btn p" id="cgo">'+(why==='change'?'Move list to new code':'Continue')+'</button>'+(why==='change'||why==='switch'?'<button class="btn" id="ccancel">Cancel</button>':'')+
 (fb?'':'<p class="hint" style="margin-top:16px">Running in local mode: the list is kept on this phone until live sync is switched on.</p>')+'</div>';
 const c1=el.querySelector('#c1'),c2=el.querySelector('#c2');
 el.querySelector('#cshow').onchange=e=>{c1.type=c2.type=e.target.checked?'text':'password'};
 c1.onkeydown=e=>{if(e.key==='Enter')c2.focus()};c2.onkeydown=e=>{if(e.key==='Enter')el.querySelector('#cgo').click()};
 const cc=el.querySelector('#ccancel');if(cc)cc.onclick=()=>{el.hidden=true};
 el.querySelector('#cgo').onclick=async()=>{
  const a=c1.value,b=c2.value,err=el.querySelector('#cerr');err.textContent='';
  if(a.replace(/\s/g,'').length<8)return err.textContent='Please use at least 8 characters.';
  if(a.trim().toLowerCase().replace(/\s+/g,' ')!==b.trim().toLowerCase().replace(/\s+/g,' '))return err.textContent='The two codes don’t match.';
  const go=el.querySelector('#cgo');go.disabled=true;go.textContent='Working…';
  try{
   const key=await window.BSync.deriveRoomKey(a);
   if(why==='change'){if(key===room){err.textContent='That’s the same code as now.';return}
    G++;const old=sync,snap=JSON.parse(JSON.stringify(S));
    const nu=await window.BSync.createSync(key,()=>{},()=>{});
    ['items','staples','history','meals','config'].forEach(c=>Object.entries(snap[c]).forEach(([id,v])=>nu.put(c,id,c==='config'?Object.assign({},v,{retired:false}):v)));
    old.put('config','main',{retired:true});// tell the other phone the list moved (no data left behind)
    ['items','staples','history','meals'].forEach(c=>Object.keys(snap[c]).forEach(id=>old.del(c,id)));
    setTimeout(()=>{old.stop();old.local.wipe()},4000);nu.stop();
    localStorage.setItem('bs:room',key);room=key;el.hidden=true;await start();toast('List moved to the new code — now enter it on the other phone');return}
   localStorage.setItem('bs:room',key);room=key;
   await start();
   const ex=await sync.exists();
   if((ex===false&&!Object.keys(S.config).length)||cfg().retired)seed();
   el.hidden=true;toast(ex?'Joined your household list':'Household list ready');render();
  }catch(e){console.error(e);err.textContent='Something went wrong: '+(e.message||e)}finally{go.disabled=false;go.textContent='Continue'}
 };
 setTimeout(()=>c1.focus(),100);
}

/* ---------- boot ---------- */
async function start(){
 if(sync)sync.stop();Object.keys(S).forEach(k=>S[k]={});const gen=++G;
 sync=await window.BSync.createSync(room,(c,m)=>{if(gen!==G)return;S[c]=m;if(c==='config'&&m.main&&m.main.retired&&$('#setup').hidden){localStorage.removeItem('bs:room');showSetup('retired')}soon()},setBadge);
 setBadge(sync.status);
 // tidy: forget items bought more than 30 days ago
 const cut=Date.now()-30*864e5;Object.values(S.items).filter(i=>i.status==='bought'&&i.boughtAt<cut).forEach(i=>sync.del('items',i.id));
 if(!stores().some(s=>s.id===filter)&&filter!=='all')filter='all';
 render();
}
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js',{scope:'./'}).catch(()=>{});
if(room)start();else{render();showSetup('first')}
window.BS={S,addItem,parseLine,categorise,render,printList,buildPrintSheet,printGroups,saveCfg};
})();
