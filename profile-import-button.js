/* NIKKE Gear Manager - direct BlaBlaLink public profile sync */
(function(){
  'use strict';

  const API='https://nikke-profile-verify.nikke-profile-verify.workers.dev';

  const esc=(v)=>String(v==null?'':v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const text=(v)=>String(v==null?'':v);

  function injectStyle(){
    if(document.getElementById('bl-direct-sync-style')) return;
    const s=document.createElement('style');
    s.id='bl-direct-sync-style';
    s.textContent=`
      .bl-direct-backdrop{position:fixed;inset:0;z-index:100001;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,5,14,.58);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
      .bl-direct-backdrop.open{display:flex}
      .bl-direct-modal{width:min(590px,96vw);max-height:92vh;overflow:auto;border:1px solid #c7d9e5;border-radius:16px;background:#f8fcfe;color:#334e60;box-shadow:0 28px 90px rgba(0,0,0,.38)}
      html.dark-theme .bl-direct-modal{background:#101827;color:#e7edf9;border-color:#30415e}
      .bl-direct-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid #d4e4ec;background:#edf7fb}
      html.dark-theme .bl-direct-head{background:#141f32;border-bottom-color:#293952}
      .bl-direct-head h3{margin:0;font-size:16px}
      .bl-direct-head small{display:block;margin-top:3px;color:#718797;font-size:10px}
      html.dark-theme .bl-direct-head small{color:#8796ad}
      .bl-direct-close{width:32px;height:32px;padding:0;border:1px solid #bfd6e2;border-radius:8px;background:#fff;color:#62798a;font-size:21px;line-height:1}
      html.dark-theme .bl-direct-close{background:#0d1525;border-color:#33435f;color:#b6c4d9}
      .bl-direct-body{padding:16px}
      .bl-direct-label{display:block;margin:0 0 6px;font-size:11px;font-weight:900;color:#486577}
      html.dark-theme .bl-direct-label{color:#aebbd0}
      .bl-direct-input{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid #c1d7e2;border-radius:8px;background:#fff;color:#314a5b;outline:none;font-size:12px}
      html.dark-theme .bl-direct-input{border-color:#33445f;background:#0b1323;color:#eaf0fc}
      .bl-direct-input:focus{border-color:#73acd0;box-shadow:0 0 0 3px rgba(94,162,202,.12)}
      .bl-direct-accounts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
      .bl-direct-account{border:1px solid #bfd5e0;border-radius:9px;background:#fff;color:#61798a;padding:10px 11px;text-align:left;cursor:pointer}
      html.dark-theme .bl-direct-account{background:#0c1424;border-color:#2b3a54;color:#aebbd0}
      .bl-direct-account.active{border-color:#d79a3c;background:#fff4e4;color:#9a5a12;box-shadow:inset 0 0 0 1px rgba(215,154,60,.18)}
      html.dark-theme .bl-direct-account.active{border-color:#d49b42;background:#2c2114;color:#ffd38a}
      .bl-direct-account b{display:block;font-size:11px}.bl-direct-account span{display:block;margin-top:3px;font-size:9px;opacity:.78}
      .bl-direct-note{margin-top:12px;padding:10px 11px;border:1px solid #d3e1e8;border-radius:9px;background:#f3f8fb;color:#71828f;font-size:10px;line-height:1.55}
      html.dark-theme .bl-direct-note{border-color:#2d3c55;background:#0d1627;color:#93a2b8}
      .bl-direct-status{margin-top:10px;min-height:18px;font-size:10px;line-height:1.5}
      .bl-direct-status.success{color:#2e8765}.bl-direct-status.error{color:#bd5e62}
      .bl-direct-actions{display:flex;gap:8px;margin-top:14px}.bl-direct-primary{flex:1;border:1px solid #d88926;border-radius:9px;background:#f39a2f;color:#fff;padding:10px 12px;font-size:11px;font-weight:900;cursor:pointer}.bl-direct-primary:disabled{opacity:.55;cursor:not-allowed}.bl-direct-secondary{border:1px solid #bfd5e0;border-radius:9px;background:#fff;color:#61798a;padding:10px 12px;font-size:11px;font-weight:900;cursor:pointer}html.dark-theme .bl-direct-secondary{background:#0c1424;border-color:#2b3a54;color:#aebbd0}
      .bl-direct-profile{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 11px;border:1px solid #cddfe8;border-radius:9px;background:#fff}.bl-direct-profile[hidden]{display:none!important}.bl-direct-profile img{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#e8eef3}.bl-direct-profile-name{font-size:12px;font-weight:900}.bl-direct-profile-sub{margin-top:3px;font-size:9px;color:#718797}html.dark-theme .bl-direct-profile{background:#0c1424;border-color:#2b3a54}html.dark-theme .bl-direct-profile-sub{color:#8d9bb1}
    `;
    document.head.appendChild(s);
  }

  let overlay=null;
  let targetAccount='';
  let working=false;

  function ensureModal(){
    injectStyle();
    if(overlay) return overlay;
    overlay=document.createElement('div');
    overlay.className='bl-direct-backdrop';
    overlay.innerHTML=`
      <div class="bl-direct-modal" role="dialog" aria-modal="true" aria-labelledby="blDirectTitle">
        <div class="bl-direct-head">
          <div><h3 id="blDirectTitle">BlaBlaLink 계정 동기화</h3><small>공개 프로필 URL만 입력하면 장비 현황을 불러옵니다.</small></div>
          <button type="button" class="bl-direct-close" aria-label="닫기">×</button>
        </div>
        <div class="bl-direct-body">
          <label class="bl-direct-label" for="blDirectUrl">공개 BlaBlaLink 프로필 URL</label>
          <input id="blDirectUrl" class="bl-direct-input" type="url" autocomplete="off" placeholder="https://www.blablalink.com/user?openid=...">
          <div class="bl-direct-accounts">
            <button type="button" class="bl-direct-account" data-slot="0"><b id="blDirectA1">계정1</b><span>이 계정에 동기화</span></button>
            <button type="button" class="bl-direct-account" data-slot="1"><b id="blDirectA2">계정2</b><span>이 계정에 동기화</span></button>
          </div>
          <div class="bl-direct-actions">
            <button type="button" class="bl-direct-primary">동기화 시작</button>
            <button type="button" class="bl-direct-secondary">닫기</button>
          </div>
          <div class="bl-direct-status" id="blDirectStatus"></div>
          <div class="bl-direct-note">비밀번호·Cookie·game_token은 이 사이트에 입력하지 않습니다. 사이트의 동기화 서버가 공개 프로필을 조회하는 데 필요한 별도 세션을 사용합니다.</div>
          <div class="bl-direct-profile" id="blDirectProfile" hidden>
            <img id="blDirectAvatar" alt="">
            <div><div class="bl-direct-profile-name" id="blDirectName"></div><div class="bl-direct-profile-sub" id="blDirectSub"></div></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const close=()=>overlay.classList.remove('open');
    overlay.querySelector('.bl-direct-close').onclick=close;
    overlay.querySelector('.bl-direct-secondary').onclick=close;
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close()});

    overlay.querySelectorAll('.bl-direct-account').forEach(btn=>{
      btn.onclick=()=>{
        const idx=Number(btn.dataset.slot||0);
        const accounts=Array.isArray(window.ACCOUNTS)?window.ACCOUNTS:globalThis.ACCOUNTS||['계정1','계정2'];
        targetAccount=accounts[idx]||accounts[0]||'계정1';
        overlay.querySelectorAll('.bl-direct-account').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
      };
    });

    overlay.querySelector('.bl-direct-primary').onclick=async()=>{
      if(working) return;
      const url=overlay.querySelector('#blDirectUrl').value.trim();
      const accounts=Array.isArray(window.ACCOUNTS)?window.ACCOUNTS:globalThis.ACCOUNTS||['계정1','계정2'];
      targetAccount=targetAccount||accounts[0]||'계정1';
      const status=overlay.querySelector('#blDirectStatus');
      const primary=overlay.querySelector('.bl-direct-primary');
      const card=overlay.querySelector('#blDirectProfile');

      if(!/^https:\/\/www\\.blablalink\\.com\/user\?[^#]*openid=/.test(url)){
        status.className='bl-direct-status error';
        status.textContent='공개 BlaBlaLink 프로필 URL을 정확하게 입력해 주세요.';
        return;
      }

      working=true;
      primary.disabled=true;
      card.hidden=true;
      status.className='bl-direct-status';
      status.textContent='프로필과 NIKKE 장비 정보를 조회하는 중…';

      try{
        const res=await fetch(API+'/sync',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({profile_url:url}),
          cache:'no-store',
          credentials:'omit'
        });
        const payload=await res.json().catch(()=>({}));
        if(!res.ok || payload.ok!==true){
          throw new Error(payload.message||'BlaBlaLink 동기화에 실패했습니다.');
        }

        const apply=window.__NIKKE_GM_APPLY_SYNC__;
        if(typeof apply!=='function') throw new Error('사이트 동기화 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');

        apply(payload,targetAccount);

        const profile=payload.profile||{};
        if(profile.username||profile.avatar){
          card.hidden=false;
          const img=overlay.querySelector('#blDirectAvatar');
          if(profile.avatar){img.src=profile.avatar;img.hidden=false}else{img.hidden=true}
          overlay.querySelector('#blDirectName').textContent=profile.username||'닉네임 없음';
          overlay.querySelector('#blDirectSub').textContent=(payload.character_count||0)+'명 · 상세 '+(payload.detail_count||0)+'건';
        }

        status.className='bl-direct-status success';
        status.textContent='동기화가 완료되었습니다. '+(payload.character_count||0)+'명의 공개 로스터를 확인했습니다.';
      }catch(err){
        status.className='bl-direct-status error';
        status.textContent=text(err&&err.message||err||'동기화에 실패했습니다.');
      }finally{
        working=false;
        primary.disabled=false;
      }
    });

    return overlay;
  }

  function refreshLabels(){
    const accounts=Array.isArray(window.ACCOUNTS)?window.ACCOUNTS:globalThis.ACCOUNTS||['계정1','계정2'];
    const a=overlay.querySelector('#blDirectA1'),b=overlay.querySelector('#blDirectA2');
    if(a)a.textContent=accounts[0]||'계정1';
    if(b)b.textContent=accounts[1]||'계정2';
    const buttons=overlay.querySelectorAll('.bl-direct-account');
    buttons.forEach((btn,i)=>btn.classList.toggle('active',(accounts[i]||'')===targetAccount));
  }

  window.openBlablalinkSyncGuide=function(){
    const m=ensureModal();
    refreshLabels();
    const accounts=Array.isArray(window.ACCOUNTS)?window.ACCOUNTS:globalThis.ACCOUNTS||['계정1','계정2'];
    if(!targetAccount) targetAccount=accounts[0]||'계정1';
    refreshLabels();
    m.classList.add('open');
    setTimeout(()=>m.querySelector('#blDirectUrl')?.focus(),0);
  };

  window.closeBlablalinkSyncGuide=function(){
    if(overlay) overlay.classList.remove('open');
    const old=document.getElementById('blsyncModal');
    if(old) old.hidden=true;
  };
})();