import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from './engine.mjs';
import {createMock,preparePhase,previewNow,loadState,saveState,STORAGE_KEY} from './mock.mjs';
const voteTime='2027-03-11T15:00:00Z';
function field(n){const s=createMock();s.clubs.forEach((c,i)=>{c.status=i<n?'approved':'withheld';});s.tournament.bracketSize=n===8?8:16;s.tournament.schedule=E.defaultSchedule(s.tournament.bracketSize);return s;}
function openMatch(){const s=createMock();E.seededDraw(s,'test');return [s,E.allMatches(s.draw).find(m=>!m.closed)];}
function end(s,m){return new Date(Date.parse(s.tournament.schedule.find(p=>p.id===m.round).closesAt)+1000).toISOString();}
for(const n of [8,12,16])test(`seeded draw with ${n} clubs is reproducible and places each club once`,()=>{
 const s=field(n),a=E.seededDraw(s,'a',{dryRun:true}),b=E.seededDraw(s,'a',{dryRun:true});
 assert.equal(s.draw,null);assert.deepEqual(a,b);assert.equal(a.slots.length,n===8?8:16);
 assert.equal(new Set(a.slots.filter(Boolean)).size,n);assert.equal(a.slots.filter(x=>!x).length,(n===8?8:16)-n);
 assert.notDeepEqual(a.slots,E.seededDraw(s,'different',{dryRun:true}).slots);
 E.seededDraw(s,'a');assert.throws(()=>E.seededDraw(s,'again'),/already published/);
});
test('8 clubs drop Open, with the correct earlier Quarterfinal and Semifinal dates',()=>{
 assert.deepEqual(E.roundDefinitions(8).map(r=>r.theme),['vintage','mainstream','independent']);
 assert.deepEqual(E.roundDefinitions(16).map(r=>r.theme),E.CATEGORIES);
 const schedule=E.defaultSchedule(8);assert(!schedule.some(p=>p.id==='r16'));
 assert.match(schedule.find(p=>p.id==='quarterfinals').opensAt,/03-18/);assert.match(schedule.find(p=>p.id==='semifinals').opensAt,/03-25/);
});
test('phase clock uses editable dates and explicit offsets, including Miami championship evening',()=>{
 const t=createMock().tournament;assert.equal(E.phaseAt(t,'2027-03-10T04:59:59Z'),'uploads');
 assert.equal(E.phaseAt(t,'2027-03-10T05:00:00Z'),'club-vote');
 assert.equal(E.phaseAt(t,'2027-04-06T00:00:02Z'),'champion');
 assert(!E.phaseIsOpen(t,'registration','2027-03-01T00:00:00Z'));
 t.schedule.find(p=>p.id==='uploads').opensAt='2027-03-06T00:00:00-05:00';assert.equal(E.phaseAt(t,'2027-03-06T12:00:00Z'),'uploads');
});
test('category validation enforces the cutoff, rejects wrong brands, and queues unknowns',()=>{
 const t=createMock().tournament;
 for(const year of [null,'',1997,'not a year',1996.5])assert(!E.validateCategory({category:'vintage',productionYear:year},t).valid);
 assert(E.validateCategory({category:'vintage',productionYear:1996},t).valid);
 assert(!E.validateCategory({category:'mainstream',brand:'Rolex',productionYear:1972},t).valid);
 assert(!E.validateCategory({category:'independent',brand:'Rolex'},t).valid);
 assert.equal(E.validateCategory({category:'mainstream',brand:'Unknown atelier'},t).status,'review');
 assert(E.validateCategory({category:'independent',brand:'f. p. journe'},t).valid);
 t.vintageCutoff=1990;assert(!E.validateCategory({category:'vintage',productionYear:1996},t).valid);
 assert(!E.validateCategory({category:'invalid'},t).valid);
});
test('qualification checks approved members and the categories used by the bracket',()=>{
 const s=field(8),id=s.clubs[0].id;assert(E.qualification(s,id).qualified);
 s.submissions=s.submissions.filter(x=>x.clubId!==id||x.category!=='open');assert(E.qualification(s,id).qualified);
 s.submissions=s.submissions.filter(x=>x.clubId!==id||x.category!=='vintage');assert(!E.qualification(s,id).qualified);
 s.tournament.settings.requireAllCategories=false;assert(E.qualification(s,id).qualified);
 s.tournament.settings.minimumMembers=30;assert(!E.qualification(s,id).qualified);
 assert.throws(()=>E.seededDraw(s,'x'),/Need 8/);
});
test('unreviewed submissions do not qualify as picks',()=>{
 const s=createMock();s.submissions.filter(x=>x.clubId==='club-1'&&x.category==='independent').forEach(x=>x.status='review');
 assert(!E.clubPicks(s,'club-1').independent);assert(!E.qualification(s,'club-1').qualified);
});
test('one roster per person, full registration, and pending membership are enforced',()=>{
 const s=createMock();assert.throws(()=>E.joinClub(s,'club-1-member-0','club-2'),/One tournament roster/);
 s.accounts.push({id:'new',fullyRegistered:false});assert.throws(()=>E.joinClub(s,'new','club-1'),/Full WatchVote/);
 s.accounts.at(-1).fullyRegistered=true;E.joinClub(s,'new','club-1');assert(!E.approvedMember(s,'new','club-1'));
 assert.throws(()=>E.joinClub(s,'new','club-2'),/One tournament roster/);
});
test('one submission per category is replaceable, with consent and upload-window checks',()=>{
 const s=createMock(),shot={...s.submissions[0]},time='2027-03-08T12:00:00Z',count=s.submissions.length;
 E.submitShot(s,{...shot,model:'Replaced'},time);assert.equal(s.submissions.length,count);assert.equal(s.submissions[0].model,'Replaced');
 assert.throws(()=>E.submitShot(s,{...shot,consentAt:null},time),/consent/);
 assert.throws(()=>E.submitShot(s,shot,voteTime),/Uploads are closed/);
 assert.throws(()=>E.submitShot(s,{...shot,accountId:'community-voter'},time),/membership/);
});
test('four distinct hub ballots are changeable and reject own shots, outsiders, and late votes',()=>{
 const s=createMock(),id='club-1-member-0';
 for(const category of E.CATEGORIES){E.hubVote(s,id,`club-1-${category}-1`,voteTime);E.hubVote(s,id,`club-1-${category}-2`,voteTime);}
 const votes=s.hubVotes.filter(v=>v.accountId===id);assert.equal(votes.length,4);assert(votes.every(v=>v.submissionId.endsWith('-2')));
 assert.throws(()=>E.hubVote(s,id,'club-1-open-0',voteTime),/own shot/);
 assert.throws(()=>E.hubVote(s,'community-voter','club-1-open-1',voteTime),/members only/);
 assert.throws(()=>E.hubVote(s,id,'club-1-open-1','2027-03-14T12:00:00Z'),/closed/);
});
test('hub ballot ties select the earliest upload; removing the pick promotes the next shot',()=>{
 const s=createMock();s.hubVotes=[];assert.equal(E.clubPicks(s,'club-1').open.id,'club-1-open-0');
 s.submissions.find(x=>x.id==='club-1-open-0').status='removed';assert.equal(E.clubPicks(s,'club-1').open.id,'club-1-open-1');
});
test('multiple winning categories per member is configurable',()=>{
 const s=createMock();s.hubVotes=[];assert.equal(Object.keys(E.clubPicks(s,'club-1')).length,4);
 s.tournament.settings.allowMultiplePicks=false;const picks=Object.values(E.clubPicks(s,'club-1'));assert.equal(new Set(picks.map(p=>p.accountId)).size,picks.length);
});
test('picks reveal only at their configured round; Open reveals at the Draw',()=>{
 const s=createMock();E.seededDraw(s,'sealed');
 for(const [cat,reveal] of [['open','draw'],['vintage','quarterfinals'],['mainstream','semifinals'],['independent','final']]){
  const index=E.PHASES.indexOf(reveal);for(const p of E.PHASES.slice(0,index))assert.equal(E.publicPick(s,'club-1',cat,p),null);
  assert(E.publicPick(s,'club-1',cat,reveal));
 }
 const eight=field(8);assert(!E.isRevealed(eight.tournament,'open','champion'));
 s.tournament.themes=['open','mainstream','vintage','independent'];assert(E.isRevealed(s.tournament,'mainstream','quarterfinals'));assert(!E.isRevealed(s.tournament,'vintage','quarterfinals'));
});
test('one final Arena vote per fully registered account per matchup',()=>{
 const [s,m]=openMatch(),time=previewNow(s,m.round);
 assert.throws(()=>E.arenaVote(s,'missing',m.id,'A',time),/fully registered/);
 E.arenaVote(s,'community-voter',m.id,'B',time);assert.throws(()=>E.arenaVote(s,'community-voter',m.id,'A',time),/final/);
 const other=E.allMatches(s.draw).find(x=>x.id!==m.id&&x.round===m.round);E.arenaVote(s,'community-voter',other.id,'A',time);
 assert.equal(s.arenaVotes.length,2);
});
test('neutral voting rejects either club roster, but can be switched off',()=>{
 const [s,m]=openMatch(),time=previewNow(s,m.round);
 for(const id of [m.clubA,m.clubB])assert.throws(()=>E.arenaVote(s,`${id}-member-0`,m.id,'A',time),/Neutral voting/);
 s.tournament.settings.neutralVoting=false;E.arenaVote(s,`${m.clubA}-member-0`,m.id,'A',time);assert.equal(s.arenaVotes.length,1);
});
test('minimum account age and Arena voting windows are enforced',()=>{
 const [s,m]=openMatch();s.tournament.settings.minimumAccountAgeDays=1000;
 assert.throws(()=>E.arenaVote(s,'community-voter',m.id,'A',previewNow(s,m.round)),/1000 days/);
 s.tournament.settings.minimumAccountAgeDays=0;assert.throws(()=>E.arenaVote(s,'community-voter',m.id,'A',voteTime),/not open/);
});
test('blind view and live percentages obey settings, then reveal when closed',()=>{
 const [s,m]=openMatch();E.arenaVote(s,'community-voter',m.id,'A',previewNow(s,m.round));
 let v=E.visibleMatch(s,m,'r16');assert.equal(v.clubA,null);assert.equal(v.votesA,null);
 s.tournament.settings.blindVoting=false;s.tournament.settings.hideLivePercentages=false;
 v=E.visibleMatch(s,m,'r16');assert.equal(v.clubA,m.clubA);assert.equal(v.votesA,1);
 s.tournament.settings.blindVoting=true;s.tournament.settings.hideLivePercentages=true;
 E.closeMatch(s,m.id,{now:end(s,m)});v=E.visibleMatch(s,m,'r16');assert.equal(v.clubA,m.clubA);assert.equal(v.votesA,1);
});
test('equal Arena votes resolve by the club ballot share',()=>{
 const [s,m]=openMatch();s.draw.picks[m.clubA][m.theme].ballotShare=.7;s.draw.picks[m.clubB][m.theme].ballotShare=.6;
 E.closeMatch(s,m.id,{now:end(s,m)});assert.equal(m.winner,m.clubA);assert.equal(m.tieBreak,'club ballot share');
});
test('equal ballot shares require an explicit logged admin coin flip',()=>{
 const [s,m]=openMatch();s.draw.picks[m.clubA][m.theme].ballotShare=.5;s.draw.picks[m.clubB][m.theme].ballotShare=.5;
 assert.throws(()=>E.closeMatch(s,m.id,{now:end(s,m)}),/coin flip/);
 E.closeMatch(s,m.id,{now:end(s,m),coin:'B'});assert.equal(m.winner,m.clubB);assert.equal(s.tieLog.length,1);
 assert.equal(s.tieLog[0].choice,'B');assert.throws(()=>E.closeMatch(s,E.allMatches(s.draw)[1].id,{now:voteTime,coin:'A'}),/still open/);
});
for(const n of [8,12,16])test(`all rounds advance correctly with ${n} clubs, including byes`,()=>{
 const s=field(n);preparePhase(s,'champion');const final=s.draw.rounds.at(-1).matches[0];
 assert(final.closed);assert(final.winner);assert.equal(E.allMatches(s.draw).filter(m=>!m.closed).length,0);
 const finalPick=s.draw.picks[final.winner].independent;assert.equal(finalPick.category,'independent');
});
test('mock data contains the required international clubs, registered rosters, images and years',()=>{
 const s=createMock();assert.equal(s.clubs.length,16);assert.equal(new Set(s.clubs.map(c=>c.country)).size,16);
 for(const c of s.clubs){const roster=s.memberships.filter(m=>m.clubId===c.id);assert(roster.length>=12&&roster.length<=25);assert(roster.every(m=>s.accounts.find(a=>a.id===m.accountId).fullyRegistered));assert.equal(Object.keys(E.clubPicks(s,c.id)).length,4);}
 assert(s.submissions.every(x=>x.productionYear&&x.image.startsWith('assets/')));
});
test('champion uses the configured final theme and tolerates a missing optional pick',()=>{
 const s=createMock();s.tournament.themes=['independent','vintage','mainstream','open'];preparePhase(s,'champion');
 const result=E.championResult(s);assert.equal(result.theme,'open');assert.equal(result.shot.category,'open');
 delete s.draw.picks[result.clubId].open;assert.equal(E.championResult(s).shot,null);
});
test('state round-trips through storage and recovers from malformed or unavailable storage',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},s=createMock();
 assert.equal(saveState(storage,s),null);assert.deepEqual(loadState(storage).state,s);
 map.set(STORAGE_KEY,'broken');assert(loadState(storage).error);
 assert(saveState({setItem(){throw Error('denied');}},s));
 assert(loadState({getItem(){throw Error('denied');}}).error);
});
