// Requires FFmpeg on PATH. This renders the very same SVG timeline as the page.
import {Resvg} from '@resvg/resvg-js';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {mkdir} from 'node:fs/promises';
import {socialFrame,DURATION} from '../explainer.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const cta=process.argv.find(a=>a.startsWith('--cta='))?.slice(6)||'Enter your club';
if(!['Enter your club','Get notified','Vote now'].includes(cta))throw Error('Choose --cta="Enter your club", --cta="Get notified" or --cta="Vote now".');
const frames=DURATION*24,dir=resolve(root,'assets/video');
await mkdir(dir,{recursive:true});
const output=name=>resolve(dir,`watchvote-championship-${name}.mp4`);
const codec=['-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart','-an'];
const ffmpeg=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','24','-vcodec','png','-i','pipe:0','-filter_complex','[0:v]split=2[feed][vertical];[vertical]pad=1080:1920:0:285:color=0xf8f3ef[reels]','-map','[feed]',...codec,output('feed'),'-map','[reels]',...codec,output('reels')],{stdio:['pipe','inherit','inherit']});
// Attach immediately: early FFmpeg errors must not leave the render pipe waiting.
const completed=once(ffmpeg,'close');
ffmpeg.stdin.on('error',()=>{});
const font={fontFiles:['jost-400.ttf','jost-700.ttf','cormorant-garamond-700.ttf'].map(f=>resolve(root,'tools/fonts',f)),loadSystemFonts:false,defaultFontFamily:'Jost'};
for(let i=0;i<frames;i++){
  const png=new Resvg(socialFrame(i/24,{cta}),{font}).render().asPng();
  if(!ffmpeg.stdin.write(png))await Promise.race([once(ffmpeg.stdin,'drain'),completed.then(()=>{throw Error('FFmpeg ended before rendering completed.');})]);
  if(i%240===0)console.log(`Rendered ${i/24}s / ${DURATION}s`);
}
ffmpeg.stdin.end();
const [code]=await completed;
if(code!==0)throw Error(`FFmpeg exited with ${code}`);
console.log(`Exported ${frames} frames per MP4, 70 seconds including a 2-second end card. CTA: ${cta}`);
