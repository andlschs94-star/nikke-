/* NIKKE Gear Manager - direct BlaBlaLink public profile sync */
(function(){
  'use strict';

  var API = 'https://nikke-profile-verify.nikke-profile-verify.workers.dev';
  var overlay = null;
  var targetAccount = '';
  var working = false;

  function text(v){
    return String(v == null ? '' : v);
  }

  function getAccounts(){
    try{
      if(typeof ACCOUNTS !== 'undefined' && Array.isArray(ACCOUNTS)){
        return ACCOUNTS.slice();
      }
    }catch(_){}
    return Array.from(document.querySelectorAll('.account-switch-btn'))
      .map(function(b){ return text(b.textContent).trim(); })
      .filter(Boolean)
      .slice(0,2);
  }

  function validateProfileUrl(value){
    var u;
    try{
      u = new URL(String(value || '').trim());
    }catch(_){
      throw new Error('올바른 BlaBlaLink 프로필 URL을 입력해 주세요.');
    }
    if(
      u.protocol !== 'https:' ||
      u.hostname !== 'www.blablalink.com' ||
      u.pathname !== '/user' ||
      !u.searchParams.get('openid')
    ){
      throw new Error('공개 BlaBlaLink 프로필 URL을 정확하게 입력해 주세요.');
    }
    return u.toString();
  }

  function injectStyle(){
    if(document.getElementById('bl-direct-sync-style')) return;
    var style = document.createElement('style');
    style.id = 'bl-direct-sync-style';
    style.textContent = [
      '.bl-direct-backdrop{position:fixed;inset:0;z-index:100001;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,5,14,.58);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}',
      '.bl-direct-backdrop.open{display:flex}',
      '.bl-direct-modal{width:min(590px,96vw);max-height:92vh;overflow:auto;border:1px solid #c7d9e5;border-radius:16px;background:#f8fcfe;color:#334e60;box-shadow:0 28px 90px rgba(0,0,0,.38)}',
      'html.dark-theme .bl-direct-modal{background:#101827;color:#e7edf9;border-color:#30415e}',
      '.bl-direct-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 16px;border-bottom:1px solid #d4e4ec;background:#edf7fb}',
      'html.dark-theme .bl-direct-head{background:#141f32;border-bottom-color:#293952}',
      '.bl-direct-head h3{margin:0;font-size:16px}',
      '.bl-direct-head small{display:block;margin-top:3px;color:#718797;font-size:10px}',
      'html.dark-theme .bl-direct-head small{color:#8796ad}',
      '.bl-direct-close{width:32px;height:32px;padding:0;border:1px solid #bfd6e2;border-radius:8px;background:#fff;color:#62798a;font-size:21px;line-height:1}',
      'html.dark-theme .bl-direct-close{background:#0d1525;border-color:#33435f;color:#b6c4d9}',
      '.bl-direct-body{padding:16px}',
      '.bl-direct-label{display:block;margin:0 0 6px;font-size:11px;font-weight:900;color:#486577}',
      'html.dark-theme .bl-direct-label{color:#aebbd0}',
      '.bl-direct-input{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid #c1d7e2;border-radius:8px;background:#fff;color:#314a5b;outline:none;font-size:12px}',
      'html.dark-theme .bl-direct-input{border-color:#33445f;background:#0b1323;color:#eaf0fc}',
      '.bl-direct-input:focus{border-color:#73acd0;box-shadow:0 0 0 3px rgba(94,162,202,.12)}',
      '.bl-direct-accounts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}',
      '.bl-direct-account{border:1px solid #bfd5e0;border-radius:9px;background:#fff;color:#61798a;padding:10px 11px;text-align:left;cursor:pointer}',
      'html.dark-theme .bl-direct-account{background:#0c1424;border-color:#2b3a54;color:#aebbd0}',
      '.bl-direct-account.active{border-color:#d79a3c;background:#fff4e4;color:#9a5a12;box-shadow:inset 0 0 0 1px rgba(215,154,60,.18)}',
      'html.dark-theme .bl-direct-account.active{border-color:#d49b42;background:#2c2114;color:#ffd38a}',
      '.bl-direct-account b{display:block;font-size:11px}',
      '.bl-direct-account span{display:block;margin-top:3px;font-size:9px;opacity:.78}',
      '.bl-direct-note{margin-top:12px;padding:10px 11px;border:1px solid #d3e1e8;border-radius:9px;background:#f3f8fb;color:#71828f;font-size:10px;line-height:1.55}',
      'html.dark-theme .bl-direct-note{border-color:#2d3c55;background:#0d1627;color:#93a2b8}',
      '.bl-direct-status{margin-top:10px;min-height:18px;font-size:10px;line-height:1.5}',
      '.bl-direct-status.success{color:#2e8765}',
      '.bl-direct-status.error{color:#bd5e62}',
      '.bl-direct-actions{display:flex;gap:8px;margin-top:14px}',
      '.bl-direct-primary{flex:1;border:1px solid #d88926;border-radius:9px;background:#f39a2f;color:#fff;padding:10px 12px;font-size:11px;font-weight:900;cursor:pointer}',
      '.bl-direct-primary:disabled{opacity:.55;cursor:not-allowed}',
      '.bl-direct-secondary{border:1px solid #bfd5e0;border-radius:9px;background:#fff;color:#61798a;padding:10px 12px;font-size:11px;font-weight:900;cursor:pointer}',
      'html.dark-theme .bl-direct-secondary{background:#0c1424;border-color:#2b3a54;color:#aebbd0}',
      '.bl-direct-profile{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 11px;border:1px solid #cddfe8;border-radius:9px;background:#fff}',
      '.bl-direct-profile[hidden]{display:none!important}',
      '.bl-direct-profile img{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#e8eef3}',
      '.bl-direct-profile-name{font-size:12px;font-weight:900}',
      '.bl-direct-profile-sub{margin-top:3px;font-size:9px;color:#718797}',
      'html.dark-theme .bl-direct-profile{background:#0c1424;border-color:#2b3a54}',
      'html.dark-theme .bl-direct-profile-sub{color:#8d9bb1}'
    ].join('');
    document.head.appendChild(style);
  }

  function accountsLabel(){
    var accounts = getAccounts();
    return [accounts[0] || '계정1', accounts[1] || '계정2'];
  }

  function ensureModal(){
    injectStyle();
    if(overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'bl-direct-backdrop';
    overlay.innerHTML =
      '<div class="bl-direct-modal" role="dialog" aria-modal="true" aria-labelledby="blDirectTitle">' +
        '<div class="bl-direct-head">' +
          '<div><h3 id="blDirectTitle">BlaBlaLink 계정 동기화</h3><small>공개 프로필 URL만 입력하면 장비 현황을 불러옵니다.</small></div>' +
          '<button type="button" class="bl-direct-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="bl-direct-body">' +
          '<label class="bl-direct-label" for="blDirectUrl">공개 BlaBlaLink 프로필 URL</label>' +
          '<input id="blDirectUrl" class="bl-direct-input" type="url" autocomplete="off" placeholder="https://www.blablalink.com/user?openid=...">' +
          '<div class="bl-direct-accounts">' +
            '<button type="button" class="bl-direct-account" data-slot="0"><b id="blDirectA1">계정1</b><span>이 계정에 동기화</span></button>' +
            '<button type="button" class="bl-direct-account" data-slot="1"><b id="blDirectA2">계정2</b><span>이 계정에 동기화</span></button>' +
          '</div>' +
          '<div class="bl-direct-actions">' +
            '<button type="button" class="bl-direct-primary">동기화 시작</button>' +
            '<button type="button" class="bl-direct-secondary">닫기</button>' +
          '</div>' +
          '<div class="bl-direct-status" id="blDirectStatus"></div>' +
          '<div class="bl-direct-note">비밀번호·Cookie·game_token은 이 사이트에 입력하지 않습니다. 사이트의 동기화 서버가 별도 서비스 세션으로 공개 프로필을 조회합니다.</div>' +
          '<div class="bl-direct-profile" id="blDirectProfile" hidden>' +
            '<img id="blDirectAvatar" alt="">' +
            '<div><div class="bl-direct-profile-name" id="blDirectName"></div><div class="bl-direct-profile-sub" id="blDirectSub"></div></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    function close(){
      overlay.classList.remove('open');
    }

    overlay.querySelector('.bl-direct-close').addEventListener('click', close);
    overlay.querySelector('.bl-direct-secondary').addEventListener('click', close);
    overlay.addEventListener('click', function(e){
      if(e.target === overlay) close();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && overlay.classList.contains('open')) close();
    });

    overlay.querySelectorAll('.bl-direct-account').forEach(function(btn){
      btn.addEventListener('click', function(){
        var accounts = getAccounts();
        var idx = Number(btn.getAttribute('data-slot') || 0);
        targetAccount = accounts[idx] || accounts[0] || '계정1';
        overlay.querySelectorAll('.bl-direct-account').forEach(function(x){
          x.classList.remove('active');
        });
        btn.classList.add('active');
      });
    });

    overlay.querySelector('.bl-direct-primary').addEventListener('click', async function(){
      if(working) return;

      var input = overlay.querySelector('#blDirectUrl');
      var status = overlay.querySelector('#blDirectStatus');
      var primary = overlay.querySelector('.bl-direct-primary');
      var card = overlay.querySelector('#blDirectProfile');
      var accounts = getAccounts();

      targetAccount = targetAccount || accounts[0] || '계정1';

      var url;
      try{
        url = validateProfileUrl(input.value.trim());
      }catch(err){
        status.className = 'bl-direct-status error';
        status.textContent = text(err && err.message || err);
        return;
      }

      working = true;
      primary.disabled = true;
      card.hidden = true;
      status.className = 'bl-direct-status';
      status.textContent = '프로필과 NIKKE 장비 정보를 조회하는 중…';

      try{
        var response = await fetch(API + '/sync', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({profile_url:url}),
          cache: 'no-store',
          credentials: 'omit'
        });

        var payload = await response.json().catch(function(){ return {}; });
        if(!response.ok || payload.ok !== true){
          throw new Error(payload.message || 'BlaBlaLink 동기화에 실패했습니다.');
        }

        var apply = window.__NIKKE_GM_APPLY_SYNC__;
        if(typeof apply !== 'function'){
          throw new Error('사이트 동기화 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
        }

        try{
          localStorage.setItem('nikke_bl_profile_url_' + encodeURIComponent(targetAccount), url);
        }catch(_){}

        var profile = payload.profile || {};
        if(profile.username || profile.avatar){
          card.hidden = false;
          var img = overlay.querySelector('#blDirectAvatar');
          if(profile.avatar){
            img.src = profile.avatar;
            img.hidden = false;
          }else{
            img.hidden = true;
            img.removeAttribute('src');
          }
          overlay.querySelector('#blDirectName').textContent = profile.username || '닉네임 없음';
          overlay.querySelector('#blDirectSub').textContent =
            String(payload.character_count || 0) + '명 · 상세 ' + String(payload.detail_count || 0) + '건';
        }

        apply(payload, targetAccount);

        status.className = 'bl-direct-status success';
        status.textContent = '동기화가 완료되었습니다.';
      }catch(err){
        status.className = 'bl-direct-status error';
        status.textContent = text(err && err.message || err || '동기화에 실패했습니다.');
      }finally{
        working = false;
        primary.disabled = false;
      }
    });

    return overlay;
  }

  function refreshLabels(){
    var labels = accountsLabel();
    var a = overlay.querySelector('#blDirectA1');
    var b = overlay.querySelector('#blDirectA2');
    if(a) a.textContent = labels[0];
    if(b) b.textContent = labels[1];

    overlay.querySelectorAll('.bl-direct-account').forEach(function(btn, i){
      btn.classList.toggle('active', labels[i] === targetAccount);
    });
  }

  window.openBlablalinkSyncGuide = function(){
    var modal = ensureModal();
    var accounts = getAccounts();
    if(!targetAccount) targetAccount = accounts[0] || '계정1';
    refreshLabels();

    var savedKey = 'nikke_bl_profile_url_' + encodeURIComponent(targetAccount);
    try{
      var saved = localStorage.getItem(savedKey) || '';
      var input = modal.querySelector('#blDirectUrl');
      if(input && !input.value.trim()) input.value = saved;
    }catch(_){}

    modal.classList.add('open');
    setTimeout(function(){
      var input = modal.querySelector('#blDirectUrl');
      if(input) input.focus();
    },0);
  };

  window.closeBlablalinkSyncGuide = function(){
    if(overlay) overlay.classList.remove('open');
    var old = document.getElementById('blsyncModal');
    if(old) old.hidden = true;
  };
})();