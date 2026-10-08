// Fictional service histories for the dedicated graduation-project database.
// Every write uses the parent's create-only helper and its resource transaction.
const DAY = 86400000;
const shift = (date, offset) =>
  new Date(Date.parse(`${date}T12:00:00+07:00`) + offset * DAY).toISOString().slice(0, 10);

exports.seedServices = async ({ models, ensure, id, at, day, now, catalog, groups }) => {
  for (const name of [
    'Booking',
    'BookingWorkflow',
    'Schedule',
    'RentalOrder',
    'Transaction',
    'Feedback',
  ])
    if (!models[name]) throw new Error(`Missing demo model: ${name}`);
  const admin = catalog.staffByKey.admin;
  const accountant = catalog.staffByKey.accountant;
  const categories = catalog.categoriesByKey;
  const past = (value, latestOffset = -1) =>
    value < day(latestOffset) ? value : day(latestOffset);
  const lifecycles = [
    ...Array(10).fill('completed'),
    'editing',
    'editing',
    'delivered',
    'revision_requested',
    'confirmed',
    'confirmed',
    'confirmed',
    'awaiting_deposit',
    'quoting',
    'intake',
  ];
  const comments = [
    'Ekip hướng dẫn tạo dáng rất nhiệt tình, ảnh tập thể đủ mặt cả lớp. Màu ảnh nhẹ nhàng đúng như đã trao đổi.',
    'Bọn mình thích bộ ảnh ở sân trường nhất. Album trả đúng hẹn, các bạn trong lớp đều có ảnh chân dung đẹp.',
    'Buổi chụp vui và không bị gấp. Studio hỗ trợ đổi size áo cho hai bạn rất nhanh.',
    'Ảnh nhóm đẹp, bố cục tự nhiên. Mong lần sau ekip gửi hướng dẫn chọn ảnh sớm hơn một chút.',
    'Những khoảnh khắc cười đùa được giữ lại rất tự nhiên. Cảm ơn anh chị đã kiên nhẫn với lớp!',
    'Ảnh chỉnh sửa đúng danh sách lớp gửi, đặc biệt là bộ ảnh bên hàng phượng. Nhận file khá thuận tiện.',
    'Bộ lễ phục sạch và vừa người. Gia đình xem ảnh tốt nghiệp đều rất thích.',
    'Lớp đã nhận đủ file. Các ảnh chân dung chỉnh da vừa phải, vẫn giữ nét riêng từng bạn.',
  ];
  const records = {
    bookings: [],
    workflows: [],
    schedules: [],
    rentals: [],
    transactions: [],
    feedback: [],
  };
  const payment = async ({ service, owner, stableKey, kind, amount, date, customer, label }) => {
    const paymentId = id(`${service}Payment`, stableKey);
    const season = catalog.seasons.find((row) => row.startDate <= date && date <= row.endDate)?._id;
    const categoryKey =
      service === 'photo'
        ? kind === 'refund'
          ? 'refund'
          : kind === 'deposit'
            ? 'deposit'
            : 'balance'
        : kind === 'refund'
          ? 'rentalRefund'
          : kind === 'deposit'
            ? 'rentalDeposit'
            : 'rentalBalance';
    const transaction = await ensure('Transaction', `${stableKey}:transaction`, {
      customer: customer?._id,
      ...(season ? { season } : {}),
      type: kind === 'refund' ? 'expense' : 'income',
      amount,
      categoryId: categories[categoryKey]._id,
      description: label,
      date,
      createdBy: accountant._id,
      accountantRefunded: kind === 'refund',
      ...(service === 'photo'
        ? { workflowBooking: owner, workflowPayment: paymentId }
        : { rentalOrder: owner, rentalPayment: paymentId }),
      createdAt: date,
      updatedAt: date,
    });
    records.transactions.push(transaction._id);
    const common = {
      _id: paymentId,
      kind,
      amount,
      method: 'bank_transfer',
      reference: `CK-${stableKey.replace(/[^a-z0-9]/gi, '').toUpperCase()}`,
      transaction: transaction._id,
    };
    return service === 'photo'
      ? { ...common, receivedAt: date, recordedBy: accountant._id }
      : { ...common, at: date, actor: accountant._id };
  };

  for (const [index, group] of groups.entries()) {
    const lifecycle = lifecycles[index];
    if (!lifecycle)
      throw new Error('The realistic service fixture supports exactly twenty classes.');
    const { key, customer, students, client, package: pack, shootDay, location } = group;
    const accepted = !['intake', 'quoting'].includes(lifecycle);
    const held = ['completed', 'editing', 'delivered', 'revision_requested', 'confirmed'].includes(
      lifecycle,
    );
    const completed = lifecycle === 'completed';
    const created = at(past(shift(shootDay, -30), -12));
    const quotedAt = at(past(shift(shootDay, -21), -5), '15:30');
    const acceptedAt = at(past(shift(shootDay, -20), -4), '20:15');
    const confirmedAt = at(past(shift(shootDay, -10), -2), '20:30');
    const startTime = pack.duration === 'full_day' ? '07:00' : '07:30';
    const endTime =
      pack.duration === 'half_day' ? '11:30' : pack.duration === 'full_day' ? '17:00' : '15:00';
    const memberCount = students.length;
    const fee = memberCount * pack.pricePerMember;
    const deposit = Math.round(fee * 0.3);
    const quote = {
      version: 1,
      currency: 'VND',
      lines: [
        {
          label: `${pack.name} · ${customer.className}`,
          quantity: memberCount,
          unitPrice: pack.pricePerMember,
        },
      ],
      depositRequired: deposit,
      proposedSchedule: { shootDate: at(shootDay, '00:00'), startTime, endTime, location },
      delivery: {
        targetDays: pack.deliveryDays || 7,
        targetDate: at(shift(shootDay, pack.deliveryDays || 7), '18:00'),
      },
      editingTerms: [
        'Chỉnh màu toàn bộ ảnh, chỉnh da chân dung theo danh sách chọn.',
        'Bao gồm một vòng góp ý trong vòng 7 ngày từ khi bàn giao.',
      ],
      terms: [
        'Đặt cọc 30% để giữ lịch và trang phục.',
        'Thanh toán phần còn lại sau khi lớp nghiệm thu ảnh.',
        'Số lượng thành viên và địa điểm được chốt trước buổi chụp 5 ngày.',
      ],
      proposedBy: admin._id,
      proposedAt: quotedAt,
      ...(accepted ? { acceptedBy: client._id, acceptedAt } : {}),
    };
    const booking = await ensure(
      'Booking',
      `${key}:booking`,
      {
        client: client._id,
        clientRequestId: `realistic-${key}`,
        requestFingerprint: `realistic-v1-${key}`,
        package: pack._id,
        packageName: pack.name,
        pricePerMember: pack.pricePerMember,
        packageSnapshot: {
          name: pack.name,
          pricePerMember: pack.pricePerMember,
          duration: pack.duration,
          costumeIds: pack.costumes,
          crewRatio: pack.crewRatio,
          editingScope: pack.editingScope,
          deliveryDays: pack.deliveryDays,
          studentsPerCrew: pack.studentsPerCrew,
          description: pack.description,
        },
        members: memberCount,
        className: customer.className,
        school: customer.school,
        contactName: customer.contactName,
        phone: customer.contactPhone,
        startAt: at(shootDay, startTime),
        endAt: at(shootDay, endTime),
        location,
        note:
          index % 3 === 0
            ? 'Lớp muốn chụp thêm một tấm với giáo viên chủ nhiệm và một nhóm ảnh cùng áo đồng phục.'
            : index % 3 === 1
              ? 'Ưu tiên ảnh nhóm bạn thân, concept nhẹ nhàng. Lớp trưởng sẽ tổng hợp danh sách ảnh cần chỉnh.'
              : 'Có một vài bạn cần thay size tại buổi chụp. Nhờ ekip đến sớm để thử trang phục.',
        status: lifecycle === 'intake' ? 'pending' : 'approved',
        ...(lifecycle !== 'intake'
          ? {
              reviewedBy: admin._id,
              reviewedAt: at(past(shift(shootDay, -25), -6)),
              reviewNote: 'Đã trao đổi nhu cầu với lớp trưởng, chuyển sang báo giá chi tiết.',
            }
          : {}),
        events: [{ message: 'Lớp đã gửi yêu cầu chụp kỷ yếu.', audience: 'client', at: created }],
        createdAt: created,
        updatedAt: completed ? at(shift(shootDay, 8)) : now,
      },
      { client: client._id, clientRequestId: `realistic-${key}` },
    );
    records.bookings.push(booking._id);
    const reservations = new Map();
    const members = students.map((student, memberIndex) => {
      const entries = student.costumeSizes?.length
        ? student.costumeSizes
        : [{ costume: group.costume._id, size: 'M' }];
      for (const entry of entries) {
        const costumeId = entry.costume;
        const rowKey = `${costumeId}:${entry.size}`;
        if (!reservations.has(rowKey))
          reservations.set(rowKey, {
            costumeId,
            size: entry.size,
            quantity: 0,
            receiveDate: at(shootDay, '00:00'),
            returnDate: at(shootDay, '00:00'),
          });
        reservations.get(rowKey).quantity++;
      }
      return {
        _id: id('WorkflowMember', `${key}:${memberIndex}`),
        student: student._id,
        requestId: `realistic-${key}-${memberIndex + 1}`,
        name: student.name,
        gender: student.gender,
        height: student.height,
        weight: student.weight,
        costumeSizes: entries.map((entry) => ({ costumeId: entry.costume, size: entry.size })),
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      };
    });
    const costumes = [...reservations.values()];
    let schedule;
    if (held) {
      schedule = await ensure(
        'Schedule',
        `${key}:schedule`,
        {
          customer: customer._id,
          package: pack._id,
          season: customer.season,
          costumes: [...new Set(costumes.map((row) => String(row.costumeId)))],
          shootDate: at(shootDay, '00:00'),
          startTime,
          endTime,
          location,
          leadPhotographer: group.photographers[0]._id,
          supportPhotographers: group.photographers.slice(1).map((row) => row._id),
          bookedBy: admin._id,
          status: lifecycle === 'confirmed' ? 'confirmed' : 'completed',
          notes:
            'Tập trung trước giờ chụp 20 phút. Lớp trưởng phụ trách điểm danh và kiểm tra trang phục.',
          workflowBooking: booking._id,
          costumeReservations: costumes.map(({ costumeId, ...row }) => ({
            costume: costumeId,
            ...row,
          })),
          createdAt: confirmedAt,
          updatedAt: lifecycle === 'confirmed' ? now : at(shootDay, endTime),
        },
        { workflowBooking: booking._id },
      );
      records.schedules.push(schedule._id);
    }
    const payments = [];
    if (held)
      payments.push(
        await payment({
          service: 'photo',
          owner: booking._id,
          stableKey: `${key}:deposit`,
          kind: 'deposit',
          amount: deposit,
          date: at(past(shift(shootDay, -19), -3), '14:25'),
          customer,
          label: `Cọc 30% chụp kỷ yếu ${customer.className} · ${customer.school}`,
        }),
      );
    const deliveryDay = shift(shootDay, completed ? Math.min(pack.deliveryDays || 7, 6) : 5);
    const deliveryUrl = `https://drive.google.com/drive/folders/fictional-graduation-${key}`;
    const delivered = ['completed', 'delivered', 'revision_requested'].includes(lifecycle);
    const progress = {
      status: delivered ? 'delivered' : lifecycle === 'editing' ? 'editing' : 'not_started',
      deliveryVersion: delivered ? 1 : 0,
      ...(delivered ? { deliveryUrl, deliveredAt: at(deliveryDay, '17:30') } : {}),
      ...(completed
        ? { acceptedAt: at(shift(deliveryDay, 1), '20:00'), acceptedDeliveryVersion: 1 }
        : {}),
      revisionRequests:
        lifecycle === 'revision_requested'
          ? [
              {
                _id: id('Revision', key),
                deliveryVersion: 1,
                note: 'Nhờ chỉnh sáng hơn cho ảnh nhóm ở cầu thang và sửa vệt áo ở ảnh chân dung của hai bạn trong danh sách.',
                requestedBy: client._id,
                at: at(shift(deliveryDay, 1), '19:20'),
              },
            ]
          : [],
    };
    if (completed)
      payments.push(
        await payment({
          service: 'photo',
          owner: booking._id,
          stableKey: `${key}:balance`,
          kind: 'balance',
          amount: fee - deposit,
          date: at(shift(deliveryDay, 2), '10:05'),
          customer,
          label: `Thanh toán phần còn lại album ${customer.className} · ${customer.school}`,
        }),
      );
    let feedback;
    if (completed && index < comments.length) {
      const rating = index === 3 ? 4 : 5;
      feedback = await ensure(
        'Feedback',
        `${key}:feedback`,
        {
          customer: customer._id,
          phone: customer.contactPhone,
          workflowBooking: booking._id,
          rating,
          comment: comments[index],
          content: comments[index],
          crewFeedback: {
            rating,
            description: 'Ekip đúng giờ, hỗ trợ cả lớp chọn góc và tạo dáng.',
          },
          albumFeedback: {
            rating,
            description: 'Màu ảnh hài hòa, ảnh tập thể rõ mặt và đủ thành viên.',
          },
          suggestion: index === 3 ? 'Gửi hướng dẫn chọn ảnh chân dung trước ngày bàn giao.' : '',
          isRead: index < 6,
          createdAt: at(shift(deliveryDay, 2), '21:00'),
          updatedAt: at(shift(deliveryDay, 2), '21:00'),
        },
        { workflowBooking: booking._id },
      );
      records.feedback.push(feedback._id);
    }
    const events = [
      {
        _id: id('WorkflowEvent', `${key}:intake`),
        action: 'workflow.created',
        message: 'Đã tiếp nhận nhu cầu chụp kỷ yếu và thông tin đại diện lớp.',
        actor: admin._id,
        at: created,
      },
    ];
    if (accepted)
      events.push({
        _id: id('WorkflowEvent', `${key}:quote`),
        action: 'quote.accepted',
        message: `Lớp đã đồng ý báo giá ${fee.toLocaleString('vi-VN')} đồng và lịch chụp dự kiến.`,
        actor: client._id,
        at: acceptedAt,
      });
    if (held)
      events.push({
        _id: id('WorkflowEvent', `${key}:confirmed`),
        action: 'resources.confirmed',
        message: 'Đã giữ lịch ekip, chốt danh sách thành viên và trang phục theo size.',
        actor: admin._id,
        at: confirmedAt,
      });
    if (delivered)
      events.push({
        _id: id('WorkflowEvent', `${key}:delivered`),
        action: 'delivery.delivered',
        message: 'Album đã sẵn sàng, lớp trưởng có thể xem ảnh và gửi góp ý.',
        actor: group.photographers[0]._id,
        at: progress.deliveredAt,
      });
    if (completed)
      events.push({
        _id: id('WorkflowEvent', `${key}:completed`),
        action: 'workflow.completed',
        message: 'Lớp đã nghiệm thu album và hoàn tất thanh toán.',
        actor: accountant._id,
        at: at(shift(deliveryDay, 2), '10:05'),
      });
    const workflow = await ensure(
      'BookingWorkflow',
      `${key}:workflow`,
      {
        booking: booking._id,
        customer: customer._id,
        version: completed ? 12 : held ? 8 : accepted ? 3 : 1,
        lifecycle,
        ...(lifecycle !== 'intake' ? { quote } : {}),
        quoteHistory: [],
        payments,
        resources: held
          ? {
              schedule: schedule._id,
              photographers: group.photographers.map((row) => row._id),
              costumes,
            }
          : { photographers: [], costumes: [] },
        members: lifecycle === 'intake' ? [] : members,
        memberRosterHistory: [],
        memberEntry: {
          opened: false,
          ...(held
            ? {
                openedAt: at(past(shift(shootDay, -15), -3)),
                closedAt: at(past(shift(shootDay, -10), -2)),
              }
            : {}),
        },
        progress,
        deliveryHistory: delivered
          ? [
              {
                version: 1,
                deliveryUrl,
                deliveredAt: progress.deliveredAt,
                deliveredBy: group.photographers[0]._id,
              },
            ]
          : [],
        ...(feedback
          ? {
              feedback: {
                record: feedback._id,
                rating: feedback.rating,
                comment: feedback.comment,
                at: feedback.createdAt,
              },
            }
          : {}),
        events,
        idempotency: [],
        createdAt: created,
        updatedAt: completed ? at(shift(deliveryDay, 2), '10:05') : now,
      },
      { booking: booking._id },
    );
    records.workflows.push(workflow._id);
  }

  const rentalStatuses = [
    ...Array(12).fill('completed'),
    'returned',
    'returned',
    'returned',
    'confirmed',
    'confirmed',
    'confirmed',
    'checked_out',
    'checked_out',
    'quoting',
    'requested',
    'cancelled',
    'rejected',
  ];
  const rentable = catalog.costumes.filter((row) => row.isRentalItem);
  const quantities = [4, 6, 2, 10, 5, 8, 3, 12, 4, 7, 6, 2];
  for (const [index, status] of rentalStatuses.entries()) {
    const stableKey = `rental-${String(index + 1).padStart(2, '0')}`;
    const rentalId = id('RentalOrder', stableKey);
    const client = catalog.clients[index % catalog.clients.length];
    const costume = rentable[index % rentable.length];
    const stock = costume.inventory
      .filter((row) => row.condition === 'good')
      .sort((a, b) => b.quantity - a.quantity)[0];
    if (!stock) throw new Error('Every seeded rental costume needs good stock.');
    const quantity = Math.min(quantities[index % quantities.length], stock.quantity);
    const unitPrice = costume.rentalPrice;
    const fee = unitPrice * quantity;
    const deposit = Math.min(3000000, Math.max(600000, Math.ceil(fee / 500000) * 500000));
    const offset =
      index < 12
        ? -110 + index * 9
        : index < 15
          ? -6 - (index - 12) * 2
          : index < 18
            ? 5 + (index - 15) * 7
            : index < 20
              ? -2
              : 8 + (index - 20) * 3;
    const receiveDay = day(offset);
    const returnDay = day(index < 20 ? offset + (status === 'checked_out' ? 4 : 2) : offset + 2);
    const proposedAt = at(past(shift(receiveDay, -5), -5), '15:20');
    const acceptedAt = at(past(shift(receiveDay, -4), -4), '20:10');
    const accepted = !['requested', 'quoting', 'rejected'].includes(status);
    const handed = ['completed', 'returned', 'checked_out'].includes(status);
    const returned = ['completed', 'returned'].includes(status);
    const line = {
      costumeId: costume._id,
      name: costume.name,
      size: stock.size,
      quantity,
      unitPrice,
    };
    const quote = {
      version: 1,
      lines: [line],
      receiveDate: at(receiveDay, '00:00'),
      returnDate: at(returnDay, '00:00'),
      fee,
      deposit,
      terms: [
        'Thu đủ phí thuê và tiền cọc trước khi giao đồ.',
        'Hoàn tiền cọc sau khi kiểm đếm trang phục.',
        'Không tự giặt hoặc chỉnh sửa trang phục; thông báo trước khi gia hạn.',
      ],
      proposedAt,
      ...(accepted ? { acceptedAt } : {}),
    };
    const payments = [];
    if (accepted)
      payments.push(
        await payment({
          service: 'rental',
          owner: rentalId,
          stableKey: `${stableKey}:deposit`,
          kind: 'deposit',
          amount: deposit,
          date: at(past(shift(receiveDay, -3), -3), '09:45'),
          label: `Cọc thuê ${quantity} ${costume.name} size ${stock.size} · ${client.name}`,
        }),
      );
    const checkedOutAt = at(receiveDay, '10:00');
    if (handed)
      payments.push(
        await payment({
          service: 'rental',
          owner: rentalId,
          stableKey: `${stableKey}:balance`,
          kind: 'balance',
          amount: fee,
          date: at(receiveDay, '09:50'),
          label: `Phí thuê ${quantity} ${costume.name} · ${client.name}`,
        }),
      );
    if (status === 'completed')
      payments.push(
        await payment({
          service: 'rental',
          owner: rentalId,
          stableKey: `${stableKey}:refund`,
          kind: 'refund',
          amount: deposit,
          date: at(returnDay, '17:00'),
          label: `Hoàn cọc sau kiểm đếm ${costume.name} · ${client.name}`,
        }),
      );
    if (status === 'cancelled')
      payments.push(
        await payment({
          service: 'rental',
          owner: rentalId,
          stableKey: `${stableKey}:refund`,
          kind: 'refund',
          amount: deposit,
          date: at(past(shift(receiveDay, -2), -2), '15:00'),
          label: `Hoàn cọc đơn thuê đã hủy trước ngày nhận · ${client.name}`,
        }),
      );
    const events = [
      {
        _id: id('RentalEvent', `${stableKey}:requested`),
        action: 'requested',
        actor: client._id,
        at: at(past(shift(receiveDay, -7), -12)),
        message: 'Khách gửi nhu cầu thuê trang phục theo số lượng và ngày sử dụng.',
      },
    ];
    if (accepted)
      events.push({
        _id: id('RentalEvent', `${stableKey}:accepted`),
        action: 'quote.accepted',
        actor: client._id,
        at: acceptedAt,
        message: 'Đã đồng ý phí thuê, tiền cọc và thời gian nhận trả.',
      });
    if (handed)
      events.push({
        _id: id('RentalEvent', `${stableKey}:handover`),
        action: 'checked_out',
        actor: admin._id,
        at: checkedOutAt,
        message:
          'Đã kiểm đếm, thử size và bàn giao đủ số lượng. Khách nhận túi đựng kèm hướng dẫn bảo quản.',
      });
    if (returned)
      events.push({
        _id: id('RentalEvent', `${stableKey}:returned`),
        action: 'returned',
        actor: admin._id,
        at: at(returnDay, '16:30'),
        message: 'Đã nhận lại đủ trang phục, kiểm đếm tốt và không phát sinh hư hỏng.',
      });
    if (status === 'completed')
      events.push({
        _id: id('RentalEvent', `${stableKey}:completed`),
        action: 'completed',
        actor: accountant._id,
        at: at(returnDay, '17:00'),
        message: 'Khách đã đồng ý quyết toán, tiền cọc được hoàn vào tài khoản chuyển ban đầu.',
      });
    const rental = await ensure(
      'RentalOrder',
      stableKey,
      {
        client: client._id,
        version: status === 'completed' ? 10 : returned ? 8 : handed ? 6 : accepted ? 4 : 1,
        creationKey: `realistic_${stableKey}`,
        creationFingerprint: `realistic-v1-${stableKey}`,
        contactName: client.name,
        phone: `090000${String(1000 + index).padStart(4, '0')}`,
        note:
          index % 3 === 0
            ? 'Thuê cho buổi chụp nhóm bạn. Xin giữ cùng tông màu và hỗ trợ thử size khi nhận.'
            : index % 3 === 1
              ? 'Sử dụng cho lễ tổng kết của câu lạc bộ. Đại diện nhóm sẽ nhận và trả cùng một lần.'
              : 'Chụp chân dung tốt nghiệp cùng gia đình, ưu tiên trang phục sạch và vừa người.',
        requestedLines: [line],
        requestedReceiveDate: at(receiveDay, '00:00'),
        requestedReturnDate: at(returnDay, '00:00'),
        status,
        ...(status !== 'requested' && status !== 'rejected' ? { quote } : {}),
        quoteHistory: [],
        payments,
        ...(handed ? { checkedOutAt } : {}),
        ...(returned
          ? {
              returnedAt: at(returnDay, '16:30'),
              returns: [
                { costumeId: costume._id, size: stock.size, good: quantity, damaged: 0, lost: 0 },
              ],
              settlement: {
                version: 1,
                charges: [],
                total: fee,
                note: 'Nhận lại đủ trang phục, không phát sinh chi phí bổ sung.',
                proposedAt: at(returnDay, '16:40'),
                ...(index !== 14 ? { acceptedAt: at(returnDay, '16:50') } : {}),
              },
            }
          : {}),
        ...(status === 'cancelled'
          ? {
              change: {
                _id: id('RentalChange', stableKey),
                kind: 'cancel',
                status: 'applied',
                finalFee: 0,
                note: 'Nhóm dời buổi chụp sang tháng sau, xin hủy trước khi nhận trang phục.',
                terms: ['Hủy trước ngày nhận, chưa bàn giao trang phục; hoàn đủ tiền cọc.'],
                at: at(past(shift(receiveDay, -2), -2), '10:00'),
                acceptedAt: at(past(shift(receiveDay, -2), -2), '14:00'),
              },
            }
          : {}),
        ...(status === 'rejected'
          ? {
              note: 'Khách cần phối cùng phụ kiện hiện chưa có. Đã tư vấn mẫu khác và khách sẽ liên hệ lại.',
            }
          : {}),
        ...(status === 'completed' && index % 3 !== 2
          ? {
              feedback: {
                rating: index === 4 ? 4 : 5,
                comment:
                  index % 2
                    ? 'Trang phục sạch, vừa size. Nhận và hoàn cọc nhanh, sẽ quay lại khi cần chụp ảnh.'
                    : 'Nhân viên hỗ trợ thử đồ kỹ, nhận đủ bộ và đúng màu nhóm đã chọn.',
                at: at(shift(returnDay, 1), '19:00'),
              },
            }
          : {}),
        events,
        commands: [],
        settlementHistory: [],
        changeHistory: [],
        createdAt: at(past(shift(receiveDay, -7), -12)),
        updatedAt: returned ? at(returnDay, '17:00') : now,
      },
      { client: client._id, creationKey: `realistic_${stableKey}` },
    );
    records.rentals.push(rental._id);
  }
  return records;
};
