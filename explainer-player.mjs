import {SCENES,DURATION,sceneAt,visual,visualSVG,escapeXML,defaultRounds} from './explainer.mjs';

export function explainerMarkup(options){
  const rounds=options.rounds||defaultRounds();
  return `<section class="explainer-section" id="explainer" aria-labelledby="explainer-title"><div class="container section"><div class="section-head"><div><p class="eyebrow">The whole championship. In 70 seconds.</p><h2 id="explainer-title">From a shared passion<br>to a world title.</h2></div><p class="micro">Seven chapters. Best enjoyed sound off.</p></div><div class="explainer-player"><div class="explainer-animation"><div class="explainer-stage" aria-hidden="true">${visualSVG(0,options)}</div><div class="explainer-caption"><span class="eyebrow" data-scene-label>01 / 07 · ${SCENES[0].title}</span><p data-caption>${SCENES[0].caption}</p></div><div class="explainer-controls"><button type="button" data-play aria-label="Play explainer">Play</button><button type="button" data-replay aria-label="Replay explainer">↺ Replay</button><label class="explainer-progress"><span class="sr-only">Explainer progress in seconds</span><input type="range" data-seek min="0" max="70" step="0.1" value="0" aria-valuetext="0 of 70 seconds"></label><span data-time aria-hidden="true">0:00 / 1:10</span><button type="button" data-sound hidden aria-label="Unmute voiceover">Sound off</button></div><div class="scene-chips" role="group" aria-label="Jump to an explainer scene">${SCENES.map((s,i)=>`<button type="button" data-scene="${i}" aria-pressed="${i===0}"><span>0${i+1}</span> ${s.title}</button>`).join('')}</div><audio data-voiceover muted preload="none"></audio><p class="sr-only" role="status" data-player-status></p></div><div class="explainer-static"><p class="micro">The championship at your own pace. Animation is off to respect your motion preference.</p><div class="static-scenes">${SCENES.map((s,i)=>`<article>${visualSVG(i===5?58:s.end-1,options)}<span class="eyebrow">0${i+1} / ${s.title}</span><h3>${s.caption}</h3>${i===5?`<p>${rounds.map(r=>`${escapeXML(r.name)} · ${escapeXML(r.theme)}`).join('<br>')}</p>`:''}</article>`).join('')}</div></div></div><div class="explainer-downloads"><span class="micro">Take the story with you.</span><a href="assets/video/watchvote-championship-reels.mp4" download>Reels &amp; Stories · MP4 ↗</a><a href="assets/video/watchvote-championship-feed.mp4" download>Instagram feed · MP4 ↗</a></div></div></section>`;
}

export function mountExplainer(root,options={}) {
  if(!root)return ()=>{};
  const frame=root.querySelector('.explainer-stage [data-explainer-frame]'),play=root.querySelector('[data-play]'),seek=root.querySelector('[data-seek]'),caption=root.querySelector('[data-caption]'),chips=[...root.querySelectorAll('[data-scene]')],audio=root.querySelector('audio');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let time=0,playing=false,wantsPlay=false,started=false,last=null,raf=0,visible=false,disposed=false,lastScene=-1;
  // Optional future voiceover: pass a same-origin audio URL; autoplay stays muted.
  if(options.voiceoverSrc){audio.src=options.voiceoverSrc;root.querySelector('[data-sound]').hidden=false;}
  const clock=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  function paint(){
    // Keep the SVG, its stylesheet and its layout box mounted during playback.
    // Replacing them each frame can make WebKit re-follow the page's fragment.
    frame.innerHTML=visual(time,options);
    const i=sceneAt(time);
    if(i!==lastScene){caption.textContent=SCENES[i].caption;root.querySelector('[data-scene-label]').textContent=`0${i+1} / 07 · ${SCENES[i].title}`;chips.forEach((c,j)=>c.setAttribute('aria-pressed',String(i===j)));lastScene=i;}
    seek.value=String(time);seek.setAttribute('aria-valuetext',`${Math.floor(time)} of 70 seconds`);root.querySelector('[data-time]').textContent=`${clock(time)} / 1:10`;
    play.textContent=playing?'Pause':time>=DURATION?'Play again':'Play';play.setAttribute('aria-label',playing?'Pause explainer':time>=DURATION?'Play explainer again':'Play explainer');
  }
  function syncAudio(){if(!audio.src)return;audio.currentTime=time;if(playing)audio.play().catch(()=>{});else audio.pause();}
  function tick(stamp){if(disposed||!playing)return;if(last!==null)time=Math.min(DURATION,time+(stamp-last)/1000);last=stamp;if(time>=DURATION){playing=false;wantsPlay=false;audio.pause();}paint();if(playing)raf=requestAnimationFrame(tick);}
  function run(value){cancelAnimationFrame(raf);playing=value&&!motion.matches&&!document.hidden;last=null;syncAudio();paint();if(playing)raf=requestAnimationFrame(tick);}
  function jump(value,autoplay=false){time=value;started=true;wantsPlay=autoplay;run(autoplay);root.querySelector('[data-player-status]').textContent=`${SCENES[sceneAt(time)].title}. ${autoplay?'Playing.':'Paused.'}`;}
  play.onclick=()=>{started=true;if(time>=DURATION)time=0;wantsPlay=!playing;run(wantsPlay);};
  root.querySelector('[data-replay]').onclick=()=>jump(0,true);
  seek.oninput=()=>jump(Number(seek.value),false);
  chips.forEach(c=>c.onclick=()=>jump(SCENES[Number(c.dataset.scene)].start,false));
  root.querySelector('[data-sound]').onclick=e=>{audio.muted=!audio.muted;e.target.textContent=audio.muted?'Sound off':'Sound on';e.target.setAttribute('aria-label',audio.muted?'Unmute voiceover':'Mute voiceover');};
  function preference(){root.classList.toggle('reduced-motion',motion.matches);if(motion.matches){wantsPlay=false;run(false);}}
  function visibility(){const shouldPlay=wantsPlay&&visible&&!document.hidden;if(shouldPlay!==playing)run(shouldPlay);}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!started&&!motion.matches){started=true;wantsPlay=true;}visibility();},{threshold:.25});
  preference();paint();observer.observe(root.querySelector('.explainer-animation'));motion.addEventListener('change',preference);document.addEventListener('visibilitychange',visibility);
  return ()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();motion.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visibility);audio.pause();};
}
