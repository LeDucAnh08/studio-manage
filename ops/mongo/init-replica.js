// Safe to retry: never reconfigure or erase an existing replica set.
try {
  const status = rs.status();
  if (status.set !== 'rs0') throw new Error('Unexpected replica set; manual review required');
} catch (error) {
  if (error.code !== 94 && error.codeName !== 'NotYetInitialized') throw error;
  const result = rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] });
  if (!result.ok) throw new Error('Replica set initiation was not accepted');
}
if (!db.hello().isWritablePrimary) quit(1);
