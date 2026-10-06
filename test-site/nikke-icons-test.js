(function(){
  'use strict';

  const STYLE_ID='bl-character-icon-test-style';

  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=[
      '.bl-character-icon-test-name{display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:32px!important}',
      '.bl-character-icon-test-name img{width:30px!important;height:30px!important;flex:0 0 30px!important;border-radius:50%!important;object-fit:cover!important;border:1px solid rgba(128,153,176,.45)!important;background:#e8eef3!important;box-shadow:0 1px 3px rgba(0,0,0,.12)!important}',
      '.bl-character-icon-test-name span{min-width:0!important}',
      'html.dark-theme .bl-character-icon-test-name img{border-color:rgba(148,169,199,.45)!important;background:#162033!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function getPayload(){
    return window.__NIKKE_GM_LAST_SYNC_PAYLOAD__ || null;
  }

  function apply(){
    const payload=getPayload();
    if(!payload || !Array.isArray(payload.updates)) return;
    const byName=new Map();
    payload.updates.forEach(function(u){
      const name=String(u && u.name || '').trim();
      const icon=String(u && u.icon_url || '').trim();
      if(name && icon) byName.set(name,icon);
    });
    if(!byName.size) return;

    document.querySelectorAll('#tbody .name-btn').forEach(function(btn){
      const name=String(btn.textContent || '').trim();
      const url=byName.get(name);
      if(!url) return;

      btn.classList.add('bl-character-icon-test-name');
      let img=btn.querySelector('.bl-character-icon-test-img');
      let span=btn.querySelector('.bl-character-icon-test-label');
      if(!span){
        span=document.createElement('span');
        span.className='bl-character-icon-test-label';
        span.textContent=name;
        btn.textContent='';
        btn.appendChild(img || document.createElement('img'));
        img=btn.querySelector('img');
        btn.appendChild(span);
      }
      img.className='bl-character-icon-test-img';
      img.alt=name;
      if(img.src!==url) img.src=url;
    });
  }

  function init(){
    addStyle();
    apply();

    const target=document.getElementById('tbody') || document.body;
    new MutationObserver(function(){
      apply();
    }).observe(target,{subtree:true,childList:true});
    
    window.addEventListener('storage',apply);
    setInterval(apply,1200);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();