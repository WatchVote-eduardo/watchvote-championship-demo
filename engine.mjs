export const CATEGORIES = ['open', 'vintage', 'mainstream', 'independent'];
export const LABELS = {open:'Open', vintage:'Vintage', mainstream:'Mainstream', independent:'Independent'};
export const PHASES = ['registration', 'uploads', 'club-vote', 'draw', 'r16', 'quarterfinals', 'semifinals', 'final', 'champion'];
export const PHASE_LABELS = ['Registration', 'Uploads', 'Club vote', 'The Draw', 'Round of 16', 'Quarterfinals', 'Semifinals', 'Final', 'Champion'];
export const DEFAULT_SETTINGS = {blindVoting:true, neutralVoting:true, hideLivePercentages:true, minimumAccountAgeDays:0, minimumMembers:10, requireAllCategories:true, allowMultiplePicks:true};
const fail = message => { throw new Error(message); };
export function randomFromSeed(seed) {
  let h = 2166136261;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function roundDefinitions(size = 16, themes = CATEGORIES) {
  if (![8,16].includes(size)) fail('Bracket size must be 8 or 16.');
  const rounds = [{id:'r16',name:'Round of 16',theme:themes[0]}, {id:'quarterfinals',name:'Quarterfinals',theme:themes[1]}, {id:'semifinals',name:'Semifinals',theme:themes[2]}, {id:'final',name:'Final',theme:themes[3]}];
  return size === 8 ? rounds.slice(1) : rounds;
}
export function defaultSchedule(size = 16) {
  const schedule = [
    ['registration','2027-02-01T00:00:00-05:00','2027-02-26T23:59:59-05:00'],
    ['uploads','2027-03-07T00:00:00-05:00','2027-03-09T23:59:59-05:00'],
    ['club-vote','2027-03-10T00:00:00-05:00','2027-03-13T23:59:59-05:00'],
    ['draw','2027-03-14T00:00:00-05:00','2027-03-14T23:59:59-04:00'],
    ['r16','2027-03-18T00:00:00-04:00','2027-03-21T23:59:59-04:00'],
    ['quarterfinals','2027-03-25T00:00:00-04:00','2027-03-28T23:59:59-04:00'],
    ['semifinals','2027-03-29T00:00:00-04:00','2027-04-01T23:59:59-04:00'],
    ['final','2027-04-02T00:00:00-04:00','2027-04-05T20:00:00-04:00'],
    ['champion','2027-04-05T20:00:01-04:00',null]
  ].map(([id,opensAt,closesAt]) => ({id,opensAt,closesAt}));
  if (size === 8) {
    const q = schedule.find(p=>p.id==='quarterfinals'), s = schedule.find(p=>p.id==='semifinals');
    [q.opensAt,q.closesAt] = [schedule[4].opensAt,schedule[4].closesAt];
    [s.opensAt,s.closesAt] = ['2027-03-25T00:00:00-04:00','2027-03-28T23:59:59-04:00'];
    return schedule.filter(p=>p.id!=='r16');
  }
  return schedule;
}
export function phaseAt(tournament, now = new Date()) {
  let phase = 'registration';
  for (const p of tournament.schedule) if (Date.parse(p.opensAt) <= +new Date(now)) phase = p.id;
  return phase;
}
export function phaseIsOpen(t, phase, now) {
  const p = t.schedule.find(p=>p.id===phase);
  return Boolean(p && +new Date(now)>=Date.parse(p.opensAt) && (!p.closesAt || +new Date(now)<=Date.parse(p.closesAt)));
}
export function validateCategory(shot, t) {
  if (!CATEGORIES.includes(shot.category)) return {valid:false,reason:'Choose one category.'};
  if (shot.category === 'vintage' && (!Number.isInteger(Number(shot.productionYear)) || Number(shot.productionYear)<1500 || Number(shot.productionYear)>t.vintageCutoff)) return {valid:false,reason:`Vintage must be produced in ${t.vintageCutoff} or earlier.`};
  if (['mainstream','independent'].includes(shot.category)) {
    const brand = t.brands.find(b=>b.name.toLowerCase()===String(shot.brand).trim().toLowerCase());
    if (!brand) return {valid:true,status:'review',reason:'Unlisted brand: WatchVote review required.'};
    if (brand.type !== shot.category) return {valid:false,reason:`This brand belongs in ${LABELS[brand.type]}.`};
    if (shot.category==='mainstream' && shot.productionYear && Number(shot.productionYear)<=t.vintageCutoff) return {valid:false,reason:'A vintage watch belongs in Open or Vintage.'};
  }
  return {valid:true,status:'approved'};
}
export function joinClub(state, accountId, clubId) {
  const account = state.accounts.find(a=>a.id===accountId);
  if (!account?.fullyRegistered) fail('Full WatchVote registration is required.');
  if (!state.clubs.some(c=>c.id===clubId && c.status==='approved')) fail('Choose an approved club.');
  if (state.memberships.some(m=>m.accountId===accountId && m.status!=='removed' && m.clubId!==clubId)) fail('One tournament roster per person.');
  if (state.memberships.some(m=>m.accountId===accountId && m.clubId===clubId && m.status!=='removed')) fail('A membership already exists.');
  state.memberships.push({accountId,clubId,status:'pending',role:'member',roster:true});
}
export function approvedMember(state, accountId, clubId) {
  return state.memberships.some(m=>m.accountId===accountId && m.clubId===clubId && m.status==='approved' && m.roster);
}
export function submitShot(state, shot, now) {
  if (!phaseIsOpen(state.tournament,'uploads',now)) fail('Uploads are closed.');
  if (!approvedMember(state,shot.accountId,shot.clubId)) fail('Approved membership required.');
  if (!shot.consentAt || !shot.image || !shot.brand || !shot.model || !shot.reference) fail('Photo, watch details and consent are required.');
  const result = validateCategory(shot,state.tournament);
  if (!result.valid) fail(result.reason);
  const old = state.submissions.find(s=>s.accountId===shot.accountId && s.category===shot.category && s.status!=='removed');
  const entry = {...shot,id:old?.id || `shot-${state.nextId++}`,uploadedAt:now,status:result.status};
  if (old) state.submissions[state.submissions.indexOf(old)] = entry; else state.submissions.push(entry);
  return entry;
}
export function hubVote(state, accountId, submissionId, now) {
  if (!phaseIsOpen(state.tournament,'club-vote',now)) fail('Club ballots are closed.');
  const s = state.submissions.find(s=>s.id===submissionId && s.status==='approved');
  if (!s || !approvedMember(state,accountId,s.clubId)) fail('This ballot is for approved club members only.');
  if (s.accountId===accountId) fail('You cannot vote for your own shot.');
  state.hubVotes = state.hubVotes.filter(v=>!(v.accountId===accountId && v.clubId===s.clubId && v.category===s.category));
  state.hubVotes.push({accountId,clubId:s.clubId,category:s.category,submissionId,timestamp:now});
}
export function clubPicks(state, clubId) {
  const picks = {}, selectedAccounts = new Set();
  for (const category of CATEGORIES) {
    const votes = state.hubVotes.filter(v=>v.clubId===clubId && v.category===category);
    const candidates = state.submissions.filter(s=>s.clubId===clubId && s.category===category && s.status==='approved' && (state.tournament.settings.allowMultiplePicks || !selectedAccounts.has(s.accountId)));
    candidates.sort((a,b)=>votes.filter(v=>v.submissionId===b.id).length-votes.filter(v=>v.submissionId===a.id).length || Date.parse(a.uploadedAt)-Date.parse(b.uploadedAt) || a.id.localeCompare(b.id));
    if (candidates[0]) {
      const shot = candidates[0]; selectedAccounts.add(shot.accountId);
      picks[category] = {...shot,ballotShare:votes.length ? votes.filter(v=>v.submissionId===shot.id).length/votes.length : 0};
    }
  }
  return picks;
}
export function qualification(state, clubId) {
  const reasons = [], t = state.tournament;
  const club = state.clubs.find(c=>c.id===clubId);
  if (club?.status!=='approved') reasons.push('Club approval required.');
  const count = state.memberships.filter(m=>m.clubId===clubId && m.status==='approved' && m.roster).length;
  if (count < t.settings.minimumMembers) reasons.push(`Needs ${t.settings.minimumMembers} approved members.`);
  const picks = clubPicks(state,clubId);
  if (t.settings.requireAllCategories) for (const r of roundDefinitions(t.bracketSize,t.themes)) if (!picks[r.theme]) reasons.push(`Needs a ${LABELS[r.theme]} shot.`);
  return {qualified:reasons.length===0,reasons,count};
}
export function isRevealed(t, category, phase) {
  const reveal = {open:'draw',vintage:'quarterfinals',mainstream:'semifinals',independent:'final'};
  const round = roundDefinitions(t.bracketSize,t.themes).find(r=>r.theme===category);
  if (!round) return false;
  const opens = round.id==='r16' ? 'draw' : round.id;
  return PHASES.indexOf(phase)>=PHASES.indexOf(opens || reveal[category]);
}
export function publicPick(state, clubId, category, phase) {
  return isRevealed(state.tournament,category,phase) ? (state.draw?.picks[clubId]?.[category] || clubPicks(state,clubId)[category] || null) : null;
}
export function seededDraw(state, seed, {dryRun=false} = {}) {
  const qualified = state.clubs.filter(c=>qualification(state,c.id).qualified).map(c=>c.id);
  const size = state.tournament.bracketSize;
  if (qualified.length < 8 || qualified.length > size) fail(`Need 8 to ${size} qualified clubs.`);
  if (state.draw && !dryRun) fail('The draw is already published. Reset the demo to redraw.');
  const slots = [...qualified, ...Array(size-qualified.length).fill(null)], random = randomFromSeed(seed);
  for (let i=slots.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [slots[i],slots[j]]=[slots[j],slots[i]]; }
  const picks = Object.fromEntries(qualified.map(id=>[id,clubPicks(state,id)]));
  const draw = {seed:String(seed),method:'FNV-1a seed → Mulberry32 → Fisher–Yates shuffle',slots,picks,rounds:[]};
  const definitions = roundDefinitions(size,state.tournament.themes);
  let prior = [];
  for (let r=0;r<definitions.length;r++) {
    const matches = Array.from({length:size/(2**(r+1))},(_,i)=>({id:`${definitions[r].id}-${i}`,round:definitions[r].id,theme:definitions[r].theme,slot:i,clubA:r===0?slots[i*2]:null,clubB:r===0?slots[i*2+1]:null,sourceA:r?prior[i*2].id:null,sourceB:r?prior[i*2+1].id:null,winner:null,closed:false,votesA:0,votesB:0}));
    draw.rounds.push({...definitions[r],matches}); prior=matches;
  }
  advanceByes(draw);
  if (!dryRun) { state.draw=draw; state.arenaVotes=[]; state.tieLog=[]; }
  return draw;
}
export function allMatches(draw) { return draw?.rounds.flatMap(r=>r.matches) || []; }
export function championResult(state) {
  const final=state.draw?.rounds.at(-1)?.matches[0];
  if (!final?.closed || !final.winner) return null;
  return {clubId:final.winner,theme:final.theme,shot:state.draw.picks[final.winner]?.[final.theme] || null};
}
function advanceByes(draw) {
  const matches = allMatches(draw);
  for (const m of matches) {
    const a = matches.find(x=>x.id===m.sourceA), b = matches.find(x=>x.id===m.sourceB);
    if (a?.closed) m.clubA=a.winner;
    if (b?.closed) m.clubB=b.winner;
    const ready = !m.sourceA || (a?.closed && b?.closed);
    if (ready && (!m.clubA || !m.clubB)) { m.closed=true; m.winner=m.clubA || m.clubB; m.bye=true; }
  }
}
export function arenaEligibility(state,accountId,match,now) {
  const account = state.accounts.find(a=>a.id===accountId), t=state.tournament;
  if (!account?.fullyRegistered) return 'Sign in with a fully registered WatchVote account.';
  if (!match || match.closed || !match.clubA || !match.clubB || !phaseIsOpen(t,match.round,now)) return 'This matchup is not open for voting.';
  if ((+new Date(now)-Date.parse(account.createdAt))/86400000<t.settings.minimumAccountAgeDays) return `Your account must be ${t.settings.minimumAccountAgeDays} days old.`;
  if (t.settings.neutralVoting && state.memberships.some(m=>m.accountId===accountId && m.status==='approved' && [match.clubA,match.clubB].includes(m.clubId))) return 'Neutral voting: members of these clubs sit this matchup out.';
  if (state.arenaVotes.some(v=>v.accountId===accountId && v.matchupId===match.id)) return 'Vote counted. Arena votes are final.';
  return null;
}
export function arenaVote(state,accountId,matchupId,choice,now) {
  const match=allMatches(state.draw).find(m=>m.id===matchupId);
  const reason=arenaEligibility(state,accountId,match,now);
  if (reason) fail(reason);
  if (!['A','B'].includes(choice)) fail('Choose Shot A or Shot B.');
  state.arenaVotes.push({accountId,matchupId,choice,timestamp:now});
}
export function closeMatch(state,matchupId,{now,coin} = {}) {
  const m=allMatches(state.draw).find(m=>m.id===matchupId);
  if (!m) fail('Matchup not found.');
  if (m.closed) return m;
  if (!m.clubA || !m.clubB) fail('Previous round must close first.');
  if (!now || +new Date(now)<=Date.parse(state.tournament.schedule.find(p=>p.id===m.round).closesAt)) fail('The voting window is still open.');
  const votes=state.arenaVotes.filter(v=>v.matchupId===m.id);
  m.votesA=votes.filter(v=>v.choice==='A').length; m.votesB=votes.filter(v=>v.choice==='B').length;
  let a=m.votesA, b=m.votesB;
  if (a===b) {
    a=state.draw.picks[m.clubA]?.[m.theme]?.ballotShare || 0; b=state.draw.picks[m.clubB]?.[m.theme]?.ballotShare || 0;
    m.tieBreak='club ballot share';
    if (a===b) {
      if (!['A','B'].includes(coin)) fail('Tied ballot shares: a logged admin coin flip is required.');
      m.tieBreak='admin coin flip'; a=coin==='A'?1:0; b=1-a;
      state.tieLog.push({matchupId,choice:coin,timestamp:now,reason:'Equal Arena votes and equal club ballot shares'});
    }
  }
  m.winner=a>b?m.clubA:m.clubB; m.closed=true;
  advanceByes(state.draw);
  return m;
}
export function visibleMatch(state,match,phase) {
  const namesVisible=match.closed || !state.tournament.settings.blindVoting;
  const resultVisible=match.closed || !state.tournament.settings.hideLivePercentages;
  const votes=state.arenaVotes.filter(v=>v.matchupId===match.id);
  return {id:match.id,theme:match.theme,closed:match.closed,winner:match.closed?match.winner:null,
    clubA:namesVisible?match.clubA:null,clubB:namesVisible?match.clubB:null,
    shotA:publicPick(state,match.clubA,match.theme,phase),shotB:publicPick(state,match.clubB,match.theme,phase),
    votesA:resultVisible?votes.filter(v=>v.choice==='A').length:null,votesB:resultVisible?votes.filter(v=>v.choice==='B').length:null};
}
