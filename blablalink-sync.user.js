// ==UserScript==
// @name         NIKKE Gear Manager - BlablaLink 자동 장비 동기화
// @namespace    https://andlschs94-star.github.io/nikke-/
// @version      1.0.10
// @updateURL    https://raw.githubusercontent.com/andlschs94-star/nikke-/main/blablalink-sync.user.js
// @downloadURL  https://raw.githubusercontent.com/andlschs94-star/nikke-/main/blablalink-sync.user.js
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

  // 현재 NIKKE Gear Manager 캐릭터명과 BlablaLink name_code 매핑 (2026-09-25 기준)
  const BUILTIN_NAME_CODES=Object.freeze({"1007":"D","1010":"라플라스","1012":"사쿠라","1013":"솔져 E.G.","1014":"솔져 F.A.","1015":"프로덕트 08","1016":"프로덕트 12","1017":"iDoll 플라워","1018":"iDoll 오션","1019":"마나","1020":"자칼","1021":"목단","1022":"바이퍼","1023":"iDoll 썬","1024":"프로덕트 23","1025":"솔져 O.W.","3001":"라피","3002":"네온","3003":"델타","3004":"루마니","3005":"아니스","3006":"미하라","3007":"벨로타","3008":"미카","3009":"N102","3010":"에테르","3011":"네베","3012":"히메노","3013":"람","3014":"미사토","3015":"사쿠라 (SR)","3016":"릴리","3017":"클레어","3018":"쿠루미","3019":"아이기스","5001":"맥스웰","5002":"슈가","5003":"엑시아","5004":"앨리스","5005":"엠마","5006":"유니","5007":"프리바티","5008":"블랑","5009":"누아르","5010":"프림","5011":"리타","5012":"스노우 화이트","5013":"이사벨","5014":"율리아","5015":"시그널","5016":"폴리","5017":"미란다","5018":"브리드","5019":"솔린","5020":"디젤","5021":"센티","5022":"베스티","5023":"은화","5024":"드레이크","5025":"크로우","5026":"메어리","5027":"페퍼","5028":"밀크","5029":"율하","5030":"애드미","5031":"길로틴","5032":"메이든","5033":"루드밀라","5034":"루피","5035":"얀","5036":"도라","5037":"노벨","5038":"에피넬","5039":"폴크방","5040":"라푼젤","5041":"홍련","5042":"하란","5043":"노아","5044":"모더니아","5045":"로산나","5046":"에이드","5048":"마르차나","5049":"루주","5050":"코코아","5051":"소다","5053":"킬로","5054":"비스킷","5055":"길티","5056":"니힐리스타","5059":"신","5061":"도로시","5063":"앵커","5064":"메어리 : 베이 갓데스","5065":"크라운","5066":"헬름","5068":"네로","5069":"라이","5070":"아리아","5071":"네온 : 블루 오션","5074":"노이즈","5075":"볼륨","5077":"아인","5078":"퀀시","5079":"마스트","5081":"토브","5082":"키리","5085":"앤 : 미라클 페어리","5087":"루피 : 윈터 쇼퍼","5088":"츠바이","5089":"마키마","5090":"파워","5092":"레오나","5094":"2B","5095":"A2","5096":"파스칼","5097":"아니스 : 스파클링 서머","5098":"헬름 : 아쿠아마린","5099":"나가","5100":"티아","5101":"레드 후드","5102":"스노우 화이트 : 이노센트 데이즈","5103":"루드밀라 : 윈터 오너","5104":"미카 : 스노우 버디","5105":"홍련 : 흑영","5106":"프리바티 : 언카인드 메이드","5107":"일레그","5108":"렘","5109":"에밀리아","5110":"D : 킬러 와이프","5111":"베이","5112":"트로니","5113":"소다 : 트윙클링 바니","5114":"앨리스 : 원더랜드 바니","5115":"클레이","5116":"로산나 : 시크 오션","5117":"사쿠라 : 블룸 인 서머","5118":"아스카","5119":"레이","5120":"마리","5121":"퀀시 : 이스케이프 퀸","5122":"팬텀","5123":"라푼젤 : 퓨어 그레이스","5124":"신데렐라","5125":"그레이브","5126":"플로라","5127":"메이든 : 아이스 로즈","5128":"길로틴 : 윈터 슬레이어","5129":"라피 : 레드 후드","5130":"마스트 : 로망틱 메이드","5131":"앵커 : 이노센트 메이드","5132":"레이 (가칭)","5133":"아스카 : WILLE","5134":"트리나","5135":"브래디","5136":"크러스트","5137":"리틀 머메이드","5138":"미하라 : 본딩 체인","5139":"모리","5140":"아르카나","5141":"K","5142":"이브","5143":"레이븐","5144":"소라","5145":"도로시 : 세렌디피티","5146":"일레그 : 붐 앤 쇼크","5147":"엠마 : 택티컬 업","5148":"베스티 : 택티컬 업","5149":"은화 : 택티컬 업","5150":"밀크 : 블루밍 바니","5151":"에이드 : 에이전트 바니","5152":"에이다","5153":"질","5154":"델타 : 닌자 시프","5155":"나유타","5156":"리버렐리오","5157":"차임","5158":"솔린 : 프로스트 티켓","5159":"디젤 : 윈터 스위츠","5160":"브리드 : 사일런트 트랙","5161":"스노우 화이트 : 헤비암즈","5162":"레이블","5163":"벨벳","5164":"치사토","5165":"타키나","5166":"E.H.","5167":"아르카나 : 포츈 메이트","5168":"백학","5169":"아니스 : 스타","5170":"네온 : 비전 아이","5171":"아비스타","5172":"민트","5173":"프리카","5174":"아크레인저 블랙","5175":"신데렐라 : 크리스탈 웨이브","5176":"마르차나 : 마린 스터디","5177":"라플라스 : 얼티밋 히어로","5178":"맥스웰 : 오디너리 미케닉","5179":"퀸(마코토)","5180":"유키코","5181":"드레이크 : 그레이트 빌런","5182":"길티 : 마이티 바니","5183":"신 : 스위프트 바니"});

  const CORPORATIONS = Object.freeze({
    1:'ELYSION', 2:'MISSILIS', 3:'TETRA', 4:'PILGRIM', 5:'ABNORMAL', 7:'ABNORMAL'
  });

  const normalizeCorp = (v) => {
    if (v && typeof v === 'object') {
      for (const key of ['corporation_type','corporationType','type','code','id','value','name']) {
        if (v[key] !== undefined && v[key] !== null && v[key] !== '') {
          const nested = normalizeCorp(v[key]);
          if (nested) return nested;
        }
      }
      return null;
    }
    if (typeof v === 'number' && Number.isFinite(v)) return CORPORATIONS[v] || null;
    const s = String(v ?? '').trim().toUpperCase();
    if (!s || s === '0' || s === 'NONE' || s === 'ALL' || s === 'NULL' || s === 'UNDEFINED') return null;
    if (/^\d+$/.test(s)) return CORPORATIONS[Number(s)] || null;
    const aliases = {
      'ELYSION':'ELYSION','MISSILIS':'MISSILIS','TETRA':'TETRA','PILGRIM':'PILGRIM',
      'ABNORMAL':'ABNORMAL','ABNORM':'ABNORMAL',
      '엘리시온':'ELYSION','미실리스':'MISSILIS','테트라':'TETRA','필그림':'PILGRIM','어브노멀':'ABNORMAL'
    };
    return aliases[s] || null;
  };

  function getRawCorp(char, slot) {
    // BlablaLink 응답은 버전/엔드포인트에 따라 장비 필드명이 달라질 수 있으므로
    // 슬롯명 + 기업/제조사 계열 키를 함께 탐색합니다.
    const aliases = {
      head:['head','helmet','helm','head_equip','head_equipment','equip_head'],
      torso:['torso','body','chest','armor','torso_equip','body_equip','equip_torso','equip_body'],
      arm:['arm','glove','gloves','gauntlet','hand','arm_equip','equip_arm'],
      leg:['leg','legs','shoe','shoes','foot','feet','leg_equip','equip_leg']
    };
    const slotWords = aliases[slot] || [slot];
    const visited = new Set();

    function scan(value, depth=0, keyHint=''){
      if(value==null || depth>7) return null;

      const direct = normalizeCorp(value);
      if(direct) return direct;

      if(typeof value !== 'object') return null;
      if(visited.has(value)) return null;
      visited.add(value);

      for(const [key,v] of Object.entries(value)){
        const k=String(key).toLowerCase().replace(/[^a-z0-9_가-힣]/g,'');
        const slotMatch=slotWords.some(w=>k.includes(String(w).toLowerCase().replace(/[^a-z0-9_]/g,'')));
        const corpKey=/corporation|manufacturer|company|maker|corp|manufacturerid|corporationid|companyid/.test(k);

        // 슬롯과 기업 관련 키가 함께 있는 경우를 최우선으로 봅니다.
        if(slotMatch && corpKey){
          const corp=normalizeCorp(v);
          if(corp) return corp;
          const nested=scan(v,depth+1,k);
          if(nested) return nested;
        }
      }

      // 장비 객체 자체가 슬롯명 아래에 있는 경우.
      for(const [key,v] of Object.entries(value)){
        const k=String(key).toLowerCase();
        const slotMatch=slotWords.some(w=>k.includes(String(w).toLowerCase()));
        if(slotMatch && v && typeof v==='object'){
          const nested=scan(v,depth+1,k);
          if(nested) return nested;
        }
      }

      // 마지막 보조 탐색: 현재 객체가 이미 슬롯 객체로 판단되면 기업 키를 깊게 찾습니다.
      const contextIsSlot=slotWords.some(w=>String(keyHint).toLowerCase().includes(String(w).toLowerCase()));
      if(contextIsSlot){
        for(const [key,v] of Object.entries(value)){
          const k=String(key).toLowerCase();
          if(/corporation|manufacturer|company|maker|corp/.test(k)){
            const corp=normalizeCorp(v);
            if(corp) return corp;
            const nested=scan(v,depth+1,k);
            if(nested) return nested;
          }
        }
      }

      return null;
    }

    // 흔히 사용되는 직접 필드들.
    const directKeys=[];
    for(const w of slotWords){
      directKeys.push(
        w+'_equip_corporation_type', w+'_corporation_type',
        w+'_equip_manufacturer', w+'_manufacturer',
        w+'_equip_company', w+'_company',
        w+'_equip', w+'_equipment'
      );
    }
    for(const key of directKeys){
      if(char?.[key]!==undefined){
        const corp=scan(char[key],0,key);
        if(corp) return corp;
      }
    }

    // 전체 응답을 슬롯 문맥까지 포함해 탐색.
    return scan(char,0,'');
  }

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
      headers:{
        'Content-Type':'application/json;charset=UTF-8',
        'Accept':'application/json',
        'x-channel-type':'2',
        'x-language':'ko',
        'x-common-params':JSON.stringify({
          game_id:'16',
          area_id:'global',
          source:'pc_web',
          intl_game_id:'29080',
          language:'ko',
          env:'prod',
          data_statistics_scene:'outer',
          data_statistics_page_id:location.href,
          data_statistics_client_type:'pc_web',
          data_statistics_lang:'ko'
        })
      },
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
            if (Array.isArray(j?.data?.character_details)) {
              out.push(...j.data.character_details);
              // 실제 BlablaLink 응답 구조 확인을 위해 첫 상세 응답을 콘솔에 남깁니다.
              if (out.length <= 2) console.log('[NIKKE GM] GetUserCharacterDetails sample:', j.data.character_details[0]);
            }
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

      const name = String(BUILTIN_NAME_CODES[code] || state.codeToName.get(code) || '').trim();
      if(!name){
        unresolved.push({name_code:code});
        continue;
      }

      const parts = {};
      for(const [slot, part] of [['head','머리'],['torso','몸통'],['arm','장갑'],['leg','다리']]){
        parts[part] = getRawCorp(char, slot);
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
      // 계정에 있는 전체 캐릭터 중 현재 사이트/내장 매핑으로 이름을 확인할 수 있는 캐릭터만 조회합니다.
      // 새 캐릭터가 아직 사이트에 없더라도 동기화 자체가 "미매칭"으로 끝나지 않게 합니다.
      const codes = chars
        .map(x => x?.name_code)
        .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
        .map(v => String(v))
        .filter((v, i, a) => a.indexOf(v) === i)
        .filter(code => Boolean(BUILTIN_NAME_CODES[code]) || Boolean(state.codeToName.get(code)));
      if(!codes.length) throw new Error('현재 사이트와 매칭되는 보유 캐릭터를 찾지 못했습니다. 동기화 스크립트가 최신 버전인지 확인하세요.');

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
            characterCount:codes.length,
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

  const boot = () => {
    // 관리 사이트 팝업과의 연결은 READY/HELLO 핸드셰이크로 처리합니다.
    if(window.opener && window.opener !== window){
      try{
        window.opener.postMessage({type:'NIKKE_GM_BL_READY'}, TARGET_ORIGIN);
      }catch(_){}
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();