(() => {
'use strict';
const SOURCE_URL='https://www.blablalink.com/shiftyspad/nikke-list';
const DATA_URL='assets/nikke-pedia-master.json';
const esc=(v)=>String(v??'').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function injectStyle(){
  if(document.getElementById('nikke-pedia-style')) return;
  const style=document.createElement('style');
  style.id='nikke-pedia-style';
  style.textContent=[
    'body.pedia-view #characterPanel,body.pedia-view #kpis,body.pedia-view #outpostPanel,body.pedia-view #soleScorePanel{display:none!important}',
    'body.pedia-view #pediaPanel{display:block!important}',
    '#pediaPanel{margin:0 28px 24px;background:#f8fcfe;border:1px solid #c9e0ef;border-radius:10px;overflow:hidden;min-height:calc(100vh - 130px)}',
    'html.dark-theme #pediaPanel{background:#101827;border-color:#2d3d58}',
    '.pedia-head{padding:18px 20px;border-bottom:1px solid #d0e2eb;background:#edf7fb}',
    'html.dark-theme .pedia-head{background:#151f31;border-color:#2d3d58}',
    '.pedia-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
    '.pedia-head h3{margin:0;color:#294b5e;font-size:17px;font-weight:900}',
    'html.dark-theme .pedia-head h3{color:#edf3ff}',
    '.pedia-head p{margin:5px 0 0;color:#6b8291;font-size:11px;line-height:1.5}',
    'html.dark-theme .pedia-head p{color:#93a2b9}',
    '.pedia-source-btn{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border:1px solid #8fc3d9;background:#fff;color:#347fa7;border-radius:8px;padding:8px 12px;font-size:11px;font-weight:900}',
    '.pedia-source-btn:hover{background:#eaf6fb}',
    'html.dark-theme .pedia-source-btn{background:#18253a;border-color:#55708f;color:#a9d4ff}',
    '.pedia-toolbar{padding:12px 20px;border-bottom:1px solid #d9e6ed;background:#f8fcfe;display:flex;align-items:center;gap:10px}',
    'html.dark-theme .pedia-toolbar{background:#101827;border-color:#2d3d58}',
    '.pedia-search{flex:1 1 300px;min-width:180px;height:38px;border:1px solid #bfd5df;border-radius:8px;background:#fff;color:#405b6c;padding:0 11px;font-size:12px;outline:none}',
    'html.dark-theme .pedia-search{background:#0b1421;border-color:#354761;color:#edf3ff}',
    '.pedia-count{font-size:11px;color:#6b8291;white-space:nowrap;font-weight:800}',
    'html.dark-theme .pedia-count{color:#93a2b9}',
    '.pedia-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:16px}',
    '.pedia-card{border:1px solid #c9dce6;border-radius:10px;background:#fff;overflow:hidden;box-shadow:0 4px 12px rgba(61,105,130,.07)}',
    'html.dark-theme .pedia-card{background:#151f31;border-color:#354761;box-shadow:0 4px 12px rgba(0,0,0,.18)}',
    '.pedia-image-box{aspect-ratio:3/4;background:#edf4f8;display:flex;align-items:center;justify-content:center;overflow:hidden}',
    'html.dark-theme .pedia-image-box{background:#0c1422}',
    '.pedia-image-box img{width:100%;height:100%;object-fit:cover;display:block}',
    '.pedia-placeholder{padding:12px;text-align:center;color:#7a92a2;font-size:10px;font-weight:800;line-height:1.5}',
    'html.dark-theme .pedia-placeholder{color:#8094aa}',
    '.pedia-name{padding:9px 10px 10px;color:#294b5e;font-size:11px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    'html.dark-theme .pedia-name{color:#edf3ff}',
    '.pedia-empty{grid-column:1/-1;padding:48px 20px;text-align:center;color:#7a92a2;font-size:12px}',
    '@media(max-width:650px){#pediaPanel{margin:0 10px 16px}.pedia-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px;gap:9px}.pedia-toolbar{padding:10px}.pedia-head{padding:14px}.pedia-source-btn{width:100%}}'
  ].join('\n');
  document.head.appendChild(style);
}

function ensureNav(){
  const nav=document.querySelector('.nav');
  if(!nav||nav.querySelector('[data-view="pedia"]'))return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='main-view-nav';
  btn.dataset.view='pedia';
  btn.textContent='도감';
  btn.addEventListener('click',()=>window.switchMainView?.('pedia'));
  // 기존 메뉴(니케 장비 현황 / 전초기지 생산량 / 솔레점수기록) 바로 뒤에 붙입니다.
  nav.appendChild(btn);
}

function ensurePanel(){
  if(document.getElementById('pediaPanel'))return;
  const main=document.querySelector('main.main');if(!main)return;
  const panel=document.createElement('section');
  panel.id='pediaPanel';panel.hidden=true;
  panel.innerHTML='<div class="pedia-head"><div class="pedia-head-row"><div><h3>니케 도감</h3><p>캐릭터 이미지는 실제 원본 파일만 등록합니다. 임의 생성 이미지는 사용하지 않습니다.</p></div><a class="pedia-source-btn" href="'+SOURCE_URL+'" target="_blank" rel="noopener noreferrer">BlablaLink 원본 보기 ↗</a></div></div><div class="pedia-toolbar"><input id="pediaSearch" class="pedia-search" type="search" placeholder="니케 이름 검색…"><span id="pediaCount" class="pedia-count"></span></div><div id="pediaGrid" class="pedia-grid"></div>';
  const first=main.querySelector('#soleScorePanel,#outpostPanel,#characterPanel');
  if(first)main.insertBefore(panel,first);else main.appendChild(panel);
}

let pediaItems=[];
async function loadPediaData(){
  if(pediaItems.length)return pediaItems;
  try{
    const res=await fetch(DATA_URL,{cache:'force-cache'});
    if(!res.ok)throw new Error('http '+res.status);
    const items=await res.json();
    if(!Array.isArray(items))throw new Error('invalid data');
    pediaItems=items.filter(x=>x&&typeof x.name==='string'&&x.name.trim());
  }catch(_){
    const grid=document.getElementById('pediaGrid');
    if(grid)grid.innerHTML='<div class="pedia-empty">도감 데이터를 불러오지 못했습니다.</div>';
    pediaItems=[];
  }
  return pediaItems;
}

function renderPedia(text){
  const grid=document.getElementById('pediaGrid'),count=document.getElementById('pediaCount');
  if(!grid||!count)return;
  const q=String(text??'').trim().toLowerCase();
  const list=pediaItems.filter(x=>!q||x.name.toLowerCase().includes(q));
  count.textContent=list.length+' / '+pediaItems.length+'명';
  if(!list.length){grid.innerHTML='<div class="pedia-empty">검색 결과가 없습니다.</div>';return;}
  grid.innerHTML=list.map(item=>{
    const image=String(item.image||'').trim();
    const media=image?'<img loading="lazy" src="'+esc(image)+'" alt="'+esc(item.name)+'">':'<div class="pedia-placeholder">실제 원본 이미지<br>등록 전</div>';
    return '<article class="pedia-card"><div class="pedia-image-box">'+media+'</div><div class="pedia-name" title="'+esc(item.name)+'">'+esc(item.name)+'</div></article>';
  }).join('');
}

function showPedia(){
  const panel=document.getElementById('pediaPanel');if(!panel)return;
  panel.hidden=false;
  document.body.classList.remove('outpost-view','sole-view','drop-rate-view');document.body.classList.add('pedia-view');
  document.getElementById('kpis')?.setAttribute('hidden','');
  document.getElementById('outpostPanel')?.setAttribute('hidden','');
  document.getElementById('soleScorePanel')?.classList.remove('active');
  document.getElementById('characterPanel')?.setAttribute('hidden','');
  document.querySelectorAll('.main-view-nav').forEach(btn=>btn.classList.toggle('active',btn.dataset.view==='pedia'));
  const title=document.getElementById('pageTitle');if(title)title.textContent='니케 도감';
  try{window.closeSidebar?.()}catch(_){}
  loadPediaData().then(()=>renderPedia(document.getElementById('pediaSearch')?.value||''));
}
function hidePedia(){
  const panel=document.getElementById('pediaPanel');if(panel)panel.hidden=true;
  document.body.classList.remove('pedia-view');
  document.getElementById('characterPanel')?.removeAttribute('hidden');
}
function patchMainViewSwitch(){
  if(typeof window.switchMainView!=='function'||window.switchMainView.__pediaPatched)return;
  const original=window.switchMainView;
  const wrapped=function(view){if(view==='pedia'){showPedia();return;}hidePedia();return original.apply(this,arguments);};
  wrapped.__pediaPatched=true;wrapped.__pediaOriginal=original;window.switchMainView=wrapped;
}
function init(){
  injectStyle();ensureNav();ensurePanel();
  document.getElementById('pediaSearch')?.addEventListener('input',e=>renderPedia(e.target.value));
  patchMainViewSwitch();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
