import { DriveApiError, parseDriveError } from '../../src/services/googleDrive';

// The exact response Google returned when the token lacked Drive permission.
const SCOPE_ERROR_BODY = JSON.stringify({
  error: {
    code: 403,
    message: 'Request had insufficient authentication scopes.',
    errors: [{ message: 'Insufficient Permission', domain: 'global', reason: 'insufficientPermissions' }],
    status: 'PERMISSION_DENIED',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
        reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT',
        domain: 'googleapis.com',
      },
    ],
  },
});

describe('parseDriveError', () => {
  it('recognises a token that lacks Drive permission and gives a short, actionable message', () => {
    const result = parseDriveError(403, SCOPE_ERROR_BODY);
    expect(result.isScopeError).toBe(true);
    expect(result.message).toMatch(/permission to use your Google Drive/i);
    expect(result.message).not.toContain('{');
  });

  it('recognises the scope problem from either reason field on its own', () => {
    const onlyLegacyReason = JSON.stringify({ error: { errors: [{ reason: 'insufficientPermissions' }] } });
    const onlyDetailReason = JSON.stringify({ error: { details: [{ reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' }] } });
    expect(parseDriveError(403, onlyLegacyReason).isScopeError).toBe(true);
    expect(parseDriveError(403, onlyDetailReason).isScopeError).toBe(true);
  });

  it('reports other Google errors with the status and Google\'s own message', () => {
    const body = JSON.stringify({ error: { code: 500, message: 'Backend Error' } });
    expect(parseDriveError(500, body)).toEqual({
      message: 'Google Drive error (500): Backend Error',
      isScopeError: false,
    });
  });

  it('does not treat an ordinary permission-denied on a file as a scope problem', () => {
    const body = JSON.stringify({ error: { message: 'The user does not have sufficient permissions for this file.', errors: [{ reason: 'forbidden' }] } });
    expect(parseDriveError(403, body).isScopeError).toBe(false);
  });

  it('falls back to a generic message when the body is not JSON', () => {
    expect(parseDriveError(502, '<html>Bad gateway</html>')).toEqual({
      message: 'Google Drive error (502).',
      isScopeError: false,
    });
  });

  it('falls back to a generic message for an empty body', () => {
    expect(parseDriveError(503, '').message).toBe('Google Drive error (503).');
  });
});

describe('DriveApiError', () => {
  it('carries the status and the scope flag so callers can decide whether to retry', () => {
    const error = new DriveApiError('nope', 403, true);
    expect(error.status).toBe(403);
    expect(error.isScopeError).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('defaults to not being a scope error', () => {
    expect(new DriveApiError('boom', 500).isScopeError).toBe(false);
  });
});
