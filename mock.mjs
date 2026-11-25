import {CATEGORIES, DEFAULT_SETTINGS, defaultSchedule, hubVote, seededDraw, allMatches, arenaVote, closeMatch, roundDefinitions} from './engine.mjs';
const CLUBS = [
 ['Meridian Collectors','London','United Kingdom','🇬🇧','MC'],['Atelier des Heures','Paris','France','🇫🇷','AH'],
 ['Koyo Watch Society','Tokyo','Japan','🇯🇵','KW'],['Harbour Escapement','Sydney','Australia','🇦🇺','HE'],
 ['Sierra Dial Club','Mexico City','Mexico','🇲🇽','SD'],['Lago Tempo','Milan','Italy','🇮🇹','LT'],
 ['Fjord & Balance','Oslo','Norway','🇳🇴','FB'],['Cape Calibre','Cape Town','South Africa','🇿🇦','CC'],
 ['Straits Watch Circle','Singapore','Singapore','🇸🇬','SW'],['Rhein Zeit Collective','Cologne','Germany','🇩🇪','RZ'],
 ['Andes Hour Society','Santiago','Chile','🇨🇱','AH'],['Palm & Pinion','Miami','United States','🇺🇸','PP'],
 ['Desert Seconds','Dubai','United Arab Emirates','🇦🇪','DS'],['Lusitano Watch Guild','Lisbon','Portugal','🇵🇹','LW'],
 ['Maple Mainspring','Toronto','Canada','🇨🇦','MM'],['Deccan Timekeepers','Bengaluru','India','🇮🇳','DT']
];
const WATCHES = {open:['Omega','Seamaster','210.30',2022],vintage:['Rolex','Datejust','1601',1972],mainstream:['Cartier','Santos','WSSA0029',2021],independent:['F. P. Journe','Chronomètre Bleu','CB',2020]};
export function createMock() {
 const tournament={id:'wc-2027',edition:2027,name:'The World Championship of Watch Clubs',bracketSize:16,vintageCutoff:1996,themes:[...CATEGORIES],settings:{...DEFAULT_SETTINGS},schedule:defaultSchedule(),brands:[...['Rolex','Omega','Patek Philippe','Audemars Piguet','Vacheron Constantin','Cartier'].map(name=>({name,type:'mainstream'})),...['F. P. Journe','H. Moser & Cie.','Kari Voutilainen','Rexhep Rexhepi'].map(name=>({name,type:'independent'}))]};
 const s={version:1,tournament,clubs:[],accounts:[],memberships:[],submissions:[],hubVotes:[],arenaVotes:[],tieLog:[],applications:[],draw:null,nextId:1000};
 CLUBS.forEach(([name,city,country,flag,monogram],i)=>{
   const id=`club-${i+1}`; s.clubs.push({id,name,city,country,flag,monogram,status:'approved',description:'Independent minds. A shared appreciation for time.'});
   for(let j=0;j<12+i%14;j++) {
     const accountId=`${id}-member-${j}`;
     s.accounts.push({id:accountId,displayName:`Collector ${String(i+1).padStart(2,'0')}.${j+1}`,fullyRegistered:true,createdAt:'2026-01-01T00:00:00Z'});
     s.memberships.push({accountId,clubId:id,role:j===0?'club-admin':'member',status:'approved',roster:true});
     if (j<3) for(const category of CATEGORIES) {
       const [brand,model,reference,year]=WATCHES[category];
       s.submissions.push({id:`${id}-${category}-${j}`,clubId:id,accountId,category,brand,model,reference,productionYear:year,image:`assets/${category}.svg`,story:'A watch worth sharing.',consentAt:'2027-03-07T15:00:00Z',uploadedAt:`2027-03-07T1${j}:00:00Z`,status:'approved'});
     }
   }
 });
 s.accounts.push({id:'community-voter',displayName:'Alex Collector',fullyRegistered:true,createdAt:'2026-01-01T00:00:00Z'});
 for(const m of s.memberships) for(const cat of CATEGORIES) {
   const own=Number(m.accountId.split('-').at(-1));
   const target=own===0?1:0;
   hubVote(s,m.accountId,`${m.clubId}-${cat}-${target}`,'2027-03-11T15:00:00Z');
 }
 return s;
}
export function previewNow(state,phase) {
 const p=state.tournament.schedule.find(p=>p.id===phase);
 return new Date(Date.parse(p?.opensAt || state.tournament.schedule[0].opensAt)+12*3600000).toISOString();
}
export function preparePhase(state,phase) {
 const definitions=roundDefinitions(state.tournament.bracketSize,state.tournament.themes);
 const phaseIndex=['registration','uploads','club-vote','draw',...definitions.map(r=>r.id),'champion'].indexOf(phase);
 if(phaseIndex<3) return;
 if(!state.draw) seededDraw(state,'WATCHVOTE-2027-0314');
 for(const round of state.draw.rounds) {
   if(phase!=='champion' && definitions.findIndex(r=>r.id===round.id)>=definitions.findIndex(r=>r.id===phase)) break;
   if(phase==='draw') break;
   for(const m of round.matches) if(!m.closed) {
     simulateMatch(state,m);
     closeMatch(state,m.id,{now:new Date(Date.parse(state.tournament.schedule.find(p=>p.id===m.round).closesAt)+1000).toISOString(),coin:'A'});
   }
 }
}
function simulateMatch(state,m) {
 if(m.closed || !m.clubA || !m.clubB) return;
 for(let i=0;i<25;i++) {
   const id=`sim-${m.id}-${i}`;
   if(!state.accounts.some(a=>a.id===id)) state.accounts.push({id,displayName:'Simulated voter',fullyRegistered:true,createdAt:'2020-01-01T00:00:00Z'});
   try { arenaVote(state,id,m.id,i%5<3?'A':'B',previewNow(state,m.round)); } catch { /* Already simulated or restricted by edited settings. */ }
 }
}
export function simulateVotes(state,phase) {
 preparePhase(state,phase);
 allMatches(state.draw).filter(m=>m.round===phase).forEach(m=>simulateMatch(state,m));
}
export const STORAGE_KEY='watchvote-championship-v1';
export function loadState(storage) {
 try { const saved=JSON.parse(storage.getItem(STORAGE_KEY)); if(saved?.version===1 && saved.tournament && Array.isArray(saved.clubs)) return {state:saved,error:null}; }
 catch { return {state:createMock(),error:'Saved demo data could not be read. A fresh demo has been loaded.'}; }
 return {state:createMock(),error:null};
}
export function saveState(storage,state) { try { storage.setItem(STORAGE_KEY,JSON.stringify(state)); return null; } catch { return 'Browser storage is unavailable or full. Changes last only for this visit.'; } }
