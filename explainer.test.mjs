import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneAt,socialFrame,visualSVG} from './explainer.mjs';
import {validateApplication} from './applications.mjs';

test('the seven storyboard scenes change at the specified second, with a two-second end card',()=>{
  for(const [time,scene] of [[0,0],[5.99,0],[6,1],[14,2],[24,3],[34,4],[42,5],[60,6],[70,6]])assert.equal(sceneAt(time),scene);
  assert.doesNotMatch(socialFrame(67.99),/>watchvote.com</);
  assert.match(socialFrame(68),/>watchvote.com</);
  assert.match(socialFrame(69,{cta:'Vote now'}),/>Vote now</);
});
test('the explainer follows configured eight-club rounds without leaking the unused Open theme',()=>{
  const rounds=[{name:'Quarterfinals',theme:'Vintage'},{name:'Semifinals',theme:'Independent'},{name:'Final',theme:'Mainstream'}];
  assert.match(visualSVG(42,{rounds}),/QUARTERFINALS · VINTAGE/);
  assert.match(visualSVG(48,{rounds}),/SEMIFINALS · INDEPENDENT/);
  assert.match(visualSVG(54,{rounds}),/FINAL · MAINSTREAM/);
  assert.doesNotMatch(visualSVG(42,{rounds}),/ROUND OF 16/);
});
const entry={name:' Test Club ',country:'Japan',city:'Tokyo',founder:'Demo Founder',email:'founder@example.com',members:'18',instagram:'@test.club',description:'A fictional collectors club.'};
test('applications trim required fields, reject whitespace and invalid counts, and keep optional Instagram optional',()=>{
  const valid=validateApplication({...entry,instagram:''});assert.deepEqual(valid.errors,{});assert.equal(valid.data.name,'Test Club');assert.equal(valid.data.members,18);
  for(const members of ['0','-1','1.5','NaN','100001'])assert.ok(validateApplication({...entry,members}).errors.members);
  const {errors}=validateApplication({...entry,name:'   ',email:'invalid',description:'x'.repeat(281),instagram:'https://example.com/not-instagram'});
  for(const key of ['name','email','description','instagram'])assert.ok(errors[key]);
});
