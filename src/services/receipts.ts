import { Directory, File, Paths } from 'expo-file-system';
import { generateId } from '../utils/id';

const RECEIPTS_DIR = new Directory(Paths.document, 'receipts');

/**
 * Copies a picked photo (camera or gallery) into the app's own storage, so
 * it survives the picker's temporary cache being cleared. Returns the new,
 * permanent file's path. Called only once a transaction is actually saved,
 * so cancelling the form never leaves an orphaned copy behind.
 */
export async function saveReceiptCopy(pickedUri: string): Promise<string> {
  RECEIPTS_DIR.create({ intermediates: true, idempotent: true });
  const extension = /\.(\w+)$/.exec(pickedUri)?.[1]?.toLowerCase() ?? 'jpg';
  const destination = new File(RECEIPTS_DIR, `${generateId()}.${extension}`);
  await new File(pickedUri).copy(destination, { overwrite: true });
  return destination.uri;
}

/** Removes a receipt's saved copy, if it still exists. Never throws. */
export function deleteReceiptCopy(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing to do — a missing or already-cleared file is not an error here.
  }
}
