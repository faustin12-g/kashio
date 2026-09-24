import { recordsToApplyFromRemote, type Mergeable } from '../../src/services/merge';

interface Item extends Mergeable {
  name: string;
}

describe('recordsToApplyFromRemote', () => {
  it('applies a remote record that does not exist locally', () => {
    const local: Item[] = [];
    const remote: Item[] = [{ id: 'a', name: 'from Drive', updatedAt: 100 }];

    expect(recordsToApplyFromRemote(local, remote)).toEqual(remote);
  });

  it('applies a remote record that is newer than the local one', () => {
    const local: Item[] = [{ id: 'a', name: 'old local edit', updatedAt: 100 }];
    const remote: Item[] = [{ id: 'a', name: 'newer remote edit', updatedAt: 200 }];

    expect(recordsToApplyFromRemote(local, remote)).toEqual(remote);
  });

  it('does NOT apply a remote record that is older than the local one', () => {
    const local: Item[] = [{ id: 'a', name: 'newer local edit', updatedAt: 200 }];
    const remote: Item[] = [{ id: 'a', name: 'stale remote edit', updatedAt: 100 }];

    expect(recordsToApplyFromRemote(local, remote)).toEqual([]);
  });

  it('leaves records that only exist locally untouched (not included in the apply list)', () => {
    const local: Item[] = [{ id: 'local-only', name: 'never backed up yet', updatedAt: 100 }];
    const remote: Item[] = [];

    expect(recordsToApplyFromRemote(local, remote)).toEqual([]);
  });

  it('resolves each id independently across a mixed batch', () => {
    const local: Item[] = [
      { id: 'newer-local', name: 'keep me', updatedAt: 300 },
      { id: 'newer-remote', name: 'stale', updatedAt: 100 },
    ];
    const remote: Item[] = [
      { id: 'newer-local', name: 'discard me', updatedAt: 200 },
      { id: 'newer-remote', name: 'apply me', updatedAt: 250 },
      { id: 'new-from-remote', name: 'insert me', updatedAt: 50 },
    ];

    const result = recordsToApplyFromRemote(local, remote);
    expect(result.map((r) => r.id).sort()).toEqual(['new-from-remote', 'newer-remote']);
  });

  it('treats an exact tie in updatedAt as "keep local" (remote must be strictly newer to win)', () => {
    const local: Item[] = [{ id: 'a', name: 'local', updatedAt: 100 }];
    const remote: Item[] = [{ id: 'a', name: 'remote', updatedAt: 100 }];

    expect(recordsToApplyFromRemote(local, remote)).toEqual([]);
  });

  it('applies a remote tombstone (soft delete) the same as any other field update, when newer', () => {
    interface Tombstoned extends Mergeable {
      deletedAt: number | null;
    }
    const local: Tombstoned[] = [{ id: 'a', deletedAt: null, updatedAt: 100 }];
    const remote: Tombstoned[] = [{ id: 'a', deletedAt: 200, updatedAt: 200 }];

    expect(recordsToApplyFromRemote(local, remote)).toEqual(remote);
  });
});
