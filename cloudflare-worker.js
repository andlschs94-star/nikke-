// GitHub Actions deploy test 2026-10-06
const ALLOWED_ORIGIN = 'https://nikkegear885.github.io';
const PROFILE_API = 'https://api.blablalink.com/api/ugc/direct/standalonesite/User/GetUserProfile';
const TOKEN_TTL_SECONDS = 10 * 60;

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
}

function json(data, status=200){
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type':'application/json; charset=UTF-8',
      ...corsHeaders()
    }
  });
}

function b64urlEncode(input){
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for(let i=0;i<bytes.length;i+=0x8000){
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function b64urlDecode(input){
  let value = String(input || '').replace(/-/g,'+').replace(/_/g,'/');
  while(value.length % 4) value += '=';
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeOpenIdFromProfileUrl(profileUrl){
  let url;
  try{
    url = new URL(profileUrl);
  }catch(e){
    throw new Error('올바른 BlaBlaLink 프로필 URL이 아닙니다.');
  }

  if(url.protocol !== 'https:' || url.hostname !== 'www.blablalink.com' || url.pathname !== '/user'){
    throw new Error('공개 BlaBlaLink 프로필 URL만 사용할 수 있습니다.');
  }

  const encoded = url.searchParams.get('openid');
  if(!encoded) throw new Error('프로필 URL에서 openid를 찾지 못했습니다.');

  try{
    const decoded = new TextDecoder().decode(b64urlDecode(encoded));
    if(!decoded) throw new Error();
    return decoded;
  }catch(e){
    throw new Error('프로필 URL의 openid를 Base64로 해석하지 못했습니다.');
  }
}

function makeCommonParams(profileUrl){
  return JSON.stringify({
    game_id:'16',
    area_id:'global',
    source:'pc_web',
    intl_game_id:'29080',
    language:'ko',
    env:'prod',
    data_statistics_scene:'outer',
    data_statistics_page_id:profileUrl,
    data_statistics_client_type:'pc_web',
    data_statistics_lang:'ko'
  });
}

async function getProfile(profileUrl, intlOpenId){
  const expected = decodeOpenIdFromProfileUrl(profileUrl);
  if(expected !== intlOpenId){
    throw new Error('프로필 URL과 intl_openid가 일치하지 않습니다.');
  }

  const upstream = await fetch(PROFILE_API, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Origin':'https://www.blablalink.com',
      'Referer':'https://www.blablalink.com/',
      'x-channel-type':'2',
      'x-common-params':makeCommonParams(profileUrl),
      'x-language':'ko'
    },
    body:JSON.stringify({
      intl_openid:intlOpenId
    })
  });

  let data = {};
  try{
    data = await upstream.json();
  }catch(e){
    throw new Error('BlaBlaLink 프로필 API 응답을 읽지 못했습니다.');
  }

  if(!upstream.ok || Number(data?.code) !== 0){
    throw new Error(data?.msg || 'BlaBlaLink 프로필 조회에 실패했습니다.');
  }

  const info = data?.data?.info;
  if(!info || !info.intl_openid){
    throw new Error('BlaBlaLink 프로필 정보가 응답에 없습니다.');
  }

  return {
    username:String(info.username || ''),
    avatar:String(info.avatar || ''),
    remark:String(info.remark || ''),
    intl_openid:String(info.intl_openid)
  };
}

const NIKKE_CHARACTERS_API = 'https://api.blablalink.com/api/game/proxy/Game/GetUserCharacters';
const NIKKE_DETAILS_API = 'https://api.blablalink.com/api/game/proxy/Game/GetUserCharacterDetails';
const NIKKE_AREAS = Object.freeze([81, 82, 83, 84, 85]);
const NIKKE_DETAIL_BATCH_SIZE = 40;
const BLABLALINK_INVALID_TOKEN_CODE = 300001;
const BL_CHARACTER_ROSTER_URL = 'https://sg-tools-cdn.blablalink.com/yl-57/hd-03/1bf030193826e243c2e195f951a4be00.json';
const BL_RESOURCE_CDN = 'https://sg-tools-cdn.blablalink.com';
const BL_RESOURCE_PRIMES = [224737,1000639,2654435761,2654435769,1000621,4294967291];

function md5Hex(input){
  const s=String(input);
  const encoder=new TextEncoder();
  const bytes=Array.from(encoder.encode(s));
  const originalLength=bytes.length;
  bytes.push(0x80);
  while(bytes.length%64!==56) bytes.push(0);
  const bitLength=originalLength*8;
  for(let i=0;i<4;i++) bytes.push((bitLength>>>((i)*8))&255);
  for(let i=0;i<4;i++) bytes.push((Math.floor(bitLength/0x100000000)>>>((i)*8))&255);
  let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;
  const K=new Array(64);
  for(let i=0;i<64;i++) K[i]=Math.floor(Math.abs(Math.sin(i+1))*4294967296)>>>0;
  const S=[
    7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
    5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
    6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21
  ];
  const rol=(x,n)=>((x<<n)|(x>>>(32-n)))>>>0;
  for(let off=0;off<bytes.length;off+=64){
    const M=new Array(16);
    for(let i=0;i<16;i++){
      const p=off+i*4;
      M[i]=(bytes[p]|(bytes[p+1]<<8)|(bytes[p+2]<<16)|(bytes[p+3]<<24))>>>0;
    }
    let A=a0,B=b0,C=c0,D=d0;
    for(let i=0;i<64;i++){
      let F,g;
      if(i<16){F=(B&C)|((~B)&D);g=i}
      else if(i<32){F=(D&B)|((~D)&C);g=(5*i+1)%16}
      else if(i<48){F=B^C^D;g=(3*i+5)%16}
      else{F=C^(B|(~D));g=(7*i)%16}
      const oldD=D;
      D=C;
      C=B;
      B=(B+rol((A+F+K[i]+M[g])>>>0,S[i]))>>>0;
      A=oldD;
    }
    a0=(a0+A)>>>0;b0=(b0+B)>>>0;c0=(c0+C)>>>0;d0=(d0+D)>>>0;
  }
  const le=x=>[0,8,16,24].map(n=>((x>>>n)&255).toString(16).padStart(2,'0')).join('');
  return le(a0)+le(b0)+le(c0)+le(d0);
}
function blDjb2Hash(text,seed){
  let hash=seed|0;
  const value=String(text);
  for(let i=0;i<value.length;i++) hash=(Math.imul(hash,33)+value.charCodeAt(i))|0;
  return hash;
}
function blResourceUrl(logicalPath){
  const clean=String(logicalPath||'').replace(/^\//,'');
  const parts=clean.split('/').filter(Boolean);
  const buckets=parts.slice(0,-1).map((_,i)=>{
    const prime=BL_RESOURCE_PRIMES[i] ?? 1;
    const raw=((blDjb2Hash(clean,prime)%prime)+prime)%prime;
    const letters=String.fromCharCode(97+(Math.floor(raw/26)%26),97+(raw%26));
    const digits=String(raw%99).padStart(2,'0');
    return letters+'-'+digits;
  });
  const file=parts[parts.length-1];
  const dot=file.lastIndexOf('.');
  const ext=dot>=0?file.slice(dot):'';
  return BL_RESOURCE_CDN+'/'+[...buckets,md5Hex(clean)+ext].join('/');
}
function blCharacterIconUrl(resourceId,skinIndex=0){
  const rid=String(resourceId).padStart(3,'0');
  const skin=String(skinIndex).padStart(2,'0');
  return blResourceUrl('/character/si/si_c'+rid+'_'+skin+'_s.png');
}

// BlablaLink name_code -> NIKKE Gear Manager character name mapping.
const BUILTIN_NAME_CODES=Object.freeze({"1007":"D","1010":"라플라스","1012":"사쿠라","1013":"솔져 E.G.","1014":"솔져 F.A.","1015":"프로덕트 08","1016":"프로덕트 12","1017":"iDoll 플라워","1018":"iDoll 오션","1019":"마나","1020":"자칼","1021":"목단","1022":"바이퍼","1023":"iDoll 썬","1024":"프로덕트 23","1025":"솔져 O.W.","3001":"라피","3002":"네온","3003":"델타","3004":"루마니","3005":"아니스","3006":"미하라","3007":"벨로타","3008":"미카","3009":"N102","3010":"에테르","3011":"네베","3012":"히메노","3013":"람","3014":"미사토","3015":"사쿠라 (SR)","3016":"릴리","3017":"클레어","3018":"쿠루미","3019":"아이기스","5001":"맥스웰","5002":"슈가","5003":"엑시아","5004":"앨리스","5005":"엠마","5006":"유니","5007":"프리바티","5008":"블랑","5009":"누아르","5010":"프림","5011":"리타","5012":"스노우 화이트","5013":"이사벨","5014":"율리아","5015":"시그널","5016":"폴리","5017":"미란다","5018":"브리드","5019":"솔린","5020":"디젤","5021":"센티","5022":"베스티","5023":"은화","5024":"드레이크","5025":"크로우","5026":"메어리","5027":"페퍼","5028":"밀크","5029":"율하","5030":"애드미","5031":"길로틴","5032":"메이든","5033":"루드밀라","5034":"루피","5035":"얀","5036":"도라","5037":"노벨","5038":"에피넬","5039":"폴크방","5040":"라푼젤","5041":"홍련","5042":"하란","5043":"노아","5044":"모더니아","5045":"로산나","5046":"에이드","5048":"마르차나","5049":"루주","5050":"코코아","5051":"소다","5053":"킬로","5054":"비스킷","5055":"길티","5056":"니힐리스타","5059":"신","5061":"도로시","5063":"앵커","5064":"메어리 : 베이 갓데스","5065":"크라운","5066":"헬름","5068":"네로","5069":"라이","5070":"아리아","5071":"네온 : 블루 오션","5074":"노이즈","5075":"볼륨","5077":"아인","5078":"퀀시","5079":"마스트","5081":"토브","5082":"키리","5085":"앤 : 미라클 페어리","5087":"루피 : 윈터 쇼퍼","5088":"츠바이","5089":"마키마","5090":"파워","5092":"레오나","5094":"2B","5095":"A2","5096":"파스칼","5097":"아니스 : 스파클링 서머","5098":"헬름 : 아쿠아마린","5099":"나가","5100":"티아","5101":"레드 후드","5102":"스노우 화이트 : 이노센트 데이즈","5103":"루드밀라 : 윈터 오너","5104":"미카 : 스노우 버디","5105":"홍련 : 흑영","5106":"프리바티 : 언카인드 메이드","5107":"일레그","5108":"렘","5109":"에밀리아","5110":"D : 킬러 와이프","5111":"베이","5112":"트로니","5113":"소다 : 트윙클링 바니","5114":"앨리스 : 원더랜드 바니","5115":"클레이","5116":"로산나 : 시크 오션","5117":"사쿠라 : 블룸 인 서머","5118":"아스카","5119":"레이","5120":"마리","5121":"퀀시 : 이스케이프 퀸","5122":"팬텀","5123":"라푼젤 : 퓨어 그레이스","5124":"신데렐라","5125":"그레이브","5126":"플로라","5127":"메이든 : 아이스 로즈","5128":"길로틴 : 윈터 슬레이어","5129":"라피 : 레드 후드","5130":"마스트 : 로망틱 메이드","5131":"앵커 : 이노센트 메이드","5132":"레이 (가칭)","5133":"아스카 : WILLE","5134":"트리나","5135":"브래디","5136":"크러스트","5137":"리틀 머메이드","5138":"미하라 : 본딩 체인","5139":"모리","5140":"아르카나","5141":"K","5142":"이브","5143":"레이븐","5144":"소라","5145":"도로시 : 세렌디피티","5146":"일레그 : 붐 앤 쇼크","5147":"엠마 : 택티컬 업","5148":"베스티 : 택티컬 업","5149":"은화 : 택티컬 업","5150":"밀크 : 블루밍 바니","5151":"에이드 : 에이전트 바니","5152":"에이다","5153":"질","5154":"델타 : 닌자 시프","5155":"나유타","5156":"리버렐리오","5157":"차임","5158":"솔린 : 프로스트 티켓","5159":"디젤 : 윈터 스위츠","5160":"브리드 : 사일런트 트랙","5161":"스노우 화이트 : 헤비암즈","5162":"레이블","5163":"벨벳","5164":"치사토","5165":"타키나","5166":"E.H.","5167":"아르카나 : 포츈 메이트","5168":"백학","5169":"아니스 : 스타","5170":"네온 : 비전 아이","5171":"아비스타","5172":"민트","5173":"프리카","5174":"아크레인저 블랙","5175":"신데렐라 : 크리스탈 웨이브","5176":"마르차나 : 마린 스터디","5177":"라플라스 : 얼티밋 히어로","5178":"맥스웰 : 오디너리 미케닉","5179":"퀸(마코토)","5180":"유키코","5181":"드레이크 : 그레이트 빌런","5182":"길티 : 마이티 바니","5183":"신 : 스위프트 바니"})


async function getCharacterIconMap(){
  const rosterResponse = await fetch(BL_CHARACTER_ROSTER_URL, {
    headers:{'Accept':'application/json'}
  });
  if(!rosterResponse.ok) throw new Error('BlaBlaLink 캐릭터 리소스 목록을 불러오지 못했습니다.');
  const raw = await rosterResponse.json();
  const rows = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  const byName = {};
  for(const row of rows){
    if(!row || row.name_code==null || row.resource_id==null) continue;
    const name = BUILTIN_NAME_CODES[String(row.name_code)];
    if(!name) continue;
    const resourceId = Number(row.resource_id);
    if(!Number.isFinite(resourceId)) continue;
    byName[name] = '/character-icon?resource_id=' + encodeURIComponent(resourceId) + '&skin=0';
  }
  return byName;
}

const CORPORATIONS = Object.freeze({1:'ELYSION',2:'MISSILIS',3:'TETRA',4:'PILGRIM',5:'ABNORMAL',7:'ABNORMAL'});
const normalizeCorp = (v) => {
  if (v && typeof v === 'object') {
    for (const key of ['corporation_type','corporationType','corporation','manufacturer','company','maker','corp','corporation_id','manufacturer_id','company_id','type','code','id','value','name']) {
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
      const corpKey=/corporation|manufacturer|company|maker|corp|manufacturerid|corporationid|companyid|제조사|기업/.test(k);

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
        if(/corporation|manufacturer|company|maker|corp|제조사|기업/.test(k)){
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

  // API 버전에 따라 corporation/manufacturer 계열 이름이 달라지는 경우를 대비한 추가 직접 필드.
  for(const w of slotWords){
    for(const suffix of ['_corporation','_corporation_id','_manufacturer','_manufacturer_id','_company','_company_id','_corp']){
      const key=w+suffix;
      if(char?.[key]!==undefined){
        const corp=scan(char[key],0,key);
        if(corp) return corp;
      }
    }
  }

  // 전체 응답을 슬롯 문맥까지 포함해 탐색.
  return scan(char,0,'');
}


function getServiceSession(env){
  const gameToken = String(env?.BLABLALINK_GAME_TOKEN || '').trim();
  const gameOpenId = String(env?.BLABLALINK_GAME_OPENID || '').trim();
  const serviceIntlOpenId = String(env?.BLABLALINK_SERVICE_INTL_OPENID || '').trim();

  if(!gameToken || !gameOpenId || !serviceIntlOpenId){
    const missing = [];
    if(!gameToken) missing.push('BLABLALINK_GAME_TOKEN');
    if(!gameOpenId) missing.push('BLABLALINK_GAME_OPENID');
    if(!serviceIntlOpenId) missing.push('BLABLALINK_SERVICE_INTL_OPENID');
    const err = new Error('서비스용 BlaBlaLink Secret이 부족합니다: ' + missing.join(', '));
    err.sync_type = 'service_secret_missing';
    err.status = 503;
    throw err;
  }

  return {gameToken, gameOpenId, serviceIntlOpenId};
}

function makeGameCommonParams(){
  return JSON.stringify({
    game_id:'16',
    area_id:'global',
    source:'pc_web',
    intl_game_id:'29080',
    language:'ko',
    env:'prod',
    data_statistics_scene:'outer',
    data_statistics_page_id:'https://www.blablalink.com/shiftyspad/nikke',
    data_statistics_client_type:'pc_web',
    data_statistics_lang:'ko'
  });
}

function makeGameHeaders(session){
  return {
    'Content-Type':'application/json',
    'Accept':'application/json, text/plain, */*',
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
    'Origin':'https://www.blablalink.com',
    'Referer':'https://www.blablalink.com/',
    'x-channel-type':'2',
    'x-language':'ko',
    'x-common-params':makeGameCommonParams(),
    'Cookie':[
      'game_token=' + session.gameToken,
      'game_openid=' + session.gameOpenId,
      'game_gameid=29080',
      'game_channelid=6'
    ].join('; ')
  };
}

async function callNikkeGameApi(api, body, session){
  let upstream;
  try{
    upstream = await fetch(api, {
      method:'POST',
      headers:makeGameHeaders(session),
      body:JSON.stringify(body),
      redirect:'manual'
    });
  }catch(e){
    const err = new Error('BlaBlaLink NIKKE API에 연결하지 못했습니다.');
    err.sync_type = 'upstream_network_error';
    err.status = 502;
    err.cause_message = String(e?.message || '');
    throw err;
  }

  let data = {};
  try{
    data = await upstream.json();
  }catch(e){
    const err = new Error('BlaBlaLink NIKKE API 응답을 읽지 못했습니다.');
    err.sync_type = 'upstream_invalid_response';
    err.status = 502;
    err.http_status = upstream.status;
    throw err;
  }

  return {
    http_status: upstream.status,
    code: Number(data?.code),
    msg: String(data?.msg || ''),
    data:data?.data || {}
  };
}

function extractIntlOpenId(decodedOpenId){
  const value = String(decodedOpenId || '').trim();
  const m = value.match(/^(\d+)-(\d+)$/);
  if(!m){
    const err = new Error('프로필 URL의 openid 형식을 해석하지 못했습니다.');
    err.sync_type = 'invalid_intl_openid';
    err.status = 400;
    throw err;
  }

  const gameId = m[1];
  const intlOpenId = m[2];

  if(gameId !== '29080'){
    const err = new Error('지원하지 않는 NIKKE 게임 ID입니다.');
    err.sync_type = 'unsupported_game_id';
    err.status = 400;
    throw err;
  }

  return intlOpenId;
}

async function syncPublicNikkeProfile(profileUrl, env){
  const decoded = decodeOpenIdFromProfileUrl(profileUrl);
  const intlOpenId = extractIntlOpenId(decoded);

  // 공개 프로필 자체가 정상인지 먼저 확인합니다.
  const profile = await getProfile(profileUrl, decoded);

  const session = getServiceSession(env);

  const areasChecked = [];
  const candidates = [];

  for(const areaId of NIKKE_AREAS){
    const result = await callNikkeGameApi(
      NIKKE_CHARACTERS_API,
      {
        intl_open_id:intlOpenId,
        nikke_area_id:areaId
      },
      session
    );

    areasChecked.push({
      area_id:areaId,
      http_status:result.http_status,
      code:Number.isFinite(result.code) ? result.code : null,
      msg:result.msg
    });

    if(result.code === BLABLALINK_INVALID_TOKEN_CODE){
      const err = new Error('서비스용 BlaBlaLink 세션이 만료되었거나 유효하지 않습니다.');
      err.sync_type = 'service_session_expired';
      err.status = 503;
      err.area_id = areaId;
      err.areas_checked = areasChecked;
      throw err;
    }

    if(result.code !== 0) continue;

    const characters = Array.isArray(result.data?.characters)
      ? result.data.characters
      : null;

    if(characters === null){
      const err = new Error('GetUserCharacters 응답에 data.characters가 없습니다.');
      err.sync_type = 'characters_shape_error';
      err.status = 502;
      err.area_id = areaId;
      err.areas_checked = areasChecked;
      throw err;
    }

    if(characters.length > 0){
      candidates.push({area_id:areaId,characters});
    }
  }

  if(candidates.length === 0){
    const err = new Error('공개 NIKKE 로스터를 조회할 수 있는 지역을 찾지 못했습니다.');
    err.sync_type = 'no_public_roster';
    err.status = 404;
    err.areas_checked = areasChecked;
    throw err;
  }

  if(candidates.length > 1){
    const err = new Error('여러 NIKKE 지역에서 로스터가 확인되어 임의로 지역을 선택하지 않았습니다.');
    err.sync_type = 'multiple_rosters';
    err.status = 409;
    err.areas_checked = areasChecked;
    err.candidates = candidates.map(item => ({
      area_id:item.area_id,
      character_count:item.characters.length
    }));
    throw err;
  }

  const selected = candidates[0];
  const nameCodes = selected.characters
    .map(item => item?.name_code)
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
    .map(value => Number(value))
    .filter(value => Number.isFinite(value));

  if(nameCodes.length !== selected.characters.length){
    const err = new Error('GetUserCharacters 응답에서 일부 name_code를 찾지 못했습니다.');
    err.sync_type = 'invalid_character_data';
    err.status = 502;
    err.area_id = selected.area_id;
    err.character_count = selected.characters.length;
    err.name_code_count = nameCodes.length;
    throw err;
  }

  let detailCount = 0;
  const updates = [];
  const unresolved = [];
  const seen = new Set();

  for(let i=0;i<nameCodes.length;i+=NIKKE_DETAIL_BATCH_SIZE){
    const batch = nameCodes.slice(i, i + NIKKE_DETAIL_BATCH_SIZE);
    const result = await callNikkeGameApi(
      NIKKE_DETAILS_API,
      {
        intl_open_id:intlOpenId,
        nikke_area_id:selected.area_id,
        name_codes:batch
      },
      session
    );

    if(result.code === BLABLALINK_INVALID_TOKEN_CODE){
      const err = new Error('서비스용 BlaBlaLink 세션이 조회 중 만료되었습니다.');
      err.sync_type = 'service_session_expired';
      err.status = 503;
      err.area_id = selected.area_id;
      throw err;
    }

    if(result.code !== 0){
      const err = new Error(
        result.msg || ('GetUserCharacterDetails 조회 실패 (code ' + result.code + ')')
      );
      err.sync_type = 'details_api_error';
      err.status = 502;
      err.area_id = selected.area_id;
      err.code = Number.isFinite(result.code) ? result.code : null;
      err.batch_start = i;
      err.batch_size = batch.length;
      throw err;
    }

    const details = Array.isArray(result.data?.character_details)
      ? result.data.character_details
      : null;

    if(details === null){
      const err = new Error('GetUserCharacterDetails 응답에 data.character_details가 없습니다.');
      err.sync_type = 'details_shape_error';
      err.status = 502;
      err.area_id = selected.area_id;
      err.batch_start = i;
      throw err;
    }

    detailCount += details.length;

    for(const char of details){
      const code = String(char?.name_code ?? '').trim();
      if(!code || seen.has(code)) continue;
      seen.add(code);

      const name = String(BUILTIN_NAME_CODES[code] || '').trim();
      if(!name){
        unresolved.push({name_code:code});
        continue;
      }

      const parts = {};
      for(const [slot,part] of [['head','머리'],['torso','몸통'],['arm','장갑'],['leg','다리']]){
        const equipTier = char?.[slot+'_equip_tier'] ?? char?.[slot+'_equip_lv_tier'] ?? null;
        const equipLevel = char?.[slot+'_equip_lv'] ?? null;
        parts[part] = {
          corporation_type:getRawCorp(char,slot),
          tier:(equipTier===undefined||equipTier===null||equipTier==='') ? null : Number(equipTier),
          level:(equipLevel===undefined||equipLevel===null||equipLevel==='') ? null : Number(equipLevel)
        };
      }
      updates.push({name,name_code:code,parts});
    }
  }

  // BlaBlaLink 공개 캐릭터 리소스에서 resource_id를 보강합니다.
  // 실패하더라도 기존 동기화 결과는 그대로 반환합니다.
  try{
    const rosterResponse = await fetch(BL_CHARACTER_ROSTER_URL, {
      headers:{'Accept':'application/json'}
    });
    if(rosterResponse.ok){
      const rosterRows = await rosterResponse.json();
      const resourceByCode = new Map(
        (Array.isArray(rosterRows)?rosterRows:[])
          .filter(row=>row && row.name_code!=null && row.resource_id!=null)
          .map(row=>[String(row.name_code),Number(row.resource_id)])
      );
      for(const update of updates){
        const resourceId = resourceByCode.get(String(update.name_code));
        if(Number.isFinite(resourceId)){
          update.resource_id = resourceId;
          update.icon_url = blCharacterIconUrl(resourceId,0);
        }
      }
    }
  }catch(_){}

  return {
    ok:true,
    intl_open_id:intlOpenId,
    area_id:selected.area_id,
    nickname:profile.username || '',
    profile:{
      username:profile.username || '',
      avatar:profile.avatar || '',
      remark:profile.remark || ''
    },
    character_count:selected.characters.length,
    detail_count:detailCount,
    updates,
    unresolved
  };
}

function randomCode(){
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let out = '';
  for(const b of bytes) out += alphabet[b % alphabet.length];
  return 'NIKKE-' + out;
}

async function importKey(secret){
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name:'HMAC',hash:'SHA-256'},
    false,
    ['sign','verify']
  );
}

async function signToken(payload, secret){
  const encoded = b64urlEncode(JSON.stringify(payload));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return encoded + '.' + b64urlEncode(new Uint8Array(sig));
}

async function verifyToken(token, secret){
  const parts = String(token || '').split('.');
  if(parts.length !== 2) throw new Error('인증 토큰 형식이 올바르지 않습니다.');

  const [encoded, sig] = parts;
  const key = await importKey(secret);
  const ok = await crypto.subtle.verify(
    'HMAC',
    key,
    b64urlDecode(sig),
    new TextEncoder().encode(encoded)
  );

  if(!ok) throw new Error('인증 토큰이 유효하지 않습니다.');

  let payload;
  try{
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(encoded)));
  }catch(e){
    throw new Error('인증 토큰을 읽을 수 없습니다.');
  }

  if(!payload?.intl_openid || !payload?.code || !payload?.exp){
    throw new Error('인증 토큰 정보가 부족합니다.');
  }

  if(Math.floor(Date.now()/1000) >= Number(payload.exp)){
    throw new Error('인증코드가 만료되었습니다. 프로필 확인부터 다시 진행해 주세요.');
  }

  return payload;
}

export default {
  async fetch(request, env){
    const origin = request.headers.get('Origin') || '';
    if(origin && origin !== ALLOWED_ORIGIN){
      return json({ok:false,message:'허용되지 않은 요청 출처입니다.'}, 403);
    }

    if(request.method === 'OPTIONS'){
      return new Response(null, {status:204,headers:corsHeaders()});
    }

    const action = new URL(request.url).pathname.replace(/\/+$/,'') || '/';

    // 캐릭터 아이콘은 GET으로 Worker가 BlaBlaLink CDN 이미지를 프록시합니다.
    if(action === '/character-icon'){
      if(request.method !== 'GET'){
        return json({ok:false,message:'GET 요청만 사용할 수 있습니다.'}, 405);
      }
      const url = new URL(request.url);
      const resourceId = Number(url.searchParams.get('resource_id'));
      const skin = Number(url.searchParams.get('skin') || 0);
      if(!Number.isFinite(resourceId) || resourceId < 1 || resourceId > 9999 ||
         !Number.isFinite(skin) || skin < 0 || skin > 99){
        return json({ok:false,message:'캐릭터 이미지 식별자가 올바르지 않습니다.'}, 400);
      }

      try{
        const upstream = await fetch(blCharacterIconUrl(Math.trunc(resourceId),Math.trunc(skin)), {
          headers:{'User-Agent':'Mozilla/5.0','Accept':'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'}
        });
        if(!upstream.ok){
          return new Response('Character image not found', {
            status:upstream.status,
            headers:{...corsHeaders(),'Content-Type':'text/plain; charset=UTF-8'}
          });
        }

        const headers = new Headers(upstream.headers);
        headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        headers.set('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');
        return new Response(upstream.body, {status:upstream.status,headers});
      }catch(e){
        return json({ok:false,message:'캐릭터 이미지를 불러오지 못했습니다.'}, 502);
      }
    }

    if(request.method !== 'POST'){
      return json({ok:false,message:'POST 요청만 사용할 수 있습니다.'}, 405);
    }

    let body;
    try{
      body = await request.json();
    }catch(e){
      return json({ok:false,message:'요청 본문을 읽을 수 없습니다.'}, 400);
    }

    try{

      if(action === '/character-icons'){
        const icons = await getCharacterIconMap();
        return json({
          ok:true,
          icons,
          count:Object.keys(icons).length
        }, 200);
      }

      if(action === '/profile'){
        const profileUrl = String(body?.profile_url || '').trim();
        const intlOpenId = decodeOpenIdFromProfileUrl(profileUrl);

        const profile = await getProfile(profileUrl, intlOpenId);

        return json({
          ok:true,
          profile:{
            ...profile,
            profile_url:profileUrl
          }
        });
      }

      if(action === '/sync'){
        const profileUrl = String(body?.profile_url || '').trim();
        if(!profileUrl){
          return json({
            ok:false,
            sync_type:'missing_profile_url',
            message:'profile_url이 필요합니다.'
          }, 400);
        }

        try{
          const result = await syncPublicNikkeProfile(profileUrl, env);
          return json(result, 200);
        }catch(e){
          const payload = {
            ok:false,
            sync_type:String(e?.sync_type || 'sync_error'),
            message:String(e?.message || '공개 NIKKE 조회 중 오류가 발생했습니다.')
          };

          for(const key of [
            'area_id',
            'code',
            'http_status',
            'character_count',
            'name_code_count',
            'batch_start',
            'batch_size',
            'areas_checked',
            'candidates'
          ]){
            if(e?.[key] !== undefined) payload[key] = e[key];
          }

          return json(payload, Number.isInteger(e?.status) ? e.status : 400);
        }
      }

      if(action === '/verify'){
        if(!env.VERIFY_SECRET){
          throw new Error('소유권 인증 서버의 VERIFY_SECRET이 설정되지 않았습니다.');
        }
        const profileUrl = String(body?.profile_url || '').trim();
        const token = String(body?.token || '').trim();
        const pending = await verifyToken(token, env.VERIFY_SECRET);

        const intlOpenId = decodeOpenIdFromProfileUrl(profileUrl);
        if(intlOpenId !== pending.intl_openid){
          throw new Error('프로필 URL이 인증을 시작한 계정과 다릅니다.');
        }

        const profile = await getProfile(profileUrl, intlOpenId);
        if(profile.remark !== pending.code){
          return json({
            ok:false,
            message:'상태메시지에서 인증코드를 찾지 못했습니다. 코드를 정확히 입력한 뒤 다시 시도해 주세요.',
            profile:{
              ...profile,
              profile_url:profileUrl
            }
          }, 400);
        }

        return json({
          ok:true,
          message:'프로필 소유권 인증이 완료되었습니다.',
          profile:{
            ...profile,
            profile_url:profileUrl
          },
          verified_at:new Date().toISOString()
        });
      }

      return json({ok:false,message:'지원하지 않는 요청입니다.'}, 404);
    }catch(e){
      return json({
        ok:false,
        message:String(e?.message || '프로필 인증 처리 중 오류가 발생했습니다.')
      }, 400);
    }
  }
};