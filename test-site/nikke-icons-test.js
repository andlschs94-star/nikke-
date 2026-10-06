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
      '#tbody .name-btn.bl-character-icon-test-name{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:36px!important;padding:2px 4px!important}',
      '#tbody .bl-character-icon-test-name img{width:32px!important;height:32px!important;flex:0 0 32px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid rgba(128,153,176,.45)!important;background:#e8eef3!important;box-shadow:0 1px 3px rgba(0,0,0,.12)!important}',
      '#tbody .bl-character-icon-test-name span{min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
      'html.dark-theme #tbody .bl-character-icon-test-name img{border-color:rgba(148,169,199,.45)!important;background:#162033!important}'
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
          .map(([name,url])=>[String(name).trim(),String(url||'').trim()])
          .filter(([name,url])=>name&&url)
      );
      apply();
    }catch(err){
      console.warn('[NIKKE test] 캐릭터 이미지 목록 조회 실패',err);
      // Worker에 아직 /character-icons가 배포되지 않은 경우,
      // 이미 동기화 응답에 들어온 icon_url이 있으면 그것을 우선 사용합니다.
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

  function apply(){
    if(!iconByName.size) return;
    document.querySelectorAll('#tbody .name-btn').forEach(function(btn){
      const name=String(btn.dataset.blIconName || btn.textContent || '').trim();
      if(!name) return;
      const url=iconByName.get(name);
      if(!url) return;

      btn.classList.add('bl-character-icon-test-name');
      btn.dataset.blIconName=name;

      let img=btn.querySelector('.bl-character-icon-test-img');
      let span=btn.querySelector('.bl-character-icon-test-label');

      if(!img){
        img=document.createElement('img');
        img.className='bl-character-icon-test-img';
        img.alt=name;
        btn.prepend(img);
      }
      if(!span){
        span=document.createElement('span');
        span.className='bl-character-icon-test-label';
        span.textContent=name;
        btn.appendChild(span);
      }else{
        span.textContent=name;
      }
      if(img.src!==url) img.src=url;
    });
  }

  function init(){
    addStyle();
    loadIcons();
    apply();

    const target=document.getElementById('tbody') || document.body;
    new MutationObserver(function(){
      apply();
      if(!iconLoadStarted) loadIcons();
    }).observe(target,{subtree:true,childList:true});

    setInterval(apply,1500);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();