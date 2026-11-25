import {escapeXML as esc} from './explainer.mjs';
import {saveState} from './mock.mjs';
export function applicationForm(){
  return `<form id="application-form" class="panel application-form"><p class="notice">This is a demo application. Use fictional details. Nothing is emailed or sent to WatchVote.</p><div class="form-errors" role="alert" tabindex="-1" hidden></div><fieldset><legend>01 / Your club</legend><div class="form-grid">${[['name','Club name','text','Meridian Watch Circle'],['country','Country','text','United Kingdom'],['city','City','text','London'],['members','Approximate member count','number','18']].map(([name,title,type,placeholder])=>`<label class="field">${title}<input name="${name}" type="${type}" ${type==='number'?'min="1" max="100000" step="1"':'maxlength="120"'} placeholder="${placeholder}" required></label>`).join('')}</div><label class="field">Club Instagram <span class="micro">Optional · @handle or instagram.com profile link</span><input name="instagram" type="text" maxlength="160" placeholder="@yourwatchclub"></label><label class="field">Short club description <span class="micro">Up to 280 characters</span><textarea name="description" maxlength="280" rows="4" required aria-describedby="description-count"></textarea><span class="micro" id="description-count">0 / 280</span></label><label class="field">Club logo <span class="micro">Optional · JPG, PNG or WebP · up to 2 MB</span><input name="logo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="logo-help"></label><p class="micro" id="logo-help">No logo yet? Your club will use a monogram crest.</p><img class="logo-preview" alt="Your chosen club logo preview" hidden></fieldset><fieldset><legend>02 / The founder</legend><div class="form-grid"><label class="field">Founder name<input name="founder" autocomplete="off" maxlength="120" required></label><label class="field">Founder email<input name="email" type="email" autocomplete="off" maxlength="254" placeholder="collector@example.com" required></label></div><p class="micro">In the finished championship, approved founders become Club Admins and receive a private Hub invitation. Full WatchVote registration will be required.</p></fieldset><button class="button" type="submit">Send demo application <span aria-hidden="true">↗</span></button></form>`;
}
export function validateApplication(values){
  const data={},errors={};
  for(const key of ['name','country','city','founder','email','instagram','description'])data[key]=String(values[key]||'').trim();
  for(const [key,title] of [['name','Club name'],['country','Country'],['city','City'],['founder','Founder name'],['description','Description']]){
    const max=key==='description'?280:120;
    if(!data[key]||data[key].length>max)errors[key]=`${title} must contain 1 to ${max} characters.`;
  }
  if(data.email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email))errors.email='Enter a valid founder email.';
  data.members=Number(values.members);
  if(!Number.isInteger(data.members)||data.members<1||data.members>100000)errors.members='Enter a whole member count from 1 to 100,000.';
  if(data.instagram&&!/^(?:@[\w.]{1,30}|(?:https?:\/\/)?(?:www\.)?instagram\.com\/[\w.]{1,30}\/?(?:\?[^\s]*)?)$/i.test(data.instagram))errors.instagram='Use an @handle or an Instagram profile link.';
  return {data,errors};
}
export function saveApplication(state,storage,data,submittedAt){
  const application={...data,id:`WV-2027-${state.nextId}`,submittedAt,status:'applied'};
  state.applications.push(application);state.nextId++;
  const error=saveState(storage,state);
  if(error){state.applications.pop();state.nextId--;throw Error('Your application was not saved because browser storage is unavailable or full. Your details are still in this form. Free up browser storage or try another browser, then submit again.');}
  return application;
}
export async function readLogo(file){
  if(!file?.size)return null;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choose a JPG, PNG or WebP logo.');
  if(file.size>2*1024*1024)throw Error('The logo must be 2 MB or smaller.');
  let image;
  try{
    image=await createImageBitmap(file);
    if(image.width>12000||image.height>12000)throw Error('This logo is too large. Resize it to under 12,000 pixels per side.');
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
    const scale=Math.min(240/image.width,240/image.height),w=image.width*scale,h=image.height*scale;
    ctx.drawImage(image,(256-w)/2,(256-h)/2,w,h);
    return canvas.toDataURL('image/jpeg',.85);
  }catch(error){throw Error(error.message.includes('12,000')?error.message:'The logo could not be read. Try a different JPG, PNG or WebP.');}
  finally{image?.close();}
}
export function applicationConfirmation(application){
  return `<section class="container section application-received"><span class="receipt-check" aria-hidden="true">✓</span><p class="eyebrow">Club entry / 2027</p><h1>Application received.</h1><p class="receipt-name">${esc(application.name)}</p><p>Thank you for bringing your people. Your demo application is waiting for review.</p><p class="micro">Reference ${esc(application.id)} · Saved in this browser only.</p><ol class="receipt-steps"><li><strong>WatchVote reviews the club.</strong><span>The application is now in the demo admin queue.</span></li><li><strong>The founder becomes Club Admin.</strong><span>After approval, the finished service will send a private Club Hub invite.</span></li><li><strong>Your members join. Hub Week begins.</strong><span>Everyone uses a full WatchVote registration.</span></li></ol><p class="notice">No email was sent. Invitations and real registration arrive with the backend.</p><a class="button" href="#home">Back to the championship ↗</a></section>`;
}
