/**
 * Last-write-wins merge, the core of restoring a Drive backup.
 *
 * This is intentionally simple: it is built for "one person, a couple of
 * devices, synced occasionally" — not for real-time concurrent multi-device
 * editing. Each record (category/transaction/budget) carries an
 * `updatedAt` timestamp; deletions are soft (a `deletedAt` tombstone) so
 * they can propagate too. For any given id, whichever side has the newer
 * `updatedAt` wins outright — there is no field-level merge.
 *
 * Known limitation, documented rather than hidden: if the same record is
 * edited differently on two devices between backups, the older edit is
 * silently discarded. Back up before switching devices and you won't hit
 * this in practice.
 */

export interface Mergeable {
  id: string;
  updatedAt: number;
}

/**
 * Given the full local set and the full remote (Drive) set of one record
 * type, returns exactly the remote records that should be written locally:
 * every remote record that doesn't exist locally, plus every remote record
 * that is strictly newer than its local counterpart. Local-only records are
 * left alone (they'll be included next time this device backs up).
 */
export function recordsToApplyFromRemote<T extends Mergeable>(local: T[], remote: T[]): T[] {
  const localById = new Map(local.map((record) => [record.id, record]));

  return remote.filter((remoteRecord) => {
    const localRecord = localById.get(remoteRecord.id);
    return !localRecord || remoteRecord.updatedAt > localRecord.updatedAt;
  });
}
