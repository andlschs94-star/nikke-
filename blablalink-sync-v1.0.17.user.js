// ==UserScript==
// @name         NIKKE Gear Manager - BlablaLink 자동 장비 동기화
// @namespace    https://andlschs94-star.github.io/nikke-/
// @version      1.0.17
// @updateURL    https://raw.githubusercontent.com/andlschs94-star/nikke-/main/blablalink-sync-v1.0.17.user.js
// @downloadURL  https://raw.githubusercontent.com/andlschs94-star/nikke-/main/blablalink-sync-v1.0.17.user.js
// @match        https://*.blablalink.com/*
// @match        http://*.blablalink.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function(){
'use strict';
const ORIGIN='https://andlschs94-star.github.io';
const API={
 player:'https://api.blablalink.com/api/ugc/direct/standalonesite/User/GetUserGamePlayerInfo',
 chars:'https://api.blablalink.com/api/game/proxy/Game/GetUserCharacters',
 details:'https://api.blablalink.com/api/game/proxy/Game/GetUserCharacterDetails'
};
const corp={1:'ELYSION',2:'MISSILIS',3:'TETRA',4:'PILGRIM',5:'ABNORMAL',7:'ABNORMAL'};
let info={openId:'',areaId:null,nickname:''},busy=false;
(function capture(){
 const s=document.createElement('script');
 s.textContent="(()=>{if(window.__NIKKE_GM_CAP)return;window.__NIKKE_GM_CAP=1;const f=window.fetch;window.fetch=async function(...a){try{const u=String(a[0]?.url||a[0]||''),b=a[1]?.body;if(b&&/GetUserGamePlayerInfo|GetUserProfileBasicInfo|GetUserCharacters|GetUserCharacterDetails/.test(u)){const q=JSON.parse(b),id=q.intl_open_id||q.intl_openid,area=q.nikke_area_id||q.area_id;if(id||area)window.postMessage({type:'NIKKE_GM_CAP',id:id?String(id):'',area:area||null},'*')}}catch(e){}return f.apply(this,a)}})();";
 (document.documentElement||document.head||document.body).appendChild(s);s.remove();
})();
window.addEventListener('message',e=>{if(e.data?.type!=='NIKKE_GM_CAP')return;const id=String(e.data.id||'');if(id)info.openId=id.includes('-')?id.split('-').pop():id;if(e.data.area!=null)info.areaId=Number(e.data.area);});

async function post(url,body){
 const r=await fetch(url,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json;charset=UTF-8'},body:JSON.stringify(body)});
 if(!r.ok) throw Error('HTTP '+r.status);
 return r.json();
}
function norm(v){
 if(v&&typeof v==='object'){
  for(const k of ['corporation_type','corporationType','manufacturer','corporation','company','type','code','id','value','name']) if(v[k]!=null){const x=norm(v[k]);if(x)return x;}
  return null;
 }
 if(typeof v==='number') return corp[v]||null;
 const s=String(v??'').trim().toUpperCase();
 if(/^\\d+$/.test(s)) return corp[Number(s)]||null;
 return {ELYSION:'ELYSION',MISSILIS:'MISSILIS',TETRA:'TETRA',PILGRIM:'PILGRIM',ABNORMAL:'ABNORMAL',엘리시온:'ELYSION',미실리스:'MISSILIS',테트라:'TETRA',필그림:'PILGRIM',어브노멀:'ABNORMAL'}[s]||null;
}
function findCorp(o){
 const seen=new Set();
 function scan(v,d=0){
  if(v==null||d>6)return null;
  const n=norm(v);if(n)return n;
  if(typeof v!=='object'||seen.has(v))return null;seen.add(v);
  for(const [k,x] of Object.entries(v)) if(/corporation|manufacturer|company|maker|corp/i.test(k)){const n=norm(x);if(n)return n;}
  for(const x of Object.values(v)){const n=scan(x,d+1);if(n)return n;}
  return null;
 }
 return scan(o);
}
function status(s){
 let e=document.getElementById('nikke-gm-sync-status');
 if(!e){e=document.createElement('div');e.id='nikke-gm-sync-status';e.style='position:fixed;right:18px;bottom:18px;z-index:2147483647;padding:12px 16px;border-radius:10px;background:#172033;color:white;font:700 13px Arial';document.body?.appendChild(e);}
 e.textContent=s;
}
async function sync(token,source){
 if(busy)return;busy=true;
 try{
  status('NIKKE Gear Manager: 계정 정보 확인 중…');
  let d={};
  for(let i=0;i<20&&(!info.openId||!info.areaId);i++){try{const p=await post(API.player,{});d=p?.data||{};const raw=String(d?.info?.intl_openid??d?.intl_openid??'');if(raw)info.openId=raw.split('-').pop();if(d?.area_id!=null)info.areaId=Number(d.area_id);}catch(e){}if(!info.openId||!info.areaId)await new Promise(r=>setTimeout(r,300));}
  const oid=info.openId; const area=info.areaId;
  if(!oid||!area)throw Error('BlablaLink 세션에서 계정 정보를 확인하지 못했습니다. BlablaLink의 게임/캐릭터 페이지를 한 번 연 뒤 다시 동기화해 주세요.');
  const c=await post(API.chars,{intl_open_id:oid,nikke_area_id:area});
  if(String(c?.code??'')!=='0')throw Error(c?.message||c?.msg||'캐릭터 목록 조회 실패');
  const list=Array.isArray(c?.data?.characters)?c.data.characters:[];
  if(!list.length)throw Error('캐릭터 목록이 비어 있습니다.');
  const codes=[...new Set(list.map(x=>String(x?.name_code??'')).filter(Boolean))];
  status('NIKKE Gear Manager: 캐릭터 상세정보 조회 중… '+codes.length+'명');
  const updates=[];
  for(let i=0;i<codes.length;i+=40){
   const j=await post(API.details,{intl_open_id:oid,nikke_area_id:area,name_codes:codes.slice(i,i+40)});
   if(String(j?.code??'')!=='0')throw Error(j?.message||j?.msg||'캐릭터 상세 조회 실패');
   for(const x of (j?.data?.character_details||[])){
    const base=list.find(z=>String(z?.name_code??'')===String(x?.name_code??''));
    const name=String(x?.name||x?.character_name||base?.name||base?.character_name||'').trim();
    if(!name)continue;
    const parts={};
    for(const [slot,label] of [['head','머리'],['torso','몸통'],['arm','장갑'],['leg','다리']]){
     const v=x?.[slot]??x?.[slot+'_equip']??x?.[slot+'_equipment']??x?.[slot+'_equip_data'];
     parts[label]=findCorp(v)||findCorp(x?.[slot+'_equip_corporation_type'])||null;
    }
    updates.push({name,name_code:String(x?.name_code??''),parts});
   }
  }
  source.postMessage({type:'NIKKE_GM_BL_SYNC_RESULT',token,payload:{ok:true,nickname:String(d?.role_name||d?.nickname||''),areaId:area,characterCount:codes.length,detailCount:updates.length,updates,unresolved:[]}},ORIGIN);
  status('동기화 완료: '+updates.length+'명');
 }catch(e){
  source.postMessage({type:'NIKKE_GM_BL_SYNC_RESULT',token,payload:{ok:false,error:String(e?.message||e)}},ORIGIN);
  status('동기화 실패: '+String(e?.message||e));
 }finally{busy=false;}
}
window.addEventListener('message',e=>{
 const d=e?.data;
 if(!d||d.type!=='NIKKE_GM_BL_HELLO'||e.origin!==ORIGIN||!e.source)return;
 sync(String(d.token||''),e.source);
});
function boot(){if(window.opener&&window.opener!==window)try{window.opener.postMessage({type:'NIKKE_GM_BL_READY'},ORIGIN)}catch(_){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();