const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const backendRequire = require('node:module').createRequire(path.resolve(__dirname, '../../backend/package.json'));
process.env.TS_NODE_PROJECT = path.resolve(__dirname, '../../backend/tsconfig.json');
backendRequire('ts-node/register/transpile-only');
const {selectAcceptedContractQuote,acceptedContractTerms}=require('../../backend/src/utils/workflowContract');
const quote={version:1,acceptedAt:'2026-09-29T03:00:00Z',lines:[{label:'Gói A',quantity:30,unitPrice:500000}],depositRequired:3000000,terms:['Hoàn cọc theo thỏa thuận đã duyệt.'],editingTerms:['Hai vòng chỉnh sửa'],delivery:{targetDays:14},proposedSchedule:{shootDate:'2026-10-10',startTime:'08:00',endTime:'10:00',location:'Hà Nội'}};
test('contract uses an accepted version rather than an unaccepted revised price',()=>{
  const proposed={...quote,version:2,acceptedAt:undefined,lines:[{label:'Gói A mới',quantity:30,unitPrice:900000}]};
  const selected=selectAcceptedContractQuote(proposed,[quote]);
  assert.equal(selected.version,1);
  assert.equal(selected.lines[0].unitPrice,500000);
  assert.equal(selectAcceptedContractQuote(proposed,[quote],2),null);
  assert.equal(selectAcceptedContractQuote(proposed,[quote],1).version,1);
  assert.equal(selectAcceptedContractQuote(proposed,[],1),null);
});
test('contract wording contains accepted terms and does not inject legacy cancellation policy',()=>{
  const text=acceptedContractTerms(quote).join('\n');
  assert.match(text,/15[.]000[.]000/);
  assert.match(text,/14 ngày/);
  assert.match(text,/Hai vòng chỉnh sửa/);
  assert.match(text,/Hoàn cọc theo thỏa thuận/);
  assert.doesNotMatch(text,/48 giờ|30 ngày làm việc|không được hoàn lại/);
});