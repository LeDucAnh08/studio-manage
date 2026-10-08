// Read-only: native driver only; never import Mongoose models (auto-index writes).
const path = require('node:path');
const fs = require('node:fs/promises');
const r = require('node:module').createRequire(path.resolve(__dirname, '../backend/package.json'));
const { MongoClient, ObjectId } = r('mongodb');
const DAY = 86400000;
const key = (value) => {
  const text =
    typeof value === 'string' ? value : value instanceof ObjectId ? value.toHexString() : '';
  return /^[a-f\d]{24}$/i.test(text) ? text.toLowerCase() : '';
};
const validDate = (value) => value instanceof Date && Number.isFinite(+value);
const day = (value) => (validDate(value) ? Math.floor((+value + 25200000) / DAY) : null);
const money = (value) => Number.isSafeInteger(value) && value >= 0;
const validTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const time = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
const array = (value) => (Array.isArray(value) ? value : []);
const net = (payments) =>
  array(payments).reduce((sum, p) => sum + (p.kind === 'refund' ? -p.amount : p.amount), 0);
const indexes = [
  ['bookingworkflows', { booking: 1 }, {}],
  ['rentalorders', { client: 1, creationKey: 1 }, {}],
  ['schedules', { workflowBooking: 1 }, { sparse: true }],
  ['transactions', { workflowBooking: 1, workflowPayment: 1 }, { sparse: true }],
  ['transactions', { rentalOrder: 1, rentalPayment: 1 }, { sparse: true }],
  [
    'bookings',
    { client: 1, clientRequestId: 1 },
    { partialFilterExpression: { clientRequestId: { $type: 'string' } } },
  ],
];
const sizes = new Set([
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'FREE',
  ...Array.from({ length: 10 }, (_, n) => String(n + 36)),
]);
function validateUri(uri) {
  if (!uri || typeof uri !== 'string')
    throw new Error('Set MONGO_URI explicitly, including a database name.');
  // URL is not used: MongoDB supports multiple hosts and escaped credentials.
  const match = /^mongodb(?:\+srv)?:\/\/[^/?]+\/([^/?]+)(?:\?.*)?$/.exec(uri);
  if (!match || !match[1].trim())
    throw new Error('MONGO_URI must include an explicit database name.');
}
async function audit(uri, { now = new Date() } = {}) {
  validateUri(uri);
  if (!validDate(now)) throw new Error('Audit time must be a valid Date.');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db(),
      hello = await db.admin().command({ hello: 1 });
    const today = day(now),
      findings = new Map();
    const add = (code, severity, example = {}) => {
      if (!findings.has(code)) findings.set(code, { code, severity, count: 0, examples: [] });
      const issue = findings.get(code);
      issue.count++;
      if (issue.examples.length < 20) issue.examples.push(example);
    };
    const block = (code, detail) => add(code, 'blocker', detail);
    const warn = (code, detail) => add(code, 'warning', detail);
    if (!hello.setName && hello.msg !== 'isdbgrid') block('TRANSACTIONS_UNAVAILABLE');
    if (!hello.isWritablePrimary) block('NO_WRITABLE_PRIMARY');
    for (const [collection, keys, options] of indexes) {
      let actual = [];
      try {
        actual = await db.collection(collection).listIndexes().toArray();
      } catch (e) {
        if (e.code !== 26) throw e;
      }
      if (
        !actual.some(
          (i) =>
            i.unique === true &&
            JSON.stringify(i.key) === JSON.stringify(keys) &&
            Object.entries(options).every(([k, v]) => JSON.stringify(i[k]) === JSON.stringify(v)),
        )
      )
        block('MISSING_UNIQUE_INDEX', { collection, keys });
    }
    const [costumes, users, schedules, workflows, rentals, bookings, transactions] =
      await Promise.all([
        db
          .collection('costumes')
          .find({}, { projection: { inventory: 1, isRentalItem: 1 } })
          .toArray(),
        db
          .collection('users')
          .find({}, { projection: { roles: 1, isActive: 1 } })
          .toArray(),
        db
          .collection('schedules')
          .find(
            {},
            {
              projection: {
                status: 1,
                customer: 1,
                workflowBooking: 1,
                shootDate: 1,
                startTime: 1,
                endTime: 1,
                location: 1,
                costumes: 1,
                costumeReservations: 1,
                leadPhotographer: 1,
                supportPhotographers: 1,
              },
            },
          )
          .toArray(),
        db
          .collection('bookingworkflows')
          .find(
            {},
            {
              projection: {
                booking: 1,
                lifecycle: 1,
                customer: 1,
                'quote.version': 1,
                'quote.acceptedAt': 1,
                'quote.lines': 1,
                'quote.depositRequired': 1,
                'quote.proposedSchedule': 1,
                'payments._id': 1,
                'payments.kind': 1,
                'payments.amount': 1,
                'payments.receivedAt': 1,
                'payments.transaction': 1,
                resources: 1,
                'progress.status': 1,
                'progress.acceptedAt': 1,
                'progress.deliveryVersion': 1,
                'progress.acceptedDeliveryVersion': 1,
                'changeRequest.kind': 1,
                'changeRequest.status': 1,
                'changeRequest.finalPayable': 1,
                'changeRequest.acceptedAt': 1,
              },
            },
          )
          .toArray(),
        db
          .collection('rentalorders')
          .find(
            {},
            {
              projection: {
                client: 1,
                status: 1,
                'quote.version': 1,
                'quote.acceptedAt': 1,
                'quote.fee': 1,
                'quote.deposit': 1,
                'quote.receiveDate': 1,
                'quote.returnDate': 1,
                'quote.lines.costumeId': 1,
                'quote.lines.size': 1,
                'quote.lines.quantity': 1,
                'quote.lines.unitPrice': 1,
                'quoteHistory.acceptedAt': 1,
                'quoteHistory.fee': 1,
                'quoteHistory.deposit': 1,
                'quoteHistory.receiveDate': 1,
                'quoteHistory.returnDate': 1,
                'payments._id': 1,
                'payments.kind': 1,
                'payments.amount': 1,
                'payments.at': 1,
                'payments.transaction': 1,
                checkedOutAt: 1,
                returnedAt: 1,
                returns: 1,
                'settlement.total': 1,
                'settlement.acceptedAt': 1,
                'settlement.charges.amount': 1,
                'change.kind': 1,
                'change.status': 1,
                'change.finalFee': 1,
                'change.acceptedAt': 1,
              },
            },
          )
          .toArray(),
        db
          .collection('bookings')
          .find({}, { projection: { client: 1 } })
          .toArray(),
        db
          .collection('transactions')
          .find(
            {},
            {
              projection: {
                type: 1,
                amount: 1,
                date: 1,
                workflowBooking: 1,
                workflowPayment: 1,
                rentalOrder: 1,
                rentalPayment: 1,
              },
            },
          )
          .toArray(),
      ]);
    // Sanitize only in-memory projected data, so malformed legacy containers yield
    // blockers instead of exceptions or a false clean result. Never echo raw values.
    const object = (v) =>
      v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
    const checkRows = (record, field, context, objects = true) => {
      if (record[field] === undefined) {
        record[field] = [];
        return;
      }
      if (!Array.isArray(record[field])) {
        block('INVALID_DATA_SHAPE', { ...context, field });
        record[field] = [];
        return;
      }
      record[field] = record[field].filter((row) => {
        if (objects && !object(row)) {
          block('INVALID_DATA_SHAPE', { ...context, field });
          return false;
        }
        if (objects && 'size' in row && !sizes.has(row.size)) {
          block('INVALID_SIZE', { ...context, field });
          row.size = undefined;
        }
        return true;
      });
    };
    for (const [collection, docs] of [
      ['costumes', costumes],
      ['users', users],
      ['schedules', schedules],
      ['bookingworkflows', workflows],
      ['rentalorders', rentals],
    ]) {
      for (const doc of docs) {
        const context = { collection, recordId: key(doc._id) };
        if (!key(doc._id)) block('INVALID_DOCUMENT_ID', { collection });
        const fields =
          collection === 'costumes'
            ? ['inventory']
            : collection === 'schedules'
              ? ['costumeReservations']
              : ['bookingworkflows', 'rentalorders'].includes(collection)
                ? ['payments']
                : [];
        for (const field of fields) checkRows(doc, field, context);
        const refs =
          collection === 'users'
            ? ['roles']
            : collection === 'schedules'
              ? ['costumes', 'supportPhotographers']
              : [];
        for (const field of refs) checkRows(doc, field, context, false);
        if (collection === 'rentalorders') {
          checkRows(doc, 'returns', context);
          checkRows(doc, 'quoteHistory', context);
        }
        if (['bookingworkflows', 'rentalorders'].includes(collection)) {
          for (const field of collection === 'bookingworkflows'
            ? ['quote', 'resources', 'progress', 'changeRequest']
            : ['quote', 'settlement', 'change']) {
            if (doc[field] == null) continue;
            if (!object(doc[field])) {
              block('INVALID_DATA_SHAPE', { ...context, field });
              doc[field] = undefined;
              continue;
            }
            if (field === 'quote')
              checkRows(doc[field], 'lines', { ...context, field: 'quote.lines' });
            if (field === 'resources') {
              checkRows(doc[field], 'costumes', context);
              checkRows(doc[field], 'photographers', context, false);
            }
            if (field === 'settlement') checkRows(doc[field], 'charges', context);
          }
        }
      }
    }
    const map = (rows, field = '_id') =>
      new Map(rows.map((row) => [key(row[field]), row]).filter(([id]) => id));
    const costumeMap = map(costumes),
      userMap = map(users),
      scheduleMap = map(schedules),
      bookingMap = map(bookings),
      workflowMap = map(workflows, 'booking'),
      rentalMap = map(rentals),
      txMap = map(transactions);
    const stock = new Map(),
      holds = new Map(),
      photographers = new Map();
    for (const c of costumes) {
      for (const row of array(c.inventory)) {
        if (
          !row.size ||
          !money(row.quantity) ||
          !['good', 'repair', 'damaged', 'retired'].includes(row.condition)
        ) {
          block('INVALID_INVENTORY', { costumeId: key(c._id) });
          continue;
        }
        if (row.condition === 'good') {
          const k = `${key(c._id)}:${row.size}`;
          stock.set(k, (stock.get(k) ?? 0) + row.quantity);
        }
      }
    }
    const hold = (costume, size, quantity, start, end, source, id) => {
      if (end < today) return;
      const k = `${costume}:${size}`;
      if (!holds.has(k)) holds.set(k, []);
      holds.get(k).push({ start: Math.max(start, today), end, quantity, source, id });
    };
    const normalizeAllocations = (rows, idField) =>
      array(rows)
        .map((l) =>
          [key(l[idField]), l.size, l.quantity, day(l.receiveDate), day(l.returnDate)].join('|'),
        )
        .sort();
    for (const s of schedules) {
      if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(s.status))
        block('INVALID_SCHEDULE_STATUS', { scheduleId: key(s._id) });
      if (s.status === 'cancelled') continue;
      const shoot = day(s.shootDate),
        rows = array(s.costumeReservations);
      if (shoot !== null && shoot < today && !rows.some((l) => day(l.returnDate) >= today))
        continue;
      const detail = { scheduleId: key(s._id) };
      if (shoot === null) block('INVALID_SHOOT_DATE', detail);
      const timeOK = validTime(s.startTime) && validTime(s.endTime) && s.startTime < s.endTime;
      if ((shoot === null || shoot >= today) && ['pending', 'confirmed'].includes(s.status)) {
        if (!timeOK) block('UNKNOWN_TIME_INTERVAL', detail);
        const assigned = [s.leadPhotographer, ...array(s.supportPhotographers)]
          .filter(Boolean)
          .map(key);
        if (!assigned.length) block('MISSING_PHOTOGRAPHER', detail);
        if (new Set(assigned).size !== assigned.length) block('DUPLICATE_PHOTOGRAPHER', detail);
        for (const id of new Set(assigned)) {
          const u = userMap.get(id);
          if (!u || !u.isActive || !array(u.roles).includes(3))
            block('INVALID_PHOTOGRAPHER', { ...detail, userId: id });
          if (shoot !== null && timeOK) {
            const k = `${id}:${shoot}`;
            if (!photographers.has(k)) photographers.set(k, []);
            photographers
              .get(k)
              .push({ id: key(s._id), start: time(s.startTime), end: time(s.endTime) });
          }
        }
      }
      const selected = new Set(array(s.costumes).map(key)),
        seen = new Set();
      for (const id of selected)
        if (!rows.some((l) => key(l.costume) === id))
          block('UNKNOWN_COSTUME_ALLOCATION', { ...detail, costumeId: id });
      for (const l of rows) {
        const id = key(l.costume),
          pair = `${id}:${l.size}`,
          start = day(l.receiveDate),
          end = day(l.returnDate);
        if (seen.has(pair))
          block('DUPLICATE_COSTUME_ALLOCATION', { ...detail, costumeId: id, size: l.size });
        seen.add(pair);
        if (!costumeMap.has(id) || !selected.has(id))
          block('INVALID_COSTUME_REFERENCE', { ...detail, costumeId: id });
        if (
          !l.size ||
          !money(l.quantity) ||
          l.quantity < 1 ||
          start === null ||
          end === null ||
          start > end ||
          (shoot !== null && (start > shoot || end < shoot))
        ) {
          block('INVALID_COSTUME_ALLOCATION', { ...detail, costumeId: id });
          continue;
        }
        hold(id, l.size, l.quantity, start, end, 'schedule', key(s._id));
      }
      if (s.workflowBooking) {
        const w = workflowMap.get(key(s.workflowBooking));
        if (!w || key(w.resources?.schedule) !== key(s._id))
          block('ORPHAN_WORKFLOW_SCHEDULE', detail);
      }
    }
    for (const [k, rows] of photographers) {
      rows.sort((a, b) => a.start - b.start);
      for (let i = 0; i < rows.length; i++)
        for (let j = i + 1; j < rows.length && rows[j].start < rows[i].end; j++)
          block('PHOTOGRAPHER_COLLISION', {
            userId: k.split(':')[0],
            scheduleIds: [rows[i].id, rows[j].id],
          });
    }
    const expectedPayments = new Map();
    const checkPayments = (record, service, ownerId) => {
      const seen = new Set();
      for (const p of array(record.payments)) {
        const detail = { service, recordId: key(record._id), paymentId: key(p._id) };
        if (!p._id || seen.has(key(p._id))) block('DUPLICATE_OR_MISSING_PAYMENT_ID', detail);
        seen.add(key(p._id));
        if (!money(p.amount) || p.amount < 1 || !['deposit', 'balance', 'refund'].includes(p.kind))
          block('INVALID_PAYMENT', detail);
        const at = service === 'photography' ? p.receivedAt : p.at;
        if (!validDate(at)) block('INVALID_PAYMENT_DATE', detail);
        const tx = txMap.get(key(p.transaction));
        const ownerField = service === 'photography' ? 'workflowBooking' : 'rentalOrder',
          paymentField = service === 'photography' ? 'workflowPayment' : 'rentalPayment';
        if (!tx) block('PAYMENT_TRANSACTION_MISSING', detail);
        else if (
          key(tx[ownerField]) !== ownerId ||
          key(tx[paymentField]) !== key(p._id) ||
          tx.amount !== p.amount ||
          tx.type !== (p.kind === 'refund' ? 'expense' : 'income')
        )
          block('PAYMENT_TRANSACTION_MISMATCH', { ...detail, transactionId: key(tx._id) });
        else if (day(at) !== day(tx.date))
          block('PAYMENT_DATE_MISMATCH', { ...detail, transactionId: key(tx._id) });
        const paymentKey = `${service}:${ownerId}:${key(p._id)}`;
        if (expectedPayments.has(paymentKey)) block('DUPLICATE_PAYMENT_LINK', detail);
        expectedPayments.set(paymentKey, key(p.transaction));
      }
    };
    for (const w of workflows) {
      const detail = { workflowId: key(w._id), bookingId: key(w.booking) },
        b = bookingMap.get(key(w.booking));
      if (!b) block('WORKFLOW_BOOKING_MISSING', detail);
      else if (!userMap.has(key(b.client)) || !array(userMap.get(key(b.client)).roles).includes(6))
        block('INVALID_CLIENT_OWNER', detail);
      checkPayments(w, 'photography', key(w.booking));
      const quote = w.quote,
        accepted = validDate(quote?.acceptedAt);
      if (
        ![
          'intake',
          'quoting',
          'awaiting_deposit',
          'ready_to_confirm',
          'confirmed',
          'shooting',
          'editing',
          'delivered',
          'revision_requested',
          'accepted',
          'completed',
          'change_pending',
          'cancelled',
        ].includes(w.lifecycle)
      )
        block('INVALID_WORKFLOW_STATUS', detail);
      if (
        [
          'awaiting_deposit',
          'ready_to_confirm',
          'confirmed',
          'shooting',
          'editing',
          'delivered',
          'revision_requested',
          'accepted',
          'completed',
          'change_pending',
          'cancelled',
        ].includes(w.lifecycle) &&
        !accepted
      )
        block('WORKFLOW_WITHOUT_ACCEPTED_QUOTE', detail);
      const quoted = array(quote?.lines).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
      const applied = w.changeRequest?.status === 'applied';
      const fee =
        applied && money(w.changeRequest.finalPayable) ? w.changeRequest.finalPayable : quoted;
      if (
        (accepted &&
          (!Number.isSafeInteger(quote.version) ||
            quote.version < 1 ||
            !array(quote.lines).length ||
            array(quote.lines).some(
              (l) => !money(l.unitPrice) || !Number.isSafeInteger(l.quantity) || l.quantity < 1,
            ) ||
            !money(quoted) ||
            !money(quote.depositRequired) ||
            quote.depositRequired > quoted)) ||
        (applied && !money(w.changeRequest.finalPayable))
      )
        block('INVALID_PHOTOGRAPHY_QUOTE', detail);
      if (array(w.payments).length && !accepted) block('PAYMENT_WITHOUT_ACCEPTED_QUOTE', detail);
      const s = scheduleMap.get(key(w.resources?.schedule));
      if (w.resources?.schedule && (!s || key(s.workflowBooking) !== key(w.booking)))
        block('WORKFLOW_SCHEDULE_MISSING', detail);
      if (s && w.lifecycle === 'cancelled' && s.status !== 'cancelled')
        block('CANCELLED_WORKFLOW_HOLDS_RESOURCES', detail);
      if (s && w.lifecycle !== 'cancelled') {
        const assigned = [s.leadPhotographer, ...array(s.supportPhotographers)]
          .filter(Boolean)
          .map(key)
          .sort();
        if (
          s.status === 'cancelled' ||
          key(s.customer) !== key(w.customer) ||
          JSON.stringify(assigned) !==
            JSON.stringify(array(w.resources?.photographers).map(key).sort()) ||
          JSON.stringify(normalizeAllocations(s.costumeReservations, 'costume')) !==
            JSON.stringify(normalizeAllocations(w.resources?.costumes, 'costumeId'))
        )
          block('WORKFLOW_RESOURCE_MISMATCH', detail);
        if (
          !accepted ||
          day(s.shootDate) !== day(quote?.proposedSchedule?.shootDate) ||
          s.startTime !== quote?.proposedSchedule?.startTime ||
          s.endTime !== quote?.proposedSchedule?.endTime ||
          s.location !== quote?.proposedSchedule?.location
        )
          block('WORKFLOW_QUOTE_SCHEDULE_MISMATCH', detail);
      }
      if (
        w.lifecycle === 'cancelled' &&
        (w.changeRequest?.kind !== 'cancel' ||
          !applied ||
          !validDate(w.changeRequest?.acceptedAt) ||
          !money(w.changeRequest?.finalPayable) ||
          w.changeRequest.finalPayable > quoted)
      )
        block('INVALID_PHOTOGRAPHY_CANCELLATION', detail);
      if (s && s.status !== 'cancelled' && accepted && net(w.payments) < quote.depositRequired)
        block('PHOTOGRAPHY_DEPOSIT_SHORTFALL', detail);
      if (
        [
          'confirmed',
          'shooting',
          'editing',
          'delivered',
          'revision_requested',
          'accepted',
          'completed',
        ].includes(w.lifecycle) &&
        !s
      )
        block('WORKFLOW_SCHEDULE_MISSING', detail);
      if (
        w.lifecycle === 'completed' &&
        (!validDate(w.progress?.acceptedAt) ||
          w.progress.status !== 'delivered' ||
          !Number.isSafeInteger(w.progress.deliveryVersion) ||
          w.progress.deliveryVersion < 1 ||
          w.progress.acceptedDeliveryVersion !== w.progress.deliveryVersion ||
          net(w.payments) !== fee)
      )
        block('INVALID_PHOTOGRAPHY_COMPLETION', detail);
      if (accepted && net(w.payments) < fee)
        warn('OUTSTANDING_PAYMENT', {
          ...detail,
          service: 'photography',
          amount: fee - net(w.payments),
        });
      if (applied && net(w.payments) > fee)
        warn('OUTSTANDING_REFUND', {
          ...detail,
          service: 'photography',
          amount: net(w.payments) - fee,
        });
    }
    for (const o of rentals) {
      const detail = { rentalOrderId: key(o._id) },
        quote = o.quote,
        accepted = validDate(quote?.acceptedAt),
        active = ['confirmed', 'checked_out'].includes(o.status);
      const owner = userMap.get(key(o.client));
      if (!owner || !array(owner.roles).includes(6)) block('INVALID_CLIENT_OWNER', detail);
      checkPayments(o, 'rental', key(o._id));
      if (
        ![
          'requested',
          'quoting',
          'awaiting_deposit',
          'ready_to_confirm',
          'confirmed',
          'checked_out',
          'returned',
          'completed',
          'cancelled',
          'rejected',
        ].includes(o.status)
      )
        block('INVALID_RENTAL_STATUS', detail);
      const start = day(quote?.receiveDate),
        end = day(quote?.returnDate),
        lines = array(quote?.lines);
      const goodQuote =
        accepted &&
        Number.isSafeInteger(quote.version) &&
        quote.version > 0 &&
        money(quote.fee) &&
        money(quote.deposit) &&
        start !== null &&
        end !== null &&
        end >= start &&
        end - start <= 365 &&
        lines.length > 0;
      if (accepted && !goodQuote) block('INVALID_RENTAL_QUOTE', detail);
      if (
        ([
          'awaiting_deposit',
          'ready_to_confirm',
          'confirmed',
          'checked_out',
          'returned',
          'completed',
        ].includes(o.status) ||
          array(o.payments).length) &&
        !accepted
      )
        block('RENTAL_WITHOUT_ACCEPTED_QUOTE', detail);
      const seen = new Set();
      for (const l of lines) {
        const id = key(l.costumeId),
          pair = `${id}:${l.size}`,
          c = costumeMap.get(id);
        if (seen.has(pair)) block('DUPLICATE_RENTAL_LINE', { ...detail, costumeId: id });
        seen.add(pair);
        if (!l.size || !money(l.quantity) || l.quantity < 1 || !money(l.unitPrice)) {
          block('INVALID_RENTAL_LINE', detail);
          continue;
        }
        if (active && (!c || !c.isRentalItem))
          block('INVALID_RENTAL_COSTUME_REFERENCE', { ...detail, costumeId: id });
        if (active && goodQuote)
          hold(
            id,
            l.size,
            l.quantity,
            start,
            o.status === 'checked_out' && end < today ? Infinity : end,
            'rental',
            key(o._id),
          );
      }
      if (goodQuote && quote.fee < lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0))
        block('INVALID_RENTAL_FEE', detail);
      if (o.status === 'confirmed' && goodQuote && net(o.payments) < quote.deposit)
        block('RENTAL_DEPOSIT_SHORTFALL', detail);
      if (['checked_out', 'returned', 'completed'].includes(o.status) && !validDate(o.checkedOutAt))
        block('RENTAL_HANDOVER_DATE_MISSING', detail);
      if (validDate(o.checkedOutAt)) {
        const original = [...array(o.quoteHistory), quote]
          .filter((q) => q && validDate(q.acceptedAt) && q.acceptedAt <= o.checkedOutAt)
          .sort((a, b) => +b.acceptedAt - +a.acceptedAt)[0];
        if (!original) warn('RENTAL_HANDOVER_HISTORY_UNVERIFIED', detail);
        else if (
          !money(original.fee) ||
          !money(original.deposit) ||
          day(original.receiveDate) === null ||
          day(original.returnDate) === null ||
          day(original.receiveDate) > day(original.returnDate)
        )
          block('INVALID_RENTAL_HANDOVER_QUOTE', detail);
        else {
          const receivedAtHandover = net(
            array(o.payments).filter((p) => validDate(p.at) && p.at <= o.checkedOutAt),
          );
          if (receivedAtHandover !== original.fee + original.deposit)
            block('RENTAL_HANDOVER_PAYMENT_MISMATCH', detail);
          if (
            day(original.receiveDate) === null ||
            day(original.returnDate) === null ||
            day(o.checkedOutAt) < day(original.receiveDate) ||
            day(o.checkedOutAt) > day(original.returnDate)
          )
            block('RENTAL_HANDOVER_OUTSIDE_PERIOD', detail);
        }
      }
      if (
        (o.checkedOutAt && (!validDate(o.checkedOutAt) || o.checkedOutAt > now)) ||
        (o.returnedAt && (!validDate(o.returnedAt) || o.returnedAt > now)) ||
        ([
          'requested',
          'quoting',
          'awaiting_deposit',
          'ready_to_confirm',
          'confirmed',
          'cancelled',
          'rejected',
        ].includes(o.status) &&
          (o.checkedOutAt || o.returnedAt)) ||
        (o.status === 'checked_out' && o.returnedAt)
      )
        block('RENTAL_STATUS_DATE_MISMATCH', detail);
      if (o.status === 'checked_out' && end !== null && end < today) warn('OVERDUE_RENTAL', detail);
      if (o.status === 'confirmed' && end !== null && end < today)
        warn('MISSED_RENTAL_HANDOVER', detail);
      const returned = ['returned', 'completed'].includes(o.status),
        settlementAccepted = validDate(o.settlement?.acceptedAt);
      if (returned) {
        if (
          !validDate(o.returnedAt) ||
          (validDate(o.checkedOutAt) && o.returnedAt < o.checkedOutAt)
        )
          block('INVALID_RENTAL_RETURN_DATE', detail);
        const returns = new Map();
        for (const row of array(o.returns)) {
          const pair = `${key(row.costumeId)}:${row.size}`;
          if (returns.has(pair) || ![row.good, row.damaged, row.lost].every(money))
            block('INVALID_RENTAL_RETURN', detail);
          returns.set(pair, row.good + row.damaged + row.lost);
        }
        if (
          returns.size !== lines.length ||
          lines.some((l) => returns.get(`${key(l.costumeId)}:${l.size}`) !== l.quantity)
        )
          block('RENTAL_RETURN_QUANTITY_MISMATCH', detail);
        if (!settlementAccepted) warn('RENTAL_AWAITING_SETTLEMENT', detail);
      }
      if (
        settlementAccepted &&
        (!returned ||
          !money(o.settlement.total) ||
          array(o.settlement.charges).some((c) => !money(c.amount)) ||
          o.settlement.total !==
            quote?.fee + array(o.settlement.charges).reduce((sum, c) => sum + c.amount, 0))
      )
        block('INVALID_RENTAL_SETTLEMENT', detail);
      const cancelled = o.status === 'cancelled';
      if (
        cancelled &&
        (o.change?.kind !== 'cancel' ||
          o.change?.status !== 'applied' ||
          !money(o.change?.finalFee) ||
          (!accepted && o.change?.finalFee !== 0) ||
          (accepted && (!validDate(o.change.acceptedAt) || o.change.finalFee > quote.fee)) ||
          o.checkedOutAt)
      )
        block('INVALID_RENTAL_CANCELLATION', detail);
      const fee = cancelled
        ? o.change?.finalFee
        : settlementAccepted
          ? o.settlement.total
          : quote?.fee;
      const payable = cancelled || returned ? fee : accepted ? quote.fee + quote.deposit : 0;
      if (o.status === 'completed' && (!returned || !settlementAccepted || net(o.payments) !== fee))
        block('INVALID_RENTAL_COMPLETION', detail);
      if (accepted && money(payable) && net(o.payments) < payable)
        warn('OUTSTANDING_PAYMENT', {
          ...detail,
          service: 'rental',
          amount: payable - net(o.payments),
        });
      if ((cancelled || settlementAccepted) && money(payable) && net(o.payments) > payable)
        warn('OUTSTANDING_REFUND', {
          ...detail,
          service: 'rental',
          amount: net(o.payments) - payable,
        });
    }
    for (const tx of transactions) {
      const detail = { transactionId: key(tx._id) };
      if (
        typeof tx.amount !== 'number' ||
        !Number.isFinite(tx.amount) ||
        tx.amount < 0 ||
        !['income', 'expense'].includes(tx.type) ||
        !validDate(tx.date)
      )
        block('INVALID_TRANSACTION', detail);
      const photo = !!(tx.workflowBooking || tx.workflowPayment),
        rental = !!(tx.rentalOrder || tx.rentalPayment);
      if (!photo && !rental) {
        warn('UNCLASSIFIED_TRANSACTION', detail);
        continue;
      }
      if (photo && rental) {
        block('TRANSACTION_DUAL_SERVICE_LINK', detail);
        continue;
      }
      const service = photo ? 'photography' : 'rental',
        ownerId = key(photo ? tx.workflowBooking : tx.rentalOrder),
        paymentId = key(photo ? tx.workflowPayment : tx.rentalPayment);
      if (!ownerId || !paymentId) block('TRANSACTION_PARTIAL_LINK', detail);
      else if (
        !(photo ? workflowMap : rentalMap).has(ownerId) ||
        expectedPayments.get(`${service}:${ownerId}:${paymentId}`) !== key(tx._id)
      )
        block('TRANSACTION_ORPHAN_PAYMENT', detail);
    }
    for (const [pair, rows] of holds) {
      const events = new Map();
      for (const h of rows) {
        events.set(h.start, (events.get(h.start) ?? 0) + h.quantity);
        if (Number.isFinite(h.end))
          events.set(h.end + 1, (events.get(h.end + 1) ?? 0) - h.quantity);
      }
      let used = 0,
        peak = 0,
        peakDay = today;
      for (const [d, delta] of [...events].sort((a, b) => a[0] - b[0])) {
        used += delta;
        if (used > peak) {
          peak = used;
          peakDay = d;
        }
      }
      const capacity = stock.get(pair) ?? 0;
      if (peak > capacity)
        block('STOCK_CAPACITY_CONFLICT', {
          costumeId: pair.split(':')[0],
          size: pair.split(':')[1],
          good: capacity,
          peak,
          date: new Date(peakDay * DAY).toISOString().slice(0, 10),
          sources: rows
            .filter((h) => h.start <= peakDay && h.end >= peakDay)
            .slice(0, 20)
            .map((h) => ({ type: h.source, id: h.id })),
        });
    }
    const issues = [...findings.values()].sort(
      (a, b) => a.severity.localeCompare(b.severity) || a.code.localeCompare(b.code),
    );
    return {
      readOnly: true,
      generatedAt: now.toISOString(),
      asOf: new Date(today * DAY).toISOString().slice(0, 10),
      database: db.databaseName,
      replicaSet: hello.setName ?? null,
      transactionCommitVerified: false,
      ready: !issues.some((i) => i.severity === 'blocker'),
      counts: {
        schedules: schedules.length,
        workflows: workflows.length,
        rentals: rentals.length,
        transactions: transactions.length,
      },
      findings: issues,
    };
  } finally {
    await client.close();
  }
}
module.exports = { audit, validateUri };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--out' || !args[1])) {
    console.error('Usage: node ops/audit-studio-readiness.cjs [--out <file.json>]');
    process.exitCode = 1;
  } else
    audit(process.env.MONGO_URI)
      .then(async (result) => {
        const content = JSON.stringify(result, null, 2) + '\n';
        if (args[1])
          await fs.writeFile(path.resolve(args[1]), content, { encoding: 'utf8', flag: 'wx' });
        console.log(content);
        process.exitCode = result.ready ? 0 : 2;
      })
      .catch(() => {
        console.error(
          'Read-only studio audit failed. Check explicit MONGO_URI, database/read permissions and output path; no credentials are printed.',
        );
        process.exitCode = 1;
      });
}
