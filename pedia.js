(() => {
'use strict';
const SOURCE_URL='https://www.blablalink.com/shiftyspad/nikke-list';
const DATA_URL='assets/nikke-pedia-master.json?v=1046';
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
    '.pedia-card{cursor:pointer;transition:.16s ease}',
    '.pedia-card:hover{transform:translateY(-2px);border-color:#8fc3d9;box-shadow:0 8px 20px rgba(61,105,130,.12)}',
    '.pedia-skill-badge{display:inline-flex;margin:0 10px 10px;padding:4px 7px;border:1px solid #bfd5df;border-radius:6px;background:#eef7fb;color:#347fa7;font-size:9px;font-weight:900}',
    'html.dark-theme .pedia-skill-badge{background:#142438;border-color:#344660;color:#a9d4ff}',
    '.pedia-skill-modal{position:fixed;inset:0;z-index:1700;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(38,62,78,.28);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}',
    '.pedia-skill-modal.open{display:flex}',
    '.pedia-skill-dialog{width:min(760px,96vw);max-height:90vh;overflow:auto;background:#f8fcfe;border:1px solid #bfd5df;border-radius:14px;box-shadow:0 24px 70px rgba(38,72,95,.24);color:#294b5e}',
    'html.dark-theme .pedia-skill-dialog{background:#101827;border-color:#344660;color:#edf3ff}',
    '.pedia-skill-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 16px;border-bottom:1px solid #d0e2eb;background:#edf7fb}',
    'html.dark-theme .pedia-skill-head{background:#151f31;border-color:#2d3d58}',
    '.pedia-skill-head h3{margin:0;font-size:16px;font-weight:900}.pedia-skill-meta{margin-top:3px;font-size:9px;color:#718797}.pedia-skill-meta:empty{display:none}html.dark-theme .pedia-skill-meta{color:#93a2b9}',
    '.pedia-skill-close{width:32px;height:32px;border:1px solid #bfd5df;border-radius:8px;background:#fff;color:#60798a;font-size:20px;cursor:pointer}',
    'html.dark-theme .pedia-skill-close{background:#0d1525;border-color:#344660;color:#cbd7e8}',
    '.pedia-skill-body{padding:15px}',
    '.pedia-skill-status{padding:9px 10px;border:1px solid #d2e1e8;border-radius:8px;background:#f3f8fb;color:#6f8290;font-size:10px;line-height:1.5}',
    'html.dark-theme .pedia-skill-status{background:#0d1627;border-color:#2d3d58;color:#9aaac0}',
    '.pedia-skill-status.error{border-color:#edc9c9;background:#fff5f5;color:#bd5e62}',
    '.pedia-skill-card{margin-top:10px;border:1px solid #c9dce6;border-radius:10px;background:#fff;overflow:hidden}',
    'html.dark-theme .pedia-skill-card{background:#151f31;border-color:#354761}',
    '.pedia-skill-card-head{padding:10px 12px;background:#edf7fb;border-bottom:1px solid #d7e5ec;display:flex;align-items:center;justify-content:space-between;gap:8px}',
    'html.dark-theme .pedia-skill-card-head{background:#141f31;border-color:#2d3d58}',
    '.pedia-skill-card-title{font-size:12px;font-weight:900}',
    '.pedia-skill-card-meta{font-size:9px;color:#718797}',
    'html.dark-theme .pedia-skill-card-meta{color:#93a2b9}',
    '.pedia-skill-levels{display:flex;gap:5px;flex-wrap:wrap;padding:9px 12px 0}',
    '.pedia-skill-level-btn{border:1px solid #bfd5df;border-radius:6px;background:#fff;color:#60798a;padding:4px 7px;font-size:9px;font-weight:900;cursor:pointer}',
    '.pedia-skill-level-btn.active{border-color:#72b0cf;background:#e7f5fb;color:#2d6d8e}',
    'html.dark-theme .pedia-skill-level-btn{background:#0d1525;border-color:#344660;color:#aebbd0}',
    'html.dark-theme .pedia-skill-level-btn.active{background:#20334c;border-color:#5b88b0;color:#d6ebff}',
    '.pedia-skill-desc{padding:11px 12px 13px;white-space:pre-line;font-size:11px;line-height:1.6;color:#405b6c}',
    'html.dark-theme .pedia-skill-desc{color:#dce6f3}',
    '.pedia-skill-loading{padding:30px;text-align:center;color:#72879a;font-size:11px}',
    '.pedia-filter-row-v1044{width:100%;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:7px;margin-top:2px}',
    '.pedia-filter-v1044{height:34px;border:1px solid #bfd5df;border-radius:8px;background:#fff;color:#405b6c;padding:0 9px;font-size:11px;font-weight:800;outline:none;min-width:0}',
    'html.dark-theme .pedia-filter-v1044{background:#0b1421;border-color:#354761;color:#edf3ff}',
    '@media(max-width:900px){.pedia-filter-row-v1044{grid-template-columns:repeat(3,minmax(0,1fr))}}',
    '@media(max-width:650px){.pedia-filter-row-v1044{grid-template-columns:repeat(2,minmax(0,1fr))}}',
    '@media(max-width:650px){#pediaPanel{margin:0 10px 16px}.pedia-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:10px;gap:9px}.pedia-toolbar{padding:10px}.pedia-head{padding:14px}.pedia-source-btn{width:100%}.pedia-skill-dialog{max-height:94vh}.pedia-skill-body{padding:10px}}'  ].join('\n');
  document.head.appendChild(style);
  const infoStyle=document.createElement('style');
  infoStyle.textContent='.pedia-skill-info-strip{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px}.pedia-skill-info-item{display:inline-flex;align-items:center;padding:6px 9px;border:1px solid #bfd5df;border-radius:7px;background:#eef7fb;color:#315f78;font-size:10px;font-weight:900}.pedia-skill-info-item b{margin-right:4px;color:#6f8290}html.dark-theme .pedia-skill-info-item{background:#142438;border-color:#344660;color:#d6ebff}html.dark-theme .pedia-skill-info-item b{color:#9aaac0}';
  document.head.appendChild(infoStyle);
}

const PEDIA_SKILL_DATA_URL='assets/nikke-skills.json?v=1046';
let pediaSkillCache=null;

function escText(v){return esc(v);}

function renderSkillTemplate(template, values){
  let text=String(template==null?'':template);
  const vals=Array.isArray(values)?values:[];
  vals.forEach((value,index)=>{text=text.split('{'+index+'}').join(String(value==null?'':value));});
  return text;
}

async function loadPediaSkillData(){
  if(pediaSkillCache)return pediaSkillCache;
  const res=await fetch(PEDIA_SKILL_DATA_URL,{cache:'no-store'});
  if(!res.ok)throw new Error('내부 스킬 데이터 요청 실패: HTTP '+res.status);
  const data=await res.json();
  if(!data||typeof data!=='object')throw new Error('내부 스킬 데이터 형식이 올바르지 않습니다.');
  Object.values(data).forEach(nikke=>{
    if(!nikke||typeof nikke!=='object'||!nikke.k||typeof nikke.k!=='object')return;
    Object.values(nikke.k).forEach(skill=>{
      if(!skill||typeof skill!=='object')return;
      if(skill.template==null&&skill.t!=null)skill.template=skill.t;
      if(skill.values==null&&Array.isArray(skill.v))skill.values=skill.v;
      if(skill.cooltime==null&&skill.c!=null)skill.cooltime=skill.c;
      if(skill.info_description==null)skill.info_description=skill.infoDescription??skill.info_desc??skill.info??'';
      if(skill.icon==null)skill.icon=skill.skill_icon??skill.skillIcon??skill.icon_url??'';
    });
  });
  pediaSkillCache=data;
  return data;
}

function normalizePediaName(v){
  return String(v??'').normalize('NFKC').toLowerCase().replace(/[\s:：·•._'’“”"`\-–—()\[\]{}]/g,'');
}
function findPediaSkillData(all,name,id){
  if(!all||typeof all!=='object')return null;
  if(all[name])return all[name];
  const wantedId=Number(id);
  if(Number.isFinite(wantedId)){
    const byId=Object.values(all).find(x=>x&&Number(x.i)===wantedId);
    if(byId)return byId;
  }
  const wanted=normalizePediaName(name);
  const hit=Object.entries(all).find(([key,value])=>normalizePediaName(key)===wanted || normalizePediaName(value?.name)===wanted);
  return hit?hit[1]:null;
}

function ensureSkillModal(){
  let modal=document.getElementById('pediaSkillModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='pediaSkillModal';modal.className='pedia-skill-modal';
  modal.innerHTML='<div class="pedia-skill-dialog" role="dialog" aria-modal="true"><div class="pedia-skill-head"><div><h3 id="pediaSkillTitle">니케 스킬</h3><div id="pediaSkillMeta" class="pedia-skill-meta"></div></div><button type="button" class="pedia-skill-close" aria-label="닫기">×</button></div><div class="pedia-skill-body" id="pediaSkillBody"><div class="pedia-skill-loading">스킬 데이터를 불러오는 중…</div></div></div>';
  document.body.appendChild(modal);
  modal.querySelector('.pedia-skill-close').addEventListener('click',()=>modal.classList.remove('open'));
  modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('open')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('open')});
  return modal;
}

function cleanSkillTemplate(template){return String(template==null?'':template).replace(/<\/?(?:color|word_group)(?:=[^>]*)?>/gi,'').replace(/\xC2\xA0/g,' ');}
function getSkillLevels(detail){
  if(!detail)return [];
  const values=Array.isArray(detail.values)?detail.values:[];
  return values.slice(0,10).map((valuesAtLevel,lv)=>({level:lv+1,text:renderSkillTemplate(cleanSkillTemplate(detail.template),valuesAtLevel).trim()}));
}
function normalizeSkillEntries(data){
  if(!data||typeof data!=='object')return [];
  if(data.skill1||data.skill2||data.burst)return [['스킬 1',data.skill1],['스킬 2',data.skill2],['버스트',data.burst].filter(([,detail])=>detail)];
  const skills=Object.entries(data.k||{});
  if(!skills.length)return [];
  const entries=skills.slice(0,2).map(([skillName,detail],i)=>['스킬 '+(i+1),{...detail,name:skillName}]);
  if(skills.length>=3){const [skillName,detail]=skills[skills.length-1];entries.push(['버스트',{...detail,name:skillName}]);}
  return entries;
}
function renderPediaSkills(name,data){
  const modal=ensureSkillModal(),body=modal.querySelector('#pediaSkillBody'),title=modal.querySelector('#pediaSkillTitle'),meta=modal.querySelector('#pediaSkillMeta');
  title.textContent=name+' · 스킬 정보';if(meta){const burst=data?.b??'';meta.textContent=(burst?'버스트 '+burst+'단계 · ':'')+'사이트 내부 저장 데이터 · 외부 요청 없음';}
  const entries=normalizeSkillEntries(data);
  const company=String(data.co??'').trim();
  const cls=String(data.c??'').trim();
  let weapon='';
  try{
    const wantedId=Number(data?.i);
    const wantedName=String(name||'').trim();
    const aliases={'사쿠라 스즈하라':'사쿠라'};
    const rawList=Array.isArray(window.__NIKKE_RAW)?window.__NIKKE_RAW:[];
    const raw=rawList.find(x=>Number(x?.['i']??x?.id)===wantedId)
      || rawList.find(x=>String(x?.['이름']??'').trim()===(aliases[wantedName]||wantedName));
    weapon=String(raw?.['무기']??'').trim();
  }catch(_){}
  meta.textContent=[company&&('기업: '+company),cls&&('클래스: '+cls),weapon&&('무기군: '+weapon)].filter(Boolean).join('  ·  ');
  if(!entries.length){body.innerHTML='<div class="pedia-skill-status error">이 니케의 스킬 정보가 없습니다.</div>';modal.classList.add('open');return;}
  const infoHtml='<div class="pedia-skill-info-strip"><span class="pedia-skill-info-item"><b>기업</b>'+escText(company||'정보 없음')+'</span><span class="pedia-skill-info-item"><b>클래스</b>'+escText(cls||'정보 없음')+'</span><span class="pedia-skill-info-item"><b>무기군</b>'+escText(weapon||'정보 없음')+'</span></div>';
  body.innerHTML=infoHtml+entries.map(([badge,detail])=>{const levels=getSkillLevels(detail),cooltime=detail.cooltime!=null?'쿨타임 '+Number(detail.cooltime).toFixed(1)+'s':'';return '<section class="pedia-skill-card"><div class="pedia-skill-card-head"><span class="pedia-skill-card-title">'+escText(badge)+' · '+escText(detail.name||'')+'</span><span class="pedia-skill-card-meta">'+escText(cooltime)+'</span></div><div class="pedia-skill-levels">'+levels.map(x=>'<button type="button" class="pedia-skill-level-btn'+(x.level===1?' active':'')+'" data-level="'+x.level+'">Lv.'+x.level+'</button>').join('')+'</div><div class="pedia-skill-desc" data-skill-levels>'+escText(levels[0]?.text||'설명 없음')+'</div></section>';}).join('');
  body.querySelectorAll('.pedia-skill-card').forEach((card,index)=>{const detail=entries[index]?.[1],levels=getSkillLevels(detail),desc=card.querySelector('[data-skill-levels]');card.querySelectorAll('.pedia-skill-level-btn').forEach(btn=>btn.addEventListener('click',()=>{card.querySelectorAll('.pedia-skill-level-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const item=levels.find(x=>x.level===Number(btn.dataset.level));if(desc)desc.textContent=item?.text||'설명 없음';}));});
  modal.classList.add('open');
}
async function openPediaSkill(name,id){
  const modal=ensureSkillModal();modal.classList.add('open');const body=modal.querySelector('#pediaSkillBody');
  body.innerHTML='<div class="pedia-skill-loading">사이트에 저장된 '+escText(name)+'의 스킬 정보를 불러오는 중…</div>';
  try{const all=await loadPediaSkillData();const aliases={'사쿠라 스즈하라':'사쿠라'};const data=findPediaSkillData(all,aliases[name]||name,id);if(!data)throw new Error(name+'의 스킬 정보가 없습니다.');renderPediaSkills(name,data);}catch(err){console.error('[pedia] skill load failed',err);body.innerHTML='<div class="pedia-skill-status error">'+escText(err?.message||'스킬 데이터를 불러오지 못했습니다.')+'</div>';}
}

function ensureNav(){const nav=document.querySelector('.nav');if(!nav||nav.querySelector('[data-view="pedia"]'))return;const btn=document.createElement('button');btn.type='button';btn.className='main-view-nav';btn.dataset.view='pedia';btn.textContent='도감';btn.addEventListener('click',()=>window.switchMainView?.('pedia'));nav.appendChild(btn);}
function ensurePanel(){
  if(document.getElementById('pediaPanel'))return;
  const main=document.querySelector('main.main');if(!main)return;
  const panel=document.createElement('section');panel.id='pediaPanel';panel.hidden=true;
  panel.innerHTML='<div class="pedia-head"><div class="pedia-head-row"><div><h3>니케 도감</h3><p>캐릭터 이미지는 실제 원본 파일만 등록합니다. 임의 생성 이미지는 사용하지 않습니다.</p></div><a class="pedia-source-btn" href="'+SOURCE_URL+'" target="_blank" rel="noopener noreferrer">BlablaLink 원본 보기 ↗</a></div></div><div class="pedia-toolbar"><input id="pediaSearch" class="pedia-search" type="search" placeholder="니케 이름 검색…"><span id="pediaCount" class="pedia-count"></span><div class="pedia-filter-row-v1044"><select id="pediaFilterCompany" class="pedia-filter-v1044"><option value="">기업 전체</option><option>엘리시온</option><option>미실리스</option><option>테트라</option><option>필그림</option><option>어브노멀</option></select><select id="pediaFilterClass" class="pedia-filter-v1044"><option value="">클래스 전체</option><option>화력형</option><option>방어형</option><option>지원형</option></select><select id="pediaFilterWeapon" class="pedia-filter-v1044"><option value="">무기군 전체</option><option>AR</option><option>SMG</option><option>SG</option><option>SR</option><option>RL</option><option>MG</option></select><select id="pediaFilterElement" class="pedia-filter-v1044"><option value="">속성 전체</option><option>철갑</option><option>풍압</option><option>전격</option><option>작열</option><option>수냉</option></select><select id="pediaFilterRarity" class="pedia-filter-v1044"><option value="">등급 전체</option><option>SSR</option><option>SR</option><option>R</option></select><select id="pediaFilterBurst" class="pedia-filter-v1044"><option value="">버스트 전체</option><option value="1">버스트 1</option><option value="2">버스트 2</option><option value="3">버스트 3</option></select></div></div><div id="pediaGrid" class="pedia-grid"></div>';
  const first=main.querySelector('#soleScorePanel,#outpostPanel,#characterPanel');if(first)main.insertBefore(panel,first);else main.appendChild(panel);
}
let pediaItems=[];
let pediaFilterMeta=null;
async function loadPediaFilterMeta(){
  if(pediaFilterMeta)return pediaFilterMeta;
  const all=await loadPediaSkillData();
  const rawList=Array.isArray(window.__NIKKE_RAW)?window.__NIKKE_RAW:[];
  const byId=new Map(),byName=new Map();
  rawList.forEach(x=>{if(!x||typeof x!=='object')return;const id=Number(x?.['i']??x?.id),name=String(x?.['이름']??x?.name??'').trim();if(Number.isFinite(id))byId.set(id,x);if(name)byName.set(normalizePediaName(name),x);});
  pediaFilterMeta=new Map();
  pediaItems.forEach(item=>{
    const id=Number(item?.id??item?.i),name=String(item?.name??'').trim();
    const skill=findPediaSkillData(all,name,id)||{};
    const raw=(Number.isFinite(id)&&byId.get(id))||byName.get(normalizePediaName(name))||{};
    const burst=String(raw?.['버스트']??'').replace(/[^0-9]/g,'')||String(skill?.b??'').replace(/[^0-9]/g,'');
    pediaFilterMeta.set(name,{company:String(raw?.['기업']??skill?.co??'').trim(),className:String(raw?.['클래스']??skill?.c??'').trim(),weapon:String(raw?.['무기']??'').trim(),element:String(raw?.['속성']??skill?.e??'').trim(),rarity:String(skill?.r??'').trim().toUpperCase(),burst});
  });
  return pediaFilterMeta;
}
async function loadPediaData(){if(pediaItems.length)return pediaItems;try{const res=await fetch(DATA_URL,{cache:'no-store'});if(!res.ok)throw new Error('http '+res.status);const items=await res.json();if(!Array.isArray(items))throw new Error('invalid data');pediaItems=items.filter(x=>x&&typeof x.name==='string'&&x.name.trim());}catch(_){const grid=document.getElementById('pediaGrid');if(grid)grid.innerHTML='<div class="pedia-empty">도감 데이터를 불러오지 못했습니다.</div>';pediaItems=[];}return pediaItems;}
function renderPedia(text){
  const grid=document.getElementById('pediaGrid'),count=document.getElementById('pediaCount');if(!grid||!count)return;
  const q=String(text??'').trim().toLowerCase();
  const f={
    company:document.getElementById('pediaFilterCompany')?.value||'',
    className:document.getElementById('pediaFilterClass')?.value||'',
    weapon:document.getElementById('pediaFilterWeapon')?.value||'',
    element:document.getElementById('pediaFilterElement')?.value||'',
    rarity:document.getElementById('pediaFilterRarity')?.value||'',
    burst:document.getElementById('pediaFilterBurst')?.value||''
  };
  const list=pediaItems.filter(x=>{
    if(q&&!String(x.name).toLowerCase().includes(q))return false;
    const m=pediaFilterMeta?.get(String(x.name).trim())||{};
    return (!f.company||m.company===f.company)&&(!f.className||m.className===f.className)&&(!f.weapon||m.weapon===f.weapon)&&(!f.element||m.element===f.element)&&(!f.rarity||m.rarity===f.rarity)&&(!f.burst||m.burst===f.burst);
  });
  count.textContent=list.length+' / '+pediaItems.length+'명';
  if(!list.length){grid.innerHTML='<div class="pedia-empty">조건에 맞는 니케가 없습니다.</div>';return;}
  grid.innerHTML=list.map(item=>{const image=String(item.image||'').trim(),id=item.id??item.i??'';const media=image?'<img loading="lazy" src="'+esc(image)+'" alt="'+esc(item.name)+'">':'<div class="pedia-placeholder">실제 원본 이미지<br>등록 전</div>';return '<article class="pedia-card" data-pedia-name="'+esc(item.name)+'" data-pedia-id="'+esc(id)+'" title="클릭하면 저장된 스킬 정보를 봅니다."><div class="pedia-image-box">'+media+'</div><div class="pedia-name" title="'+esc(item.name)+'">'+esc(item.name)+'</div><span class="pedia-skill-badge">스킬 보기</span></article>';}).join('');
  grid.querySelectorAll('.pedia-card').forEach(card=>card.addEventListener('click',()=>openPediaSkill(card.dataset.pediaName||'',card.dataset.pediaId||'')));
}
async function showPedia(){const panel=document.getElementById('pediaPanel');if(!panel)return;panel.hidden=false;document.body.classList.remove('outpost-view','sole-view','drop-rate-view');document.body.classList.add('pedia-view');document.getElementById('kpis')?.setAttribute('hidden','');document.getElementById('outpostPanel')?.setAttribute('hidden','');document.getElementById('soleScorePanel')?.classList.remove('active');document.getElementById('characterPanel')?.setAttribute('hidden','');document.querySelectorAll('.main-view-nav').forEach(btn=>btn.classList.toggle('active',btn.dataset.view==='pedia'));const title=document.getElementById('pageTitle');if(title)title.textContent='니케 도감';try{window.closeSidebar?.()}catch(_){}await loadPediaData();await loadPediaFilterMeta();renderPedia(document.getElementById('pediaSearch')?.value||'');}
function hidePedia(){const panel=document.getElementById('pediaPanel');if(panel)panel.hidden=true;document.body.classList.remove('pedia-view');document.getElementById('characterPanel')?.removeAttribute('hidden');}
function patchMainViewSwitch(){if(typeof window.switchMainView!=='function'||window.switchMainView.__pediaPatched)return;const original=window.switchMainView;const wrapped=function(view){if(view==='pedia'){showPedia();return;}hidePedia();return original.apply(this,arguments);};wrapped.__pediaPatched=true;wrapped.__pediaOriginal=original;window.switchMainView=wrapped;}
function init(){
  injectStyle();ensureNav();ensurePanel();
  document.getElementById('pediaSearch')?.addEventListener('input',e=>renderPedia(e.target.value));
  ['Company','Class','Weapon','Element','Rarity','Burst'].forEach(k=>document.getElementById('pediaFilter'+k)?.addEventListener('change',()=>renderPedia(document.getElementById('pediaSearch')?.value||'')));
  patchMainViewSwitch();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

// v1.031: 도감 목록 등급 색상 + 버스트 단계 배지
(function(){
  const STYLE_ID='pedia-rarity-burst-v1031';
  function addStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const st=document.createElement('style'); st.id=STYLE_ID;
    st.textContent=`
      .pedia-card.pedia-rarity-SSR{border:2px solid #d6a928!important;background:linear-gradient(180deg,#fff9df 0%,#fffdf4 58%,#fff 100%)!important;box-shadow:0 4px 14px rgba(214,169,40,.16)!important}
      .pedia-card.pedia-rarity-SR{border:2px solid #9a68c7!important;background:linear-gradient(180deg,#f7edff 0%,#fcf8ff 58%,#fff 100%)!important;box-shadow:0 4px 14px rgba(154,104,199,.15)!important}
      .pedia-card.pedia-rarity-R{border:2px solid #5f9fca!important;background:linear-gradient(180deg,#eaf7ff 0%,#f7fcff 58%,#fff 100%)!important;box-shadow:0 4px 14px rgba(95,159,202,.14)!important}
      html.dark-theme .pedia-card.pedia-rarity-SSR{background:linear-gradient(180deg,#3a3218 0%,#211d12 58%,#151f31 100%)!important;border-color:#d6a928!important}
      html.dark-theme .pedia-card.pedia-rarity-SR{background:linear-gradient(180deg,#30213b 0%,#20182a 58%,#151f31 100%)!important;border-color:#9a68c7!important}
      html.dark-theme .pedia-card.pedia-rarity-R{background:linear-gradient(180deg,#1b3345 0%,#142632 58%,#151f31 100%)!important;border-color:#5f9fca!important}
      .pedia-card-actions{display:flex;align-items:center;gap:6px;padding:0 10px 10px;flex-wrap:wrap}
      .pedia-card-actions .pedia-skill-badge{margin:0!important}
      .pedia-burst-badge{display:inline-flex;align-items:center;justify-content:center;padding:4px 7px;border:1px solid #bfd5df;border-radius:6px;background:#eef7fb;color:#347fa7;font-size:9px;font-weight:900;white-space:nowrap}
      html.dark-theme .pedia-burst-badge{background:#142438;border-color:#344660;color:#a9d4ff}
    `;
    document.head.appendChild(st);
  }
  function norm(v){return String(v??'').normalize('NFKC').toLowerCase().replace(/[\s:：·•._'’“”"`\-–—()\[\]{}]/g,'');}
  let cache=null;
  async function data(){
    if(cache) return cache;
    try{const r=await fetch('assets/nikke-skills.json?v=1043',{cache:'no-store'}); if(!r.ok) return null; cache=await r.json(); return cache;}catch(_){return null;}
  }
  function find(all,name,id){
    if(!all||typeof all!=='object') return null;
    const n=Number(id);
    if(Number.isFinite(n)){const x=Object.values(all).find(v=>v&&Number(v.i)===n);if(x)return x;}
    if(all[name]) return all[name];
    const w=norm(name); const hit=Object.entries(all).find(([k,v])=>norm(k)===w||norm(v?.name)===w); return hit?hit[1]:null;
  }
  async function decorate(){
    addStyle();
    const grid=document.getElementById('pediaGrid'); if(!grid) return;
    const all=await data(); if(!all) return;
    grid.querySelectorAll('.pedia-card').forEach(card=>{
      const d=find(all,card.dataset.pediaName||'',card.dataset.pediaId||'');
      if(!d) return;
      const rarity=String(d.r||'').toUpperCase();
      if(['SSR','SR','R'].includes(rarity)){
        card.classList.remove('pedia-rarity-SSR','pedia-rarity-SR','pedia-rarity-R');
        card.classList.add('pedia-rarity-'+rarity);
      }
      const burst=String(d.b??'').trim();
      let actions=card.querySelector('.pedia-card-actions');
      const oldBadge=card.querySelector('.pedia-skill-badge');
      if(!actions && oldBadge){
        actions=document.createElement('div'); actions.className='pedia-card-actions';
        oldBadge.parentNode.insertBefore(actions,oldBadge); actions.appendChild(oldBadge);
      }
      if(actions && burst && !actions.querySelector('.pedia-burst-badge')){
        const b=document.createElement('span'); b.className='pedia-burst-badge'; b.textContent='버스트 '+burst;
        actions.appendChild(b);
      }
      card.dataset.rarityDecorated='1';
    });
  }
  function init(){
    addStyle();
    const grid=document.getElementById('pediaGrid');
    if(grid){
      const ob=new MutationObserver(()=>decorate());
      ob.observe(grid,{childList:true,subtree:true});
      decorate();
    } else setTimeout(init,300);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();

})();

