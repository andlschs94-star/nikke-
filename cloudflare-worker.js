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

    if(!env.VERIFY_SECRET){
      return json({ok:false,message:'프로필 인증 서버가 아직 설정되지 않았습니다.'}, 500);
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
        const code = randomCode();
        const now = Math.floor(Date.now()/1000);
        const exp = now + TOKEN_TTL_SECONDS;

        const token = await signToken({
          v:1,
          intl_openid:intlOpenId,
          code,
          iat:now,
          exp
        }, env.VERIFY_SECRET);

        return json({
          ok:true,
          profile:{
            ...profile,
            profile_url:profileUrl
          },
          code,
          token,
          expires_at:exp * 1000
        });
      }

      if(action === '/verify'){
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