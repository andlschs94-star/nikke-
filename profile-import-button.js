/* NIKKE Gear Manager - BlaBlaLink 공개 프로필 불러오기 */
(function(){
  'use strict';

  const PROFILE_VERIFY_API = 'https://nikke-profile-verify.nikke-profile-verify.workers.dev';

  function text(v){ return String(v == null ? '' : v); }

  async function callProfile(profileUrl){
    let url;
    try{
      url = new URL(profileUrl);
    }catch(e){
      throw new Error('올바른 BlaBlaLink 프로필 URL을 입력해 주세요.');
    }

    if(url.protocol !== 'https:' || url.hostname !== 'www.blablalink.com' || url.pathname !== '/user'){
      throw new Error('공개 BlaBlaLink 프로필 URL만 입력할 수 있습니다.');
    }

    const encoded = url.searchParams.get('openid');
    if(!encoded) throw new Error('프로필 URL에서 openid를 찾지 못했습니다.');

    let b64 = encoded.replace(/-/g,'+').replace(/_/g,'/');
    while(b64.length % 4) b64 += '=';

    let intlOpenId;
    try{
      intlOpenId = atob(b64);
    }catch(e){
      throw new Error('프로필 URL의 openid를 Base64로 해석하지 못했습니다.');
    }

    if(!intlOpenId) throw new Error('openid가 비어 있습니다.');

    let response;
    try{
      response = await fetch(PROFILE_VERIFY_API.replace(/\/$/,'') + '/profile', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          profile_url:profileUrl,
          intl_openid:intlOpenId
        }),
        cache:'no-store',
        credentials:'omit'
      });
    }catch(e){
      throw new Error('프로필 서버에 연결하지 못했습니다.');
    }

    let data={};
    try{
      data=await response.json();
    }catch(e){
      throw new Error('프로필 서버 응답을 읽지 못했습니다.');
    }

    if(!response.ok || data.ok !== true){
      throw new Error(data.message || '프로필 정보를 불러오지 못했습니다.');
    }

    return data.profile || {};
  }

  function init(){
    if(document.getElementById('profileImportBtn')) return true;

    const sync = [...document.querySelectorAll('button,.btn')].find(el =>
      text(el.textContent).replace(/\s/g,'').includes('계정동기화')
    );
    if(!sync) return false;

    const btn=document.createElement('button');
    btn.id='profileImportBtn';
    btn.type='button';
    btn.textContent='프로필 불러오기';
    btn.setAttribute('aria-label','BlaBlaLink 공개 프로필 불러오기');

    const overlay=document.createElement('div');
    overlay.className='profile-verify-overlay';
    overlay.innerHTML=
      '<div class="profile-verify-modal" role="dialog" aria-modal="true">'+
        '<div class="profile-verify-head">'+
          '<div><b>BlaBlaLink 프로필 불러오기</b><small>공개 프로필 정보를 바로 조회합니다.</small></div>'+
          '<button id="pvClose" class="profile-verify-close" type="button" aria-label="닫기">×</button>'+
        '</div>'+
        '<div class="profile-verify-body">'+
          '<label for="pvUrl">공개 프로필 URL</label>'+
          '<div class="profile-verify-url-row">'+
            '<input id="pvUrl" class="profile-verify-input" type="url" autocomplete="off" placeholder="https://www.blablalink.com/user?openid=...">'+
            '<button id="pvLoad" class="profile-verify-btn primary" type="button">불러오기</button>'+
          '</div>'+
          '<div id="pvStatus" class="profile-verify-status">프로필 URL을 입력해 주세요.</div>'+
          '<div id="pvCard" class="profile-verify-card" hidden>'+
            '<div class="profile-verify-profile">'+
              '<img id="pvAvatar" class="profile-verify-avatar" alt="">'+
              '<div class="profile-verify-profile-meta">'+
                '<div id="pvName" class="profile-verify-nickname"></div>'+
                '<div id="pvRemark" class="profile-verify-remark"></div>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>';

    document.body.appendChild(overlay);
    sync.parentNode.insertBefore(btn,sync);

    const status=(m,t)=>{
      const el=document.getElementById('pvStatus');
      el.textContent=m;
      el.className='profile-verify-status'+(t?' '+t:'');
    };

    const showProfile=p=>{
      document.getElementById('pvCard').hidden=false;
      document.getElementById('pvName').textContent=text(p.username)||'닉네임 없음';
      document.getElementById('pvRemark').textContent='현재 상태메시지: '+(text(p.remark)||'(비어 있음)');
      const img=document.getElementById('pvAvatar');
      if(p.avatar){
        img.src=p.avatar;
        img.hidden=false;
      }else{
        img.hidden=true;
        img.removeAttribute('src');
      }
    };

    document.getElementById('pvLoad').onclick=async()=>{
      const input=document.getElementById('pvUrl');
      const load=document.getElementById('pvLoad');
      try{
        load.disabled=true;
        load.textContent='불러오는 중...';
        document.getElementById('pvCard').hidden=true;
        const p=await callProfile(input.value.trim());
        showProfile(p);
        status('프로필 정보를 불러왔습니다.','success');
      }catch(e){
        document.getElementById('pvCard').hidden=true;
        status(text(e.message)||'프로필 정보를 불러오지 못했습니다.','error');
      }finally{
        load.disabled=false;
        load.textContent='불러오기';
      }
    };

    document.getElementById('pvClose').onclick=()=>overlay.classList.remove('open');
    overlay.addEventListener('click',e=>{if(e.target===overlay) overlay.classList.remove('open');});
    document.addEventListener('keydown',e=>{if(e.key==='Escape') overlay.classList.remove('open');});
    btn.onclick=()=>{
      overlay.classList.add('open');
      setTimeout(()=>document.getElementById('pvUrl').focus(),0);
    };

    return true;
  }

  function start(){
    if(init()) return;
    const observer=new MutationObserver(()=>{
      if(init()) observer.disconnect();
    });
    observer.observe(document.documentElement,{subtree:true,childList:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();