// One deterministic SVG timeline is shared by the website and both video exports.
export const DURATION = 70;
export const SCENES = [
  {start:0,end:6,title:'A world of clubs',caption:'The World Championship of Watch Clubs.'},
  {start:6,end:14,title:'Enter together',caption:'Clubs enter. Members join their private Club Hub.'},
  {start:14,end:24,title:'Four categories',caption:'Members upload wrist shots in four categories.'},
  {start:24,end:34,title:'Choose. Then seal.',caption:'Seven days, members only. Each club picks one shot per category.'},
  {start:34,end:42,title:'The Draw',caption:'A random draw sets the bracket.'},
  {start:42,end:60,title:'The world votes',caption:'A new theme every round. The world votes, head to head.'},
  {start:60,end:70,title:'World Champion',caption:'One club. World Champion.'}
];
export const INK='#0e152a', PAPER='#ffffff', WARM='#f8f3ef', SAND='#ebddcf', LINE='#e8e0d6', MUTED='#4f4f4f', GREEN='#76c146', BRONZE='#855521';
const cats=['Open','Vintage','Mainstream','Independent'];
const defaults=['MC','AH','KW','HE','SD','LT','FB','CC','SW','RZ','AH','PP','DS','LW','MM','DT'];
export const escapeXML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>1-(1-clamp(n))**3;
const move=(t,delay=0,duration=.35)=>ease((t-delay)/duration);
const text=(value,x,y,size=24,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra.includes('text-anchor=')?'':'text-anchor="middle"'} ${extra}>${escapeXML(value)}</text>`;
const line=(x,y,xx,yy,color=LINE,w=2)=>`<path d="M${x} ${y}L${xx} ${yy}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
const rect=(x,y,w,h,fill=PAPER,stroke=LINE,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const circle=(x,y,r,fill='none',stroke=LINE,w=2)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
function crest(mark,x,y,r=29,active=false,champion=false) {
  const color=champion?BRONZE:INK;
  return `<g>${circle(x,y,r+5,'none',champion?BRONZE:LINE)}${circle(x,y,r,active?INK:SAND,color)}${text(mark,x,y+6,r*.6,`fill="${active?PAPER:color}" font-weight="500"`)}</g>`;
}
function check(x,y,opacity=1){return `<g opacity="${opacity}">${circle(x,y,13,GREEN,GREEN)}<path d="m${x-6} ${y} 4 4 8-9" fill="none" stroke="${INK}" stroke-width="2"/></g>`;}
function watch(x,y,w=190,h=240,type=0,winner=false) {
  return `<g transform="translate(${x} ${y})">${rect(0,0,w,h,PAPER,winner?GREEN:LINE)}<svg x="8" y="8" width="${w-16}" height="${h-16}" viewBox="0 0 200 250"><rect width="200" height="250" fill="${type%2?SAND:WARM}"/><path d="M-35 222 78-22 237 50 123 294Z" fill="${type%2?WARM:SAND}"/><g transform="translate(104 120) rotate(-24)"><rect x="-23" y="-146" width="46" height="292" rx="6" fill="${INK}"/><rect x="-36" y="-62" width="72" height="124" rx="12" fill="${LINE}"/>${type===2?'<rect x="-51" y="-51" width="102" height="102" rx="12" fill="'+INK+'"/>':circle(0,0,55,PAPER,INK,3)}${circle(0,0,45,type===2?INK:WARM,type===2?PAPER:LINE,1)}${Array.from({length:12},(_,i)=>{const a=i/6*Math.PI;return line(Math.sin(a)*39,-Math.cos(a)*39,Math.sin(a)*43,-Math.cos(a)*43,type===2?PAPER:INK,2);}).join('')}${type===3?circle(0,24,12,'none',MUTED,1)+line(0,24,6,17,INK,1):''}<path d="M-18-17 0 0 21-29" fill="none" stroke="${type===2?PAPER:INK}" stroke-width="3"/>${circle(0,0,3,type===2?PAPER:INK,INK)}<rect x="54" y="-6" width="8" height="12" rx="2" fill="${INK}"/></g></svg></g>`;
}
function envelope(x,y,w,h,reveal=0){return `<g opacity="${1-reveal}">${rect(x,y,w,h,SAND,INK,3)}<path d="m${x} ${y} ${w/2} ${h*.52} ${w/2}-${h*.52}M${x} ${y+h}l${w/2}-${h*.48} ${w/2} ${h*.48}" fill="none" stroke="${INK}" stroke-width="2"/>${circle(x+w/2,y+h*.5,18,INK,INK)}${text('WV',x+w/2,y+h*.5+5,12,`fill="${PAPER}"`)}</g>`;}
function dial(t,marks,draw=false) {
  let out=[250,199,146,91].map(r=>circle(540,338,r)).join('');
  for(let i=0;i<60;i++){const a=i/30*Math.PI;out+=line(540+Math.sin(a)*279,338-Math.cos(a)*279,540+Math.sin(a)*(i%5?284:291),338-Math.cos(a)*(i%5?284:291),LINE,i%5?1:3);}
  for(let i=0;i<16;i++){
    const a=i/8*Math.PI,drop=draw?move(t,1+i*.25):1;
    const spin=draw?(1-move(t,0,1))*Math.PI*1.5:0;
    const x=540+Math.sin(a+spin)*(255+(1-drop)*38), y=338-Math.cos(a+spin)*(255+(1-drop)*38);
    const b=(Math.floor(i/2)*2+.5)/8*Math.PI;
    out+=`<g opacity="${draw?.25+.75*drop:.2+.8*move(t,i*.25)}">${draw?line(x,y,540+Math.sin(b)*199,338-Math.cos(b)*199):''}${crest(marks[i%marks.length],x,y,25,draw?drop===1:t>i*.25)}</g>`;
  }
  out+=text(draw?'THE DRAW':'SIXTEEN CLUBS',540,315,20,'letter-spacing="5"');
  out+=text(draw?'An even chance.':'A world of time.',540,370,52,'class="display"');
  out+=circle(540,411,4,INK,INK);
  return out;
}
export function sceneAt(time) {
  const t=Math.max(0,Math.min(DURATION,Number(time)||0));
  return SCENES.findIndex(s=>t<s.end)===-1?6:SCENES.findIndex(s=>t<s.end);
}
export function defaultRounds(){return [{name:'Round of 16',theme:'Open'},{name:'Quarterfinals',theme:'Vintage'},{name:'Semifinals',theme:'Mainstream'},{name:'Final',theme:'Independent'}];}
export function visual(time,{monograms=defaults,rounds=defaultRounds(),cta='Enter your club'}={}) {
  const index=sceneAt(time), t=Math.max(0,Math.min(time,DURATION))-SCENES[index].start;
  const marks=monograms.length?monograms:defaults;
  let body='';
  if(index===0) body=dial(t,marks);
  if(index===1){
    body=`<g transform="translate(${(1-move(t))*(-120)} 0)" opacity="${move(t)}">${rect(80,160,280,322)}${crest(marks[0],220,242,42)}${text('ENTER YOUR CLUB',220,335,20,'letter-spacing="2"')}${line(125,370,315,370)}${line(125,400,260,400)}</g>${line(390,325,630,325,INK,2)}<path d="m608 315 16 10-16 10" fill="none" stroke="${INK}" stroke-width="2"/>${rect(658,100,332,480,PAPER,INK)}${text('PRIVATE CLUB HUB',824,153,23,'letter-spacing="2"')}${rect(754,204,142,298,INK,INK)}${rect(754,204,142*move(t,1,1),298,WARM,INK)}${circle(870,356,4,INK,INK)}${text('APPROVED MEMBERS',824,550,16,'letter-spacing="3"')}`;
    for(let i=0;i<5;i++){const progress=move(t,1.5+i*.6,.6),x=418+i*40+progress*(824-418-i*40),y=440;body+=`<g opacity="${1-progress*.9}">${circle(x,y,13,INK,INK)}<path d="M${x-18} ${y+54}v-15a18 18 0 0 1 36 0v15" fill="${SAND}" stroke="${INK}" stroke-width="2"/></g>`;}
  }
  if(index===2||index===3){
    body=text(index===2?'A COLLECTION WITH DEPTH':'FOUR CLUB PICKS. KEPT PRIVATE.',540,84,24,'letter-spacing="4"');
    for(let i=0;i<4;i++){
      const x=74+i*242,appear=move(t,.35+i*.55),rise=index===3?move(t,.5+i*.4)*42:0,seal=index===3?move(t,5+i*.35,.6):0;
      body+=rect(x-7,219,220,330,WARM,LINE)+text(cats[i].toUpperCase(),x+103,594,21,'letter-spacing="2"');
      if(index===2)body+=`<g transform="translate(0 ${(1-appear)*(-50)})" opacity="${appear}">${watch(x+21,173,174,218,i)}${watch(x+9,194,188,236,i)}</g>`;
      else body+=`<g opacity="${1-seal}" transform="translate(0 ${-rise})">${watch(x+9,194,188,236,i)}${rect(x+2,375,202,40,INK,INK)}${text('CLUB PICK',x+103,402,18,`fill="${PAPER}" letter-spacing="2"`)}${[0,1,2].map(n=>check(x+63+n*40,464,move(t,.4+n*.35+i*.2))).join('')}</g><g transform="translate(0 ${(1-seal)*70})" opacity="${seal}">${envelope(x+5,270,196,186)}${text('SEALED',x+103,492,18,'letter-spacing="4"')}</g>`;
    }
    body+=text(index===2?'One wrist shot per member, per category.':'7 DAYS  /  MEMBERS ONLY',540,664,22,index===2?'':`letter-spacing="5"`);
  }
  if(index===4)body=dial(t,marks,true)+text('A published seed. A place on the dial.',540,682,24);
  if(index===5){
    const ri=Math.min(rounds.length-1,Math.floor(t/(18/rounds.length))),r=rounds[ri],local=t-ri*(18/rounds.length),winner=move(local,3.6,.35),opened=move(local,.3,.4),type=cats.indexOf(r.theme);
    body=[258,205,150,93].map(radius=>circle(540,340,radius)).join('');
    body+=rect(240,24,600,66,r.name==='Final'?SAND:PAPER,r.name==='Final'?BRONZE:LINE,33)+text(`${r.name.toUpperCase()} · ${r.theme.toUpperCase()}`,540,66,25,`fill="${r.name==='Final'?BRONZE:INK}" letter-spacing="2"`);
    body+=`<g transform="translate(${winner*130} ${winner*24})" opacity="${1-winner*.2}">${watch(214,147,250,314,type,winner>.5)}${envelope(214,147,250,314,opened)}${text('SHOT A',339,503,19,'letter-spacing="3"')}</g><g opacity="${1-winner*.8}">${watch(616,147,250,314,type)}${envelope(616,147,250,314,opened)}${text('SHOT B',741,503,19,'letter-spacing="3"')}</g>`;
    const votes=move(local,1.2,1.7);
    body+=rect(350,549,380,10,LINE,LINE,5)+rect(350,549,Math.max(1,380*.64*votes),10,GREEN,GREEN,5)+text(winner>.5?'ONE ROUND CLOSER':'THE WORLD VOTES',540,611,22,'letter-spacing="3"');
    body+=rounds.map((round,i)=>circle(504+i*24-(rounds.length-4)*12,660,4,i<=ri?INK:SAND,i<=ri?INK:SAND)).join('');
  }
  if(index===6){
    if(t>=8){
      body=text('WATCH',560,275,72,'font-weight="300" text-anchor="end"')+text('VOTE',560,275,72,'font-weight="700" text-anchor="start"')+text('By Collectors.',540,324,24)+line(392,370,688,370)+text(cta,540,449,55,'class="display"')+text('watchvote.com',540,522,29,'letter-spacing="3"');
    } else {
      body=`<g opacity="${move(t)}">${circle(540,340,247,'none',BRONZE,3)}${circle(540,340,260,'none',LINE)}${circle(540,340,222,'none',BRONZE,1)}${watch(414,135,252,316,3)}${crest(marks[0],690,433,49,false,true)}${text('WORLD CHAMPION',540,540,36,`fill="${BRONZE}" letter-spacing="5"`)}${text('2027',540,593,23,`fill="${BRONZE}" letter-spacing="6"`)}${circle(540,640,5,BRONZE,BRONZE)}</g>`;
    }
  }
  return `<g font-family="WatchVote Jost, Jost, sans-serif" fill="${INK}">${body}</g>`;
}
export function visualSVG(time,options={}){return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="720" viewBox="0 0 1080 720" aria-hidden="true" focusable="false"><style>.display{font-family:'WatchVote Cormorant','Cormorant Garamond',Georgia,serif;font-weight:700}</style><g data-explainer-frame>${visual(time,options)}</g></svg>`;}
// Caption line breaks are deliberate, so both Instagram sizes remain readable.
const captionLines=[['The World Championship','of Watch Clubs.'],['Clubs enter. Members join','their private Club Hub.'],['Members upload wrist shots','in four categories.'],['Seven days, members only.','Each club picks one shot','per category.'],['A random draw','sets the bracket.'],['A new theme every round.','The world votes, head to head.'],['One club.','World Champion.']];
export function socialFrame(time,options={}){
  const index=sceneAt(time),end=time>=68;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><style>text{font-family:'WatchVote Jost',Jost,sans-serif}.display{font-family:'WatchVote Cormorant','Cormorant Garamond',Georgia,serif;font-weight:700}</style><rect width="1080" height="1350" fill="${WARM}"/><g fill="${INK}">${text('WATCHVOTE  /  2027',540,105,24,'letter-spacing="7"')}${line(80,145,1000,145)}<svg x="0" y="188" width="1080" height="720" viewBox="0 0 1080 720">${visual(time,options)}</svg>${end?'':captionLines[index].map((s,i)=>text(s,540,1000+i*66,57,'class="display"')).join('')}${text(end?'Clubs compete. The world votes. One club is crowned.':`${String(index+1).padStart(2,'0')} / 07  ·  ${SCENES[index].title.toUpperCase()}`,540,1240,end?23:20,'letter-spacing="2"')}${line(80,1290,1000,1290)}<path d="M80 1290H${80+920*clamp(time/DURATION)}" stroke="${GREEN}" stroke-width="4"/></g></svg>`;
}
