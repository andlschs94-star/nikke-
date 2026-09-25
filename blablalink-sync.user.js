// ==UserScript==
// @name         NIKKE Gear Manager - BlablaLink 자동 장비 동기화
// @namespace    https://andlschs94-star.github.io/nikke-/
// @version      1.0.0
// @description  로그인된 BlablaLink 세션에서 NIKKE 캐릭터별 기업장비 현황을 NIKKE Gear Manager로 전송합니다.
// @author       NIKKE Gear Manager
// @match        https://*.blablalink.com/*
// @match        http://*.blablalink.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==
(function(){
  'use strict';

  const TARGET_ORIGIN = 'https://andlschs94-star.github.io';
  const API = {
    player: 'https://api.blablalink.com/api/ugc/direct/standalonesite/User/GetUserGamePlayerInfo',
    chars: 'https://api.blablalink.com/api/game/proxy/Game/GetUserCharacters',
    details: 'https://api.blablalink.com/api/game/proxy/Game/GetUserCharacterDetails'
  };

  const state = {
    intlOpenId: '',
    areaId: null,
    nickname: '',
    codeToName: new Map(),
    pendingToken: '',
    syncing: false
  };

  const CORPORATIONS = Object.freeze({
    1:'ELYSION', 2:'MISSILIS', 3:'TETRA', 4:'PILGRIM', 7:'ABNORMAL'
  });

  const normalizeCorp = (v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return CORPORATIONS[v] || null;
    const s = String(v ?? '').trim().toUpperCase();
    if (!s) return null;
    if (/^\d+$/.test(s)) return CORPORATIONS[Number(s)] || null;
    const aliases = {
      'ELYSION':'ELYSION','MISSILIS':'MISSILIS','TETRA':'TETRA','PILGRIM':'PILGRIM',
      'ABNORMAL':'ABNORMAL','ABNORM':'ABNORMAL',
      '엘리시온':'ELYSION','미실리스':'MISSILIS','테트라':'TETRA','필그림':'PILGRIM','어브노멀':'ABNORMAL'
    };
    return aliases[s] || null;
  };

  function rememberAccountFromBody(url, body){
    try{
      const u = String(url || '');
      if (!body || typeof body !== 'string') return;
      const j = JSON.parse(body);
      const raw = j.intl_open_id ?? j.intl_openid;
      if (raw != null && String(raw).trim()) {
        state.intlOpenId = String(raw).split('-').slice(-1)[0];
      }
      const area = j.nikke_area_id ?? j.area_id;
      if (area != null && Number.isFinite(Number(area))) state.areaId = Number(area);
    }catch(_){}
  }

  function rememberMasterJson(json){
    if (!Array.isArray(json) || !json.length) return;
    let added = 0;
    for (const item of json){
      if (!item || typeof item !== 'object') continue;
      const name = item?.name_localkey?.name;
      if (typeof name !== 'string' || !name.trim()) continue;
      const code = item.name_code ?? item.nameCode;
      if (code != null && String(code).trim()){
        state.codeToName.set(String(code), name.trim());
        added++;
      }
    }
    if (added) {
      window.__NIKKE_GM_MASTER_SIZE__ = state.codeToName.size;
    }
  }

  const originalFetch = window.fetch;
  window.fetch = async function(...args){
    const url = String(args?.[0] ?? '');
    const opts = args?.[1] || {};
    rememberAccountFromBody(url, opts.body);
    const res = await originalFetch.apply(this, args);
    try{
      if (url.includes('GetUserGamePlayerInfo')){
        const j = await res.clone().json();
        const d = j?.data || {};
        const canonical = d?.info?.intl_openid ?? d?.intl_openid ?? '';
        if (canonical) state.intlOpenId = String(canonical).split('-').slice(-1)[0];
        if (d?.area_id != null) state.areaId = Number(d.area_id);
        state.nickname = String(d?.role_name || d?.nickname || '');
      } else if (url.includes('GetUserProfileBasicInfo')){
        const j = await res.clone().json();
        const b = j?.data?.basic_info || {};
        const canonical = b?.intl_openid ?? b?.intl_open_id ?? '';
        if (canonical) state.intlOpenId = String(canonical).split('-').slice(-1)[0];
        if (b?.area_id != null) state.areaId = Number(b.area_id);
        state.nickname = String(b?.nickname || b?.role_name || state.nickname || '');
      } else if (url.includes('sg-tools-cdn.blablalink.com') && url.endsWith('.json')){
        rememberMasterJson(await res.clone().json());
      }
    }catch(_){}
    return res;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url){
    this.__nikkeGmUrl = String(url || '');
    return originalOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body){
    rememberAccountFromBody(this.__nikkeGmUrl, body);
    this.addEventListener('load', () => {
      try{
        const url = this.__nikkeGmUrl || '';
        const j = JSON.parse(this.responseText);
        if (url.includes('GetUserGamePlayerInfo')){
          const d = j?.data || {};
          const canonical = d?.info?.intl_openid ?? d?.intl_openid ?? '';
          if (canonical) state.intlOpenId = String(canonical).split('-').slice(-1)[0];
          if (d?.area_id != null) state.areaId = Number(d.area_id);
          state.nickname = String(d?.role_name || d?.nickname || state.nickname || '');
        } else if (url.includes('GetUserProfileBasicInfo')){
          const b = j?.data?.basic_info || {};
          const canonical = b?.intl_openid ?? b?.intl_open_id ?? '';
          if (canonical) state.intlOpenId = String(canonical).split('-').slice(-1)[0];
          if (b?.area_id != null) state.areaId = Number(b.area_id);
          state.nickname = String(b?.nickname || b?.role_name || state.nickname || '');
        } else if (url.includes('sg-tools-cdn.blablalink.com') && url.endsWith('.json')){
          rememberMasterJson(j);
        }
      }catch(_){}
    });
    return originalSend.apply(this, arguments);
  };

  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function postJson(url, body){
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json;charset=UTF-8','Accept':'application/json'},
      credentials:'include',
      body:JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }

  async function resolveAccount(){
    // 먼저 공식 로그인 정보 API에서 현재 로그인 계정과 서버를 확인합니다.
    for(let attempt=0; attempt<3; attempt++){
      try{
        const j = await postJson(API.player, {});
        const d = j?.data || {};
        const canonical = d?.info?.intl_openid ?? d?.intl_openid ?? '';
        if (canonical) state.intlOpenId = String(canonical).split('-').slice(-1)[0];
        if (d?.area_id != null) state.areaId = Number(d.area_id);
        state.nickname = String(d?.role_name || d?.nickname || state.nickname || '');
        if (String(j?.code ?? '') === '0' && state.intlOpenId && state.areaId) return true;
      }catch(_){}
      await delay(700 * (attempt + 1));
    }

    // 페이지가 이미 보낸 요청에서 ID가 잡힌 경우 보조 사용.
    if (!state.intlOpenId) {
      try {
        const c = document.cookie.match(/(?:^|;\s*)game_openid=([^;]+)/);
        if (c) state.intlOpenId = decodeURIComponent(c[1]);
      } catch(_){}
    }
    return !!(state.intlOpenId && state.areaId);
  }

  async function fetchCharacters(){
    const j = await postJson(API.chars, {
      intl_open_id: state.intlOpenId,
      nikke_area_id: Number(state.areaId)
    });
    if (String(j?.code ?? '') !== '0') {
      throw new Error(j?.message || j?.msg || '캐릭터 목록 조회 실패');
    }
    return Array.isArray(j?.data?.characters) ? j.data.characters : [];
  }

  async function fetchDetails(codes){
    const clean = Array.from(new Set(codes.map(v => String(v)).filter(Boolean)));
    const chunks = [];
    // API가 한 번에 거부하는 경우를 대비해 40개씩 나눕니다.
    for(let i=0;i<clean.length;i+=40) chunks.push(clean.slice(i,i+40));
    const out = [];
    for(const chunk of chunks){
      let ok = false;
      for(let attempt=0;attempt<2 && !ok;attempt++){
        try{
          const j = await postJson(API.details, {
            intl_open_id: state.intlOpenId,
            nikke_area_id: Number(state.areaId),
            name_codes: chunk
          });
          if (String(j?.code ?? '') === '0'){
            if (Array.isArray(j?.data?.character_details)) out.push(...j.data.character_details);
            ok = true;
          } else if (attempt === 1) {
            throw new Error(j?.message || j?.msg || '장비 상세 조회 실패');
          }
        }catch(e){
          if (attempt === 1) throw e;
          await delay(500);
        }
      }
      await delay(120);
    }
    return out;
  }

  function makeUpdates(details){
    const updates = [];
    const unresolved = [];
    const seen = new Set();

    for(const char of details){
      const code = String(char?.name_code ?? '');
      if(!code || seen.has(code)) continue;
      seen.add(code);

      const name = state.codeToName.get(code) || '';
      if(!name){
        unresolved.push({name_code:code});
        continue;
      }

      const parts = {};
      for(const [slot, part] of [['head','머리'],['torso','몸통'],['arm','장갑'],['leg','다리']]){
        const raw = char?.[slot + '_equip_corporation_type'];
        parts[part] = normalizeCorp(raw);
      }
      updates.push({name, name_code:code, parts});
    }
    return {updates, unresolved};
  }

  function showStatus(text, ok=false){
    let el = document.getElementById('nikke-gm-sync-status');
    if(!el){
      el = document.createElement('div');
      el.id = 'nikke-gm-sync-status';
      el.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;padding:12px 16px;border-radius:10px;background:#111827;color:#fff;font:700 13px/1.45 Arial,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.35);max-width:360px;';
      document.body?.appendChild(el);
    }
    el.textContent = text;
    el.style.background = ok ? '#143b35' : '#172033';
    setTimeout(()=>{ if(el && el.textContent===text) el.remove(); }, 5000);
  }

  async function runSync(token, sourceWindow){
    if(state.syncing) return;
    state.syncing = true;
    try{
      showStatus('NIKKE Gear Manager: 로그인/서버 정보 확인 중…');
      if(!await resolveAccount()){
        throw new Error('BlablaLink 로그인 정보 또는 서버 정보를 확인하지 못했습니다. 로그인 후 다시 시도해 주세요.');
      }

      // 페이지가 로드되며 캐릭터 마스터를 가져오는 시간을 조금 확보합니다.
      await delay(800);

      const chars = await fetchCharacters();
      const codes = chars.map(x => x?.name_code).filter(Boolean);
      if(!codes.length) throw new Error('보유 캐릭터를 찾지 못했습니다.');

      showStatus('NIKKE Gear Manager: 장비 기업 정보를 조회 중… ('+codes.length+'명)');
      const details = await fetchDetails(codes);
      const {updates, unresolved} = makeUpdates(details);

      if(sourceWindow && sourceWindow.postMessage){
        sourceWindow.postMessage({
          type:'NIKKE_GM_BL_SYNC_RESULT',
          token,
          payload:{
            ok:true,
            nickname:state.nickname,
            areaId:state.areaId,
            characterCount:chars.length,
            detailCount:details.length,
            updates,
            unresolved
          }
        }, TARGET_ORIGIN);
      }
      showStatus('동기화 완료: '+updates.length+'명 · 미매칭 '+unresolved.length+'명', true);
    }catch(e){
      const msg = String(e?.message || e || '알 수 없는 오류');
      if(sourceWindow && sourceWindow.postMessage){
        sourceWindow.postMessage({
          type:'NIKKE_GM_BL_SYNC_RESULT',
          token,
          payload:{ok:false,error:msg}
        }, TARGET_ORIGIN);
      }
      showStatus('동기화 실패: '+msg);
    }finally{
      state.syncing = false;
    }
  }

  window.addEventListener('message', e => {
    const d = e?.data;
    if(!d || d.type !== 'NIKKE_GM_BL_HELLO') return;
    if(e.origin !== TARGET_ORIGIN) return;
    state.pendingToken = String(d.token || '');
    if(!state.pendingToken || !e.source) return;
    runSync(state.pendingToken, e.source);
  });

  // 관리 사이트에서 팝업을 열지 않고 BlablaLink를 직접 방문한 경우를 위한 보조 버튼
  function addStandaloneButton(){
    if(document.getElementById('nikke-gm-standalone-sync')) return;
    if(!document.body) return;
    const b=document.createElement('button');
    b.id='nikke-gm-standalone-sync';
    b.textContent='NIKKE 장비 동기화';
    b.title='NIKKE Gear Manager로 기업장비 정보를 전송합니다.';
    b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483647;border:0;border-radius:10px;padding:11px 15px;background:#6c5ce7;color:#fff;font:800 13px Arial,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.35);';
    b.onclick=()=>{
      const w=window.open(TARGET_ORIGIN+'/nikke-/','_blank');
      if(!w){ alert('새 창이 차단되었습니다. 팝업을 허용한 뒤 다시 눌러 주세요.'); return; }
      const token=String(Date.now())+'-'+Math.random().toString(36).slice(2);
      // 새 창이 로드되면 ready 메시지를 보내기 위해 짧게 대기합니다.
      const timer=setInterval(()=>{
        try{ w.postMessage({type:'NIKKE_GM_STANDALONE_READY,token}, TARGET_ORIGIN); }catch(_){}
      },500);
      setTimeout(()=>clearInterval(timer),8000);
    };
    document.body.appendChild(b);
  }

  const boot = () => {
    // 관리 사이트 팝업과의 연결은 READY/HELLO 핸드셰이크로 처리합니다.
    setTimeout(()=>addStandaloneButton(), 1200);
    if(window.opener && window.opener !== window){
      try{
        window.opener.postMessage({type:'NIKKE_GM_BL_READY'}, TARGET_ORIGIN);
      }catch(_){}
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();