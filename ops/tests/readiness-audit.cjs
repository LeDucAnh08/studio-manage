const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const backendRequire = require('node:module').createRequire(path.resolve(__dirname, '../../backend/package.json'));
const {MongoClient,ObjectId} = backendRequire('mongodb');
const { audit } = require('../audit-workflow-readiness.cjs');
test('readiness audit identifies legacy gaps without writing to the database',async()=>{
  const uri = new URL(process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27028/?replicaSet=rs0&directConnection=true');
  assert.ok(['127.0.0.1','localhost'].includes(uri.hostname));
  uri.pathname='/studio_workflow_readiness_audit';
  const client=await MongoClient.connect(uri.toString());
  const db=client.db('studio_workflow_readiness_audit');
  try {
    await db.dropDatabase();
    const empty=await audit(uri.toString());
    assert.equal(empty.ready,true);
    const costume=new ObjectId(), photographer=new ObjectId();
    const shootDate=new Date(Date.now()+7*86400000);
    const result=await db.collection('schedules').insertOne({status:'confirmed',shootDate,costumes:[costume]});
    const before=await db.collection('schedules').findOne({_id:result.insertedId});
    const missing=await audit(uri.toString());
    assert.equal(missing.ready,false);
    assert.deepEqual(missing.issues.map(i=>i.code).sort(),['MISSING_PHOTOGRAPHER','UNKNOWN_COSTUME_ALLOCATION','UNKNOWN_TIME_INTERVAL']);
    assert.deepEqual(await db.collection('schedules').findOne({_id:result.insertedId}),before);
    await db.collection('schedules').updateOne({_id:result.insertedId},{$set:{startTime:'08:00',endTime:'10:00',leadPhotographer:photographer,costumeReservations:[{costume,size:'M',quantity:1,receiveDate:shootDate,returnDate:shootDate}]}});
    assert.equal((await audit(uri.toString())).ready,true);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const boundary=await db.collection('schedules').insertOne({status:'confirmed',shootDate:new Date(`${today}T00:00:00+07:00`),leadPhotographer:photographer,costumes:[]});
    const boundaryAudit=await audit(uri.toString());
    assert.equal(boundaryAudit.examined,2,'Today in Vietnam must not be skipped as yesterday in UTC');
    assert.ok(boundaryAudit.issues.some(issue=>issue.scheduleId===String(boundary.insertedId)&&issue.code==='UNKNOWN_TIME_INTERVAL'));
  } finally { await db.dropDatabase(); await client.close(); }
});
