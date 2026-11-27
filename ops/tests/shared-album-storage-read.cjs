// Read-only smoke check against the configured studio_db; no jobs or provider calls.
const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const backend = createRequire(path.join(root, 'backend/package.json'));
backend('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
const mongoose = backend('mongoose');
const express = backend('express');
const jwt = backend('jsonwebtoken');
const Album = backend('./dist/models/BookingAlbum').default;
const Photo = backend('./dist/models/BookingAlbumPhoto').default;
const Upload = backend('./dist/models/BookingDeliveryPhoto').default;
const User = backend('./dist/models/User').default;
const Booking = backend('./dist/models/Booking').default;
const { assertSharedAlbumStore, LEGACY_ALBUM_COLLECTIONS } = backend(
  './dist/services/sharedAlbumStore',
);

async function main() {
  let server;
  await mongoose.connect(process.env.MONGO_URI, {
    autoCreate: false,
    autoIndex: false,
    serverSelectionTimeoutMS: 10000,
  });
  try {
    assert.equal(mongoose.connection.name, 'studio_db');
    await assertSharedAlbumStore();
    const names = (
      await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()
    ).map((row) => row.name);
    assert.equal(
      names.some((name) => LEGACY_ALBUM_COLLECTIONS.includes(name)),
      false,
    );
    const album = await Album.findOne();
    assert.ok(album, 'No yearbook album available for the read-only check');
    const booking = await Booking.findById(album.booking);
    const admin = await User.findOne({ isActive: true, roles: { $in: [0, 1] } });
    const owner = await User.findById(booking.client);
    assert.ok(admin && owner && owner.isActive);
    const { albumRoutes } = backend('./dist/routes/bookingAlbum');
    const { protect } = backend('./dist/middleware/auth');
    const app = express();
    app.use('/api/bookings/:id/album', protect, albumRoutes);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/bookings/${album.booking}/album`;
    async function get(actor) {
      const response = await fetch(base, {
        headers: actor
          ? {
              Authorization: `Bearer ${jwt.sign({ id: String(actor._id) }, process.env.JWT_SECRET, { expiresIn: '5m' })}`,
            }
          : {},
      });
      return { status: response.status, body: await response.json() };
    }
    const anonymous = await get(null),
      staff = await get(admin),
      customer = await get(owner);
    assert.equal(anonymous.status, 401);
    assert.equal(staff.status, 200);
    assert.equal(customer.status, 200);
    assert.equal(staff.body.data.publicId, album.publicId);
    assert.equal(customer.body.data.publicId, album.publicId);
    const allPhotos = await Photo.find({ album: album._id }).lean();
    const shown = new Map(staff.body.data.photos.map((photo) => [photo.id, photo]));
    for (const photo of allPhotos) {
      const dto = shown.get(String(photo._id));
      if (dto) {
        assert.equal(dto.selected, photo.selected);
        assert.equal(dto.note, photo.note);
        assert.equal(dto.deliveryVersion, photo.deliveryVersion);
      }
    }
    const outsider = await User.findOne({ isActive: true, roles: 6, _id: { $ne: owner._id } });
    const outsiderResult = outsider ? await get(outsider) : null;
    if (outsiderResult) assert.equal(outsiderResult.status, 404);
    const report = {
      database: 'studio_db',
      albums: await Album.countDocuments(),
      photos: await mongoose.connection.collection('photos').countDocuments(),
      drivePhotos: await Photo.countDocuments(),
      uploads: await Upload.countDocuments(),
      legacyCollections: 0,
      anonymous: anonymous.status,
      admin: staff.status,
      owner: customer.status,
      otherCustomer: outsiderResult?.status,
      staffVisiblePhotos: staff.body.data.photos.length,
      ownerVisiblePhotos: customer.body.data.photos.length,
      preservedSelectionAndNotes: true,
      realWrites: 0,
    };
    const output = path.join(root, 'audit/shared-albums-2026-11-27');
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(
      path.join(output, 'read-verification.json'),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error(error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s'"<>]+/gi, '[REDACTED_URI]'));
  process.exitCode = 1;
});
