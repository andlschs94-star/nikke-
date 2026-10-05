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
      'game_channelid=131'
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

  // 기존 공개 프로필 조회 기능을 그대로 사용해 프로필 자체가 정상인지 먼저 확인한다.
  await getProfile(profileUrl, decoded);

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

    if(result.code !== 0){
      continue;
    }

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
      candidates.push({
        area_id:areaId,
        characters
      });
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
  }

  return {
    ok:true,
    intl_open_id:intlOpenId,
    area_id:selected.area_id,
    character_count:selected.characters.length,
    detail_count:detailCount
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

    if(request.method !== 'POST'){
      return json({ok:false,message:'POST 요청만 사용할 수 있습니다.'}, 405);
    }

    let body;
    try{
      body = await request.json();
    }catch(e){
      return json({ok:false,message:'요청 본문을 읽을 수 없습니다.'}, 400);
    }

    const action = new URL(request.url).pathname.replace(/\/+$/,'') || '/';

    try{
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