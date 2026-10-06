(function(){
  'use strict';

  const WORKER_BASE='https://nikke-profile-verify.nikke-profile-verify.workers.dev';
  const STYLE_ID='bl-character-icon-test-style';
  let iconByName=new Map();
  let iconLoadPromise=null;
  let applyQueued=false;

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=[
      '.bl-character-icon-test-wrap{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;min-width:0!important;vertical-align:middle!important}',
      '.bl-character-icon-test-wrap img{display:block!important;width:28px!important;height:28px!important;flex:0 0 28px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid rgba(128,153,176,.45)!important;background:#e8eef3!important;box-shadow:0 1px 3px rgba(0,0,0,.12)!important}',
      '.bl-character-icon-test-wrap .bl-character-icon-test-label{min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      'html.dark-theme .bl-character-icon-test-wrap img{border-color:rgba(148,169,199,.45)!important;background:#162033!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function scheduleApply(){
    if(applyQueued) return;
    applyQueued=true;
    requestAnimationFrame(function(){
      applyQueued=false;
      apply();
    });
  }

  async function loadIcons(){
    if(iconLoadPromise) return iconLoadPromise;

    iconLoadPromise=fetch(WORKER_BASE+'/character-icons',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'omit',
      body:'{}'
    })
    .then(function(res){
      return res.json().then(function(data){
        if(!res.ok || !data?.ok || !data?.icons){
          throw new Error(data?.message||'캐릭터 이미지 목록 조회 실패');
        }
        iconByName=new Map(
          Object.entries(data.icons)
            .map(function(entry){
              const name=String(entry[0]||'').trim();
              const rawUrl=String(entry[1]||'').trim();
              const url=rawUrl.startsWith('/') ? WORKER_BASE+rawUrl : rawUrl;
              return [name,url];
            })
            .filter(function(entry){return entry[0]&&entry[1];})
        );
        scheduleApply();
        return iconByName;
      });
    })
    .catch(function(err){
      console.warn('[NIKKE test] 캐릭터 이미지 목록 조회 실패',err);

      const payload=window.__NIKKE_GM_LAST_SYNC_PAYLOAD__ || null;
      if(payload?.updates?.length){
        const fallback=new Map();
        payload.updates.forEach(function(u){
          const name=String(u?.name||'').trim();
          const url=String(u?.icon_url||'').trim();
          if(name&&url) fallback.set(name,url);
        });
        if(fallback.size){
          iconByName=fallback;
          scheduleApply();
        }
      }
      return iconByName;
    });

    return iconLoadPromise;
  }

  function getName(btn){
    const saved=String(btn.dataset.blIconName||'').trim();
    if(saved) return saved;

    const existingLabel=btn.querySelector('.bl-character-icon-test-label');
    if(existingLabel){
      const text=String(existingLabel.textContent||'').trim();
      if(text) return text;
    }

    // 아이콘이 아직 없는 초기 상태에서만 버튼의 원래 텍스트를 사용합니다.
    return String(btn.textContent||'').trim();
  }

  function applyToButton(btn){
    const name=getName(btn);
    if(!name) return;

    const url=iconByName.get(name);
    if(!url) return;

    // 이름 버튼 내부에 이미 표시 영역이 있으면 절대 다시 만들지 않습니다.
    let wrap=btn.querySelector('.bl-character-icon-test-wrap');
    if(!wrap){
      wrap=document.createElement('span');
      wrap.className='bl-character-icon-test-wrap';

      const img=document.createElement('img');
      img.className='bl-character-icon-test-img';
      img.alt=name;
      img.loading='lazy';
      img.decoding='async';

      const label=document.createElement('span');
      label.className='bl-character-icon-test-label';
      label.textContent=name;

      wrap.appendChild(img);
      wrap.appendChild(label);

      // 기존 이름 버튼의 클릭 기능을 그대로 유지합니다.
      btn.textContent='';
      btn.appendChild(wrap);
    }

    btn.dataset.blIconName=name;

    const img=wrap.querySelector('.bl-character-icon-test-img');
    const label=wrap.querySelector('.bl-character-icon-test-label');

    if(img){
      img.alt=name;
      if(img.dataset.loadedUrl!==url){
        img.dataset.loadedUrl=url;
        img.src=url;
      }
      img.onerror=function(){
        this.style.display='none';
      };
    }
    if(label && label.textContent!==name){
      label.textContent=name;
    }
  }

  function apply(){
    if(!iconByName.size) return;
    document.querySelectorAll('#tbody .name-btn').forEach(applyToButton);
  }

  function init(){
    addStyle();
    loadIcons();
    apply();

    const target=document.getElementById('tbody');
    if(target){
      new MutationObserver(function(){
        scheduleApply();
      }).observe(target,{subtree:true,childList:true});
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();