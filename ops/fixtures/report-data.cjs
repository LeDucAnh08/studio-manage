// Deliberate snapshots including legacy anomalies, used only in disposable local tests.
exports.seedReportData = async (db, ObjectId) => {
  const id = () => new ObjectId(),
    at = (day) => new Date(`${day}T00:00:00+07:00`);
  const bookingA = id(),
    bookingB = id(),
    bookingC = id(),
    bookingD = id();
  const costume = id(),
    legacyCostume = id(),
    schedule = id();
  const payments = (received, refunded = 0) => [
    { kind: 'balance', amount: received },
    ...(refunded ? [{ kind: 'refund', amount: refunded }] : []),
  ];
  const photoQuote = (fee, accepted = true) => ({
    version: 1,
    lines: [{ label: 'Dịch vụ', quantity: 1, unitPrice: fee }],
    ...(accepted ? { acceptedAt: at('2026-09-01') } : {}),
  });
  await db.collection('bookingworkflows').insertMany([
    {
      _id: id(),
      booking: bookingA,
      lifecycle: 'completed',
      quote: photoQuote(1000),
      payments: payments(1000),
      progress: { acceptedAt: at('2026-09-30') },
    },
    {
      _id: id(),
      booking: bookingB,
      lifecycle: 'accepted',
      quote: photoQuote(2000),
      payments: payments(500),
      progress: { acceptedAt: at('2026-10-02') },
      resources: {
        schedule,
        costumes: [
          {
            costumeId: costume,
            size: 'M',
            quantity: 2,
            receiveDate: at('2026-10-01'),
            returnDate: at('2026-10-03'),
          },
        ],
      },
      members: [{ name: 'Private roster' }],
      idempotency: [{ key: 'private-key' }],
      updatedAt: at('2026-10-05'),
    },
    {
      _id: id(),
      booking: bookingC,
      lifecycle: 'cancelled',
      quote: photoQuote(2000),
      payments: payments(1000),
      progress: { acceptedAt: at('2026-09-29') },
      changeRequest: {
        status: 'applied',
        kind: 'cancel',
        finalPayable: 300,
        acceptedAt: at('2026-10-03'),
      },
    },
    {
      _id: id(),
      booking: bookingD,
      lifecycle: 'quoting',
      quote: photoQuote(5000, false),
      payments: [],
    },
  ]);
  const rentalA = id(),
    rentalB = id(),
    rentalC = id(),
    rentalD = id(),
    rentalE = id(),
    overdue = id(),
    sameDay = id();
  const rentalQuote = (fee = 1000, deposit = 500, size = 'M', qty = 2) => ({
    fee,
    deposit,
    acceptedAt: at('2026-09-29'),
    lines: [{ costumeId: costume, name: 'Áo báo cáo', size, quantity: qty, unitPrice: fee / qty }],
    receiveDate: at('2026-10-01'),
    returnDate: at('2026-10-03'),
  });
  await db.collection('rentalorders').insertMany(
    [
      {
        _id: rentalA,
        status: 'completed',
        quote: rentalQuote(),
        payments: payments(1500, 500),
        checkedOutAt: at('2026-09-29'),
        returnedAt: at('2026-09-30'),
        settlement: { total: 1000, acceptedAt: at('2026-09-30') },
      },
      {
        _id: rentalB,
        status: 'returned',
        quote: rentalQuote(),
        payments: payments(1500),
        checkedOutAt: at('2026-10-01'),
        returnedAt: at('2026-10-03'),
        settlement: { total: 1200, proposedAt: at('2026-10-03') },
        phone: 'private-phone',
        creationKey: 'private-key',
      },
      {
        _id: rentalC,
        status: 'returned',
        quote: rentalQuote(),
        payments: payments(1500),
        checkedOutAt: at('2026-10-01'),
        returnedAt: at('2026-10-03'),
        settlement: { total: 1200, acceptedAt: at('2026-10-03') },
      },
      {
        _id: rentalD,
        status: 'cancelled',
        quote: rentalQuote(),
        payments: payments(1500),
        change: { status: 'applied', kind: 'cancel', finalFee: 300, acceptedAt: at('2026-10-02') },
      },
      { _id: rentalE, status: 'confirmed', quote: rentalQuote(1400, 500), payments: payments(500) },
      {
        _id: overdue,
        status: 'checked_out',
        quote: {
          ...rentalQuote(100, 50, 'L', 1),
          receiveDate: at('2026-09-28'),
          returnDate: at('2026-09-29'),
        },
        payments: payments(150),
        checkedOutAt: at('2026-09-28'),
      },
      {
        _id: sameDay,
        status: 'completed',
        quote: rentalQuote(100, 0, 'L', 1),
        payments: payments(100),
        checkedOutAt: at('2026-10-02'),
        returnedAt: new Date('2026-10-02T23:59:00+07:00'),
        settlement: { total: 100, acceptedAt: at('2026-10-02') },
      },
    ].map((row) => ({ client: id(), creationKey: String(row._id), ...row })),
  );
  await db.collection('costumes').insertMany([
    {
      _id: costume,
      name: 'Áo báo cáo',
      inventory: [
        { size: 'M', condition: 'good', quantity: 5 },
        { size: 'M', condition: 'damaged', quantity: 99 },
        { size: 'L', condition: 'good', quantity: 1 },
      ],
    },
    {
      _id: legacyCostume,
      name: 'Mẫu lịch cũ',
      inventory: [{ size: 'M', condition: 'good', quantity: 10 }],
    },
  ]);
  await db.collection('schedules').insertMany([
    {
      _id: schedule,
      status: 'confirmed',
      costumes: [costume],
      shootDate: at('2026-10-02'),
      costumeReservations: [
        {
          costume,
          size: 'M',
          quantity: 2,
          receiveDate: at('2026-10-01'),
          returnDate: at('2026-10-03'),
        },
      ],
    },
    { _id: id(), status: 'confirmed', costumes: [legacyCostume], shootDate: at('2026-10-02') },
    {
      _id: id(),
      status: 'cancelled',
      costumes: [costume],
      shootDate: at('2026-10-02'),
      costumeReservations: [
        {
          costume,
          size: 'M',
          quantity: 99,
          receiveDate: at('2026-10-01'),
          returnDate: at('2026-10-03'),
        },
      ],
    },
  ]);
  const cash = [
    { type: 'income', amount: 1500, date: at('2026-09-29'), rentalOrder: rentalA },
    { type: 'expense', amount: 500, date: at('2026-10-01'), rentalOrder: rentalA },
    {
      type: 'income',
      amount: 500,
      date: new Date('2026-10-01T23:59:59.999+07:00'),
      workflowBooking: bookingB,
    },
    { type: 'income', amount: 1500, date: at('2026-10-02'), rentalOrder: rentalC },
    { type: 'expense', amount: 75, date: new Date('2026-10-03T23:59:59.999+07:00') },
    { type: 'income', amount: 9000, date: at('2026-10-04') },
    {
      type: 'income',
      amount: 25,
      date: at('2026-10-02'),
      rentalOrder: rentalC,
      workflowBooking: bookingB,
    },
  ];
  await db.collection('transactions').insertMany(
    cash.map((t) => ({
      _id: id(),
      ...t,
      ...(t.rentalOrder ? { rentalPayment: id() } : {}),
      ...(t.workflowBooking ? { workflowPayment: id() } : {}),
    })),
  );
  return {
    bookingB: String(bookingB),
    rentalC: String(rentalC),
    costume: String(costume),
    legacyCostume: String(legacyCostume),
  };
};
