(function(){
  'use strict';

  const WORKER_BASE='https://nikke-profile-verify.nikke-profile-verify.workers.dev';
  const STYLE_ID='bl-character-icon-test-style';
  let iconByName=new Map();
  let iconLoadStarted=false;

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=[
      '.bl-character-icon-test-wrap{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;min-width:0!important}',
      '.bl-character-icon-test-wrap img{display:block!important;width:28px!important;height:28px!important;flex:0 0 28px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid rgba(128,153,176,.45)!important;background:#e8eef3!important;box-shadow:0 1px 3px rgba(0,0,0,.12)!important}',
      '.bl-character-icon-test-wrap .bl-character-icon-test-label{min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      'html.dark-theme .bl-character-icon-test-wrap img{border-color:rgba(148,169,199,.45)!important;background:#162033!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function getPayload(){
    return window.__NIKKE_GM_LAST_SYNC_PAYLOAD__ || null;
  }

  async function loadIcons(){
    if(iconLoadStarted) return;
    iconLoadStarted=true;
    try{
      const res=await fetch(WORKER_BASE+'/character-icons',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'omit',
        body:'{}'
      });
      const data=await res.json();
      if(!res.ok || !data?.ok || !data?.icons) throw new Error(data?.message||'캐릭터 이미지 목록 조회 실패');

      iconByName=new Map(
        Object.entries(data.icons)
          .map(([name,url])=>[String(name).trim(),(String(url||'').trim().startsWith('/')?WORKER_BASE+String(url||'').trim():String(url||'').trim())])
          .filter(([name,url])=>name&&url)
      );

      apply();
    }catch(err){
      console.warn('[NIKKE test] 캐릭터 이미지 목록 조회 실패',err);

      const payload=getPayload();
      if(payload?.updates?.length){
        const fallback=new Map();
        payload.updates.forEach(u=>{
          const name=String(u?.name||'').trim();
          const url=String(u?.icon_url||'').trim();
          if(name&&url) fallback.set(name,url);
        });
        if(fallback.size) iconByName=fallback;
        apply();
      }
    }
  }

  function getName(btn){
    if(btn.dataset.blIconName) return btn.dataset.blIconName;
    const label=btn.querySelector('.bl-character-icon-test-label');
    if(label) return String(label.textContent||'').trim();
    return String(btn.textContent||'').trim();
  }

  function applyToButton(btn){
    const name=getName(btn);
    if(!name) return;

    const url=iconByName.get(name);
    if(!url) return;

    const parent=btn.closest('.name-cell-inner') || btn.parentElement || btn;

    let wrap=parent.querySelector(':scope > .bl-character-icon-test-wrap');
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

      // 기존 버튼은 이름만 표시하는 역할로 남겨두고,
      // 부모가 name-cell-inner이면 부모 안에 별도 표시 영역을 만듭니다.
      if(parent!==btn && parent.classList.contains('name-cell-inner')){
        btn.style.display='none';
        parent.prepend(wrap);
      }else{
        btn.textContent='';
        btn.appendChild(wrap);
      }
    }

    const img=wrap.querySelector('img');
    const label=wrap.querySelector('.bl-character-icon-test-label');
    if(img){
      img.alt=name;
      if(img.src!==url) img.src=url;
      img.onerror=function(){
        this.style.display='none';
      };
    }
    if(label) label.textContent=name;

    btn.dataset.blIconName=name;
  }

  function apply(){
    if(!iconByName.size) return;
    document.querySelectorAll('#tbody .name-btn').forEach(applyToButton);
  }

  function init(){
    addStyle();
    loadIcons();
    apply();

    const target=document.getElementById('tbody') || document.body;
    new MutationObserver(function(){
      apply();
    }).observe(target,{subtree:true,childList:true});

    setInterval(apply,2000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();