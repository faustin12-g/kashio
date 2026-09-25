/**
 * Thin wrapper around the Google Drive v3 REST API, scoped to exactly what
 * the backup feature needs: find-or-create a visible "Kashio Backups"
 * folder, and read/write a single JSON file inside it. No SDK dependency —
 * just fetch, since the `drive.file` scope only needs a handful of calls.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export const BACKUP_FOLDER_NAME = 'Kashio Backups';
export const BACKUP_FILE_NAME = 'kashio-backup.json';

export class DriveApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** True when Google rejected the token for lacking Drive permission (not a network/server fault). */
    public readonly isScopeError: boolean = false
  ) {
    super(message);
    this.name = 'DriveApiError';
  }
}

interface GoogleErrorBody {
  error?: {
    message?: string;
    errors?: { reason?: string }[];
    details?: { reason?: string }[];
  };
}

/**
 * Turns a raw Drive error response into a short message a person can act on,
 * and flags the "token lacks Drive permission" case so callers can recover.
 */
export function parseDriveError(status: number, body: string): { message: string; isScopeError: boolean } {
  let parsed: GoogleErrorBody = {};
  try {
    parsed = JSON.parse(body) as GoogleErrorBody;
  } catch {
    // Not JSON (e.g. an HTML error page); fall through to the generic message.
  }

  const reasons = [
    ...(parsed.error?.errors?.map((entry) => entry.reason) ?? []),
    ...(parsed.error?.details?.map((entry) => entry.reason) ?? []),
  ];
  const isScopeError =
    reasons.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || reasons.includes('insufficientPermissions');

  if (isScopeError) {
    return {
      message: 'Kashio does not have permission to use your Google Drive yet. Please allow Drive access when asked.',
      isScopeError: true,
    };
  }
  const detail = parsed.error?.message;
  return {
    message: detail ? `Google Drive error (${status}): ${detail}` : `Google Drive error (${status}).`,
    isScopeError: false,
  };
}

async function driveFetch(accessToken: string, url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const { message, isScopeError } = parseDriveError(response.status, body);
    throw new DriveApiError(message, response.status, isScopeError);
  }
  return response;
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Finds the app's backup folder by id (fast path) or by name (fallback,
 * e.g. after a fresh install with no cached id), creating it if it truly
 * doesn't exist yet.
 */
export async function findOrCreateBackupFolder(
  accessToken: string,
  cachedFolderId: string | null
): Promise<string> {
  if (cachedFolderId) {
    const check = await fetch(`${DRIVE_API}/files/${cachedFolderId}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (check.ok) {
      const data = (await check.json()) as { id: string; trashed?: boolean };
      if (!data.trashed) return data.id;
    }
  }

  const query = `name='${escapeQueryValue(BACKUP_FOLDER_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents`;
  const searchUrl = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`;
  const searchResponse = await driveFetch(accessToken, searchUrl);
  const searchData = (await searchResponse.json()) as { files: DriveFile[] };
  if (searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createResponse = await driveFetch(accessToken, `${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const created = (await createResponse.json()) as { id: string };
  return created.id;
}

/** Finds the backup JSON file inside the given folder, if one exists. */
export async function findBackupFile(
  accessToken: string,
  folderId: string
): Promise<DriveFile | null> {
  const query = `name='${escapeQueryValue(BACKUP_FILE_NAME)}' and '${folderId}' in parents and trashed=false`;
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&spaces=drive`;
  const response = await driveFetch(accessToken, url);
  const data = (await response.json()) as { files: DriveFile[] };
  return data.files[0] ?? null;
}

/**
 * Writes `content` as the backup file, creating it in `folderId` if
 * `existingFileId` is not given, or overwriting the existing file's
 * content in place otherwise (so Drive's built-in version history covers
 * this without us needing to manage snapshots ourselves).
 */
export async function writeBackupFile(
  accessToken: string,
  folderId: string,
  existingFileId: string | null,
  content: string
): Promise<string> {
  let fileId = existingFileId;

  if (!fileId) {
    const createResponse = await driveFetch(accessToken, `${DRIVE_API}/files?fields=id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: BACKUP_FILE_NAME, parents: [folderId] }),
    });
    const created = (await createResponse.json()) as { id: string };
    fileId = created.id;
  }

  await driveFetch(accessToken, `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: content,
  });

  return fileId;
}

export async function readBackupFile(accessToken: string, fileId: string): Promise<string> {
  const response = await driveFetch(accessToken, `${DRIVE_API}/files/${fileId}?alt=media`);
  return response.text();
}
