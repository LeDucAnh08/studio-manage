// Read-only deployment audit. Pass MONGO_URI explicitly; never mutates live data.
const path = require('node:path');
const backendRequire = require('node:module').createRequire(path.resolve(__dirname, '../backend/package.json'));
const { MongoClient } = backendRequire('mongodb');
const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const calendarDay = value => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
    : '';
};
async function audit(uri) {
  if (!uri) throw new Error('Set MONGO_URI explicitly for the database to audit');
  const client = new MongoClient(uri, {serverSelectionTimeoutMS:5000});
  try {
    await client.connect();
    const db = client.db();
    const hello = await db.admin().command({hello:1});
    const issues = [];
    if (!hello.setName && hello.msg !== 'isdbgrid') issues.push({code:'TRANSACTIONS_UNAVAILABLE'});
    if (!hello.isWritablePrimary) issues.push({code:'NO_WRITABLE_PRIMARY'});
    const rows = await db.collection('schedules').find({status:{$ne:'cancelled'}}, {projection:{shootDate:1,startTime:1,endTime:1,leadPhotographer:1,supportPhotographers:1,costumes:1,costumeReservations:1,workflowBooking:1,status:1}}).toArray();
    const today = calendarDay(new Date());
    let examined = 0;
    for (const row of rows) {
      const shootDay = calendarDay(row.shootDate);
      const futureReturn = (row.costumeReservations || []).some(r => calendarDay(r.returnDate) >= today);
      if (shootDay && shootDay < today && !futureReturn) continue;
      examined++;
      const id = String(row._id);
      if (!shootDay) issues.push({code:'MISSING_SHOOT_DATE',scheduleId:id});
      if (!validTime(row.startTime) || !validTime(row.endTime) || row.startTime >= row.endTime) issues.push({code:'UNKNOWN_TIME_INTERVAL',scheduleId:id});
      if (!row.leadPhotographer && !(row.supportPhotographers || []).length) issues.push({code:'MISSING_PHOTOGRAPHER',scheduleId:id});
      for (const costume of row.costumes || []) {
        const allocations = (row.costumeReservations || []).filter(r => String(r.costume) === String(costume));
        if (!allocations.length || allocations.some(r => !r.size || !Number.isSafeInteger(r.quantity) || r.quantity < 1 || !calendarDay(r.receiveDate) || !calendarDay(r.returnDate) || new Date(r.receiveDate) > new Date(r.returnDate))) {
          issues.push({code:'UNKNOWN_COSTUME_ALLOCATION',scheduleId:id,costumeId:String(costume)});
        }
      }
    }
    return {ready:issues.length===0,replicaSet:hello.setName || null,examined,issues};
  } finally { await client.close(); }
}
module.exports = { audit };
if (require.main === module) {
  audit(process.env.MONGO_URI).then(result=>{console.log(JSON.stringify(result,null,2));process.exitCode=result.ready?0:2;}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
