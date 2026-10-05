/* NIKKE Gear Manager - BlaBlaLink 프로필 소유권 인증 UI */
(function(){
  'use strict';

  /*
   * Cloudflare Worker 배포 후 아래 URL을 실제 Worker 주소로 바꿔 주세요.
   * 예: https://nikke-profile-verify.<사용자계정>.workers.dev
   */
  const PROFILE_VERIFY_API = 'https://YOUR-WORKER-URL.workers.dev';

  const STORAGE_KEY = 'nikke_gm_blablalink_profile_verification';

  const text = v => String(v == null ? '' : v);

  function esc(v){
    return text(v).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  function getStored(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      return null;
    }
  }

  function saveVerified(profile){
    const data = {
      verified: true,
      intl_openid: text(profile?.intl_openid),
      profile_url: text(profile?.profile_url),
      nickname: text(profile?.username),
      avatar: text(profile?.avatar),
      verified_at: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function parseProfileUrl(value){
    const raw = text(value).trim();
    if(!raw) throw new Error('BlaBlaLink 프로필 URL을 입력해 주세요.');

    let url;
    try{
      url = new URL(raw);
    }catch(e){
      throw new Error('올바른 BlaBlaLink 프로필 URL을 입력해 주세요.');
    }

    if(url.protocol !== 'https:' || url.hostname !== 'www.blablalink.com' || url.pathname !== '/user'){
      throw new Error('공개 BlaBlaLink 프로필 URL만 입력할 수 있습니다.');
    }

    const openid = url.searchParams.get('openid');
    if(!openid) throw new Error('프로필 URL에서 openid를 찾지 못했습니다.');

    let b64 = openid.replace(/-/g,'+').replace(/_/g,'/');
    while(b64.length % 4) b64 += '=';

    let intlOpenId = '';
    try{
      intlOpenId = atob(b64);
    }catch(e){
      throw new Error('프로필 URL의 openid를 Base64로 해석하지 못했습니다.');
    }

    if(!intlOpenId) throw new Error('Base64 디코딩 결과가 비어 있습니다.');

    return {
      profileUrl: raw,
      intl_openid: intlOpenId
    };
  }

  async function post(path, payload){
    if(PROFILE_VERIFY_API.includes('YOUR-WORKER-URL')){
      throw new Error('프로필 인증 서버 주소가 아직 설정되지 않았습니다.');
    }

    let response;
    try{
      response = await fetch(PROFILE_VERIFY_API.replace(/\/$/,'') + path, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload),
        credentials: 'omit',
        cache: 'no-store'
      });
    }catch(e){
      throw new Error('프로필 인증 서버에 연결하지 못했습니다.');
    }

    let data = {};
    try{
      data = await response.json();
    }catch(e){
      throw new Error('프로필 인증 서버 응답을 읽지 못했습니다.');
    }

    if(!response.ok || data.ok === false){
      throw new Error(data.message || '프로필 인증 요청이 실패했습니다.');
    }
    return data;
  }

  function init(){
    if(document.getElementById('profileImportBtn')) return;

    const sync = [...document.querySelectorAll('button,.btn')].find(el =>
      text(el.textContent).replace(/\s/g,'').includes('계정동기화')
    );
    if(!sync) return false;

    const btn = document.createElement('button');
    btn.id = 'profileImportBtn';
    btn.type = 'button';
    btn.className = sync.className || 'btn';
    btn.textContent = '프로필 인증';
    btn.setAttribute('aria-label','BlaBlaLink 프로필 소유권 인증');

    const overlay = document.createElement('div');
    overlay.id = 'profileVerifyOverlay';
    overlay.className = 'profile-verify-overlay';
    overlay.innerHTML = [
      '<div class="profile-verify-modal" role="dialog" aria-modal="true" aria-labelledby="profileVerifyTitle">',
        '<div class="profile-verify-head">',
          '<div>',
            '<div id="profileVerifyTitle" class="profile-verify-title">BlaBlaLink 프로필 소유권 인증</div>',
            '<div class="profile-verify-subtitle">공개 프로필의 상태메시지에 인증코드를 입력해 소유권을 확인합니다.</div>',
          '</div>',
          '<button id="profileVerifyClose" class="profile-verify-close" type="button" aria-label="닫기">×</button>',
        '</div>',
        '<div class="profile-verify-body">',
          '<label class="profile-verify-label" for="profileVerifyUrl">공개 프로필 URL</label>',
          '<div class="profile-verify-url-row">',
            '<input id="profileVerifyUrl" class="profile-verify-input" type="url" autocomplete="off" placeholder="https://www.blablalink.com/user?openid=...">',
            '<button id="profileVerifyLoad" class="profile-verify-btn primary" type="button">프로필 확인</button>',
          '</div>',
          '<div id="profileVerifyStatus" class="profile-verify-status">프로필 URL을 입력해 주세요.</div>',
          '<div id="profileVerifyCard" class="profile-verify-card" hidden>',
            '<div class="profile-verify-profile">',
              '<img id="profileVerifyAvatar" class="profile-verify-avatar" alt="">',
              '<div class="profile-verify-profile-meta">',
                '<div id="profileVerifyNickname" class="profile-verify-nickname"></div>',
                '<div id="profileVerifyRemark" class="profile-verify-remark"></div>',
              '</div>',
            '</div>',
            '<div class="profile-verify-code-box">',
              '<div class="profile-verify-code-label">인증코드</div>',
              '<div class="profile-verify-code-row">',
                '<code id="profileVerifyCode" class="profile-verify-code"></code>',
                '<button id="profileVerifyCopy" class="profile-verify-btn" type="button">복사</button>',
              '</div>',
              '<div id="profileVerifyExpiry" class="profile-verify-help">10분 이내에 BlaBlaLink 상태메시지에 입력해 주세요.</div>',
            '</div>',
            '<div class="profile-verify-instruction">',
              '<strong>인증 방법</strong>',
              '<div>1. 위 인증코드를 복사합니다.</div>',
              '<div>2. BlaBlaLink 프로필의 상태메시지(remark)에 코드를 그대로 입력합니다.</div>',
              '<div>3. 아래 인증 확인 버튼을 눌러 다시 조회합니다.</div>',
            '</div>',
            '<div class="profile-verify-actions">',
              '<button id="profileVerifyCheck" class="profile-verify-btn primary" type="button">인증 확인</button>',
            '</div>',
          '</div>',
          '<div id="profileVerifySuccess" class="profile-verify-success" hidden>',
            '<div class="profile-verify-success-title">✓ 프로필 소유권 인증 완료</div>',
            '<div id="profileVerifySuccessText"></div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    sync.parentNode.insertBefore(btn, sync);

    const $ = id => document.getElementById(id);
    let pendingToken = '';
    let pendingProfileUrl = '';
    let pendingExpiresAt = 0;

    const setStatus = (message, type) => {
      const el = $('profileVerifyStatus');
      el.textContent = message;
      el.className = 'profile-verify-status' + (type ? ' ' + type : '');
    };

    const setBusy = (busy, label) => {
      $('profileVerifyLoad').disabled = busy;
      $('profileVerifyCheck').disabled = busy;
      if(label) $('profileVerifyLoad').textContent = label;
    };

    const showProfile = profile => {
      $('profileVerifyCard').hidden = false;
      $('profileVerifyNickname').textContent = text(profile?.username) || '닉네임 없음';
      $('profileVerifyRemark').textContent = '현재 상태메시지: ' + (text(profile?.remark) || '(비어 있음)');

      const avatar = $('profileVerifyAvatar');
      if(profile?.avatar){
        avatar.src = profile.avatar;
        avatar.hidden = false;
      }else{
        avatar.removeAttribute('src');
        avatar.hidden = true;
      }
    };

    const resetModal = () => {
      pendingToken = '';
      pendingProfileUrl = '';
      pendingExpiresAt = 0;
      $('profileVerifyCard').hidden = true;
      $('profileVerifySuccess').hidden = true;
      $('profileVerifyAvatar').hidden = true;
      $('profileVerifyAvatar').removeAttribute('src');
      setStatus('프로필 URL을 입력해 주세요.');
      $('profileVerifyLoad').disabled = false;
      $('profileVerifyLoad').textContent = '프로필 확인';
    };

    $('profileVerifyLoad').addEventListener('click', async () => {
      try{
        const parsed = parseProfileUrl($('profileVerifyUrl').value);
        setBusy(true, '확인 중...');

        const data = await post('/profile', {
          profile_url: parsed.profileUrl,
          intl_openid: parsed.intl_openid
        });

        pendingToken = text(data.token);
        pendingProfileUrl = parsed.profileUrl;
        pendingExpiresAt = Number(data.expires_at || 0);

        $('profileVerifyCode').textContent = text(data.code);
        $('profileVerifyExpiry').textContent = data.expires_at
          ? '인증코드는 10분간 유효합니다.'
          : '인증코드를 상태메시지에 입력한 뒤 인증을 확인해 주세요.';
        showProfile(data.profile);
        $('profileVerifySuccess').hidden = true;
        setStatus('프로필 확인 완료 · 아래 코드를 상태메시지에 입력해 주세요.', 'success');
      }catch(e){
        $('profileVerifyCard').hidden = true;
        setStatus(text(e.message) || '프로필 확인에 실패했습니다.', 'error');
      }finally{
        setBusy(false, '프로필 확인');
        $('profileVerifyCheck').disabled = false;
      }
    });

    $('profileVerifyCheck').addEventListener('click', async () => {
      if(!pendingToken){
        setStatus('먼저 프로필 확인을 진행해 주세요.', 'error');
        return;
      }
      if(pendingExpiresAt && Date.now() > pendingExpiresAt){
        setStatus('인증코드가 만료되었습니다. 프로필 확인부터 다시 진행해 주세요.', 'error');
        return;
      }

      try{
        setBusy(true, '인증 확인 중...');
        const data = await post('/verify', {
          profile_url: pendingProfileUrl,
          token: pendingToken
        });

        const saved = saveVerified(data.profile || {});
        $('profileVerifySuccess').hidden = false;
        $('profileVerifySuccessText').textContent =
          (saved.nickname || '닉네임 없음') + ' · 인증 시각 ' +
          new Date(saved.verified_at).toLocaleString('ko-KR');

        showProfile(data.profile);
        setStatus('인증 성공 · 프로필 소유권이 확인되었습니다.', 'success');
      }catch(e){
        setStatus(text(e.message) || '프로필 인증에 실패했습니다.', 'error');
      }finally{
        setBusy(false, '프로필 확인');
        $('profileVerifyCheck').disabled = false;
      }
    });

    $('profileVerifyCopy').addEventListener('click', async () => {
      const code = text($('profileVerifyCode').textContent);
      if(!code) return;
      try{
        await navigator.clipboard.writeText(code);
        $('profileVerifyCopy').textContent = '복사됨';
        setTimeout(() => { $('profileVerifyCopy').textContent = '복사'; }, 1200);
      }catch(e){
        window.prompt('아래 인증코드를 복사해 주세요.', code);
      }
    });

    $('profileVerifyClose').addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => {
      if(e.target === overlay) overlay.classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') overlay.classList.remove('open');
    });

    btn.addEventListener('click', () => {
      const stored = getStored();
      $('profileVerifyUrl').value = stored?.profile_url || '';
      if(stored?.verified){
        $('profileVerifySuccess').hidden = false;
        $('profileVerifySuccessText').textContent =
          (stored.nickname || '닉네임 없음') + ' · 마지막 인증 ' +
          new Date(stored.verified_at).toLocaleString('ko-KR');
      }else{
        $('profileVerifySuccess').hidden = true;
      }
      overlay.classList.add('open');
      setTimeout(() => $('profileVerifyUrl').focus(), 0);
    });

    const stored = getStored();
    if(stored?.verified){
      btn.classList.add('profile-verified');
      btn.textContent = '프로필 인증 ✓';
    }
    return true;
  }

  function start(){
    if(init()) return;
    const observer=new MutationObserver(()=>{if(init()){observer.disconnect();}});
    observer.observe(document.documentElement,{subtree:true,childList:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();