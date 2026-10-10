// ==UserScript==
// @name         NIKKE Gear Manager - BlablaLink 자동 장비 동기화
// @namespace    https://nikkegear885.github.io/nikke-/
// @version      1.0.27
// @updateURL    https://raw.githubusercontent.com/nikkegear885/nikke-/main/blablalink-sync-v1.0.24.user.js
// @downloadURL  https://raw.githubusercontent.com/nikkegear885/nikke-/main/blablalink-sync-v1.0.24.user.js
// @description  로그인된 BlablaLink 세션에서 NIKKE 캐릭터별 기업장비 현황을 NIKKE Gear Manager로 전송하고 프로필 캐릭터 조회를 중계합니다.
// @author       NIKKE Gear Manager
// @match        https://*.blablalink.com/*
// @match        http://*.blablalink.com/*
// @match        https://nikkegear885.github.io/nikke-/*
// @grant        GM_xmlhttpRequest
// @connect      api.blablalink.com
// @run-at       document-start
// @require      https://raw.githubusercontent.com/nikkegear885/nikke-/main/blablalink-sync-v1.0.27.user.js
// @license      MIT
// ==/UserScript==
(function(){
  'use strict';

  const API = 'https://api.blablalink.com/api/game/proxy/Game/GetUserCharacterDetails';
  const AREAS = [81,82,83,84,85];
  const IDS = [
    ...Array.from({length:173},(_,i)=>5001+i),
    ...Array.from({length:18},(_,i)=>3001+i),
    ...Array.from({length:25},(_,i)=>1001+i)
  ];

  function post(body){
    return new Promise((resolve,reject)=>GM_xmlhttpRequest({
      method:'POST', url:API, anonymous:false,
      headers:{'Content-Type':'application/json;charset=UTF-8'},
      data:JSON.stringify(body),
      onload:r=>{try{resolve(JSON.parse(r.responseText||'{}'));}catch(e){reject(e);}},
      onerror:()=>reject(new Error('BlaBlaLink API 연결 실패')),
      ontimeout:()=>reject(new Error('BlaBlaLink API 시간 초과'))
    }));
  }

  async function findArea(id){
    for(const area of AREAS){
      try{
        const j=await post({intl_open_id:id,nikke_area_id:area,name_codes:[5167]});
        if(Number(j?.code)===0) return area;
      }catch(e){}
    }
    return null;
  }

  async function getCharacters(id,area){
    const j=await post({intl_open_id:id,nikke_area_id:area,name_codes:IDS});
    if(Number(j?.code)!==0) throw new Error(j?.message||j?.msg||('API code '+j?.code));
    const d=j?.data||{};
    return {
      raw:d,
      characters:d.character_details||d.characters||d.character_list||d.user_characters||d.nikkes||d.list||[]
    };
  }

  window.addEventListener('NIKKE_GM_PROFILE_IMPORT',async e=>{
    const id=String(e.detail?.intl_open_id||'').trim();
    if(!id) return window.dispatchEvent(new CustomEvent('NIKKE_GM_PROFILE_RESULT',{detail:{ok:false,error:'intl_open_id가 없습니다.'}}));
    try{
      const area=await findArea(id);
      if(!area) throw new Error('대상 계정의 NIKKE 서버를 확인하지 못했습니다.');
      const result=await getCharacters(id,area);
      window.dispatchEvent(new CustomEvent('NIKKE_GM_PROFILE_RESULT',{detail:{ok:true,area,characters:result.characters,raw:result.raw}}));
    }catch(err){
      window.dispatchEvent(new CustomEvent('NIKKE_GM_PROFILE_RESULT',{detail:{ok:false,error:String(err?.message||err)}}));
    }
  });
})();
