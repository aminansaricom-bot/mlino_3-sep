export type CoreErrorCode = 'AUTHENTICATION_REQUIRED' | 'AUTHORIZATION_DENIED' | 'TENANT_MISMATCH' | 'VALIDATION_FAILED' | 'CONFLICT' | 'DATABASE_INTEGRITY' | 'INTERNAL_ERROR';

export class CoreDomainError extends Error {
  constructor(public readonly code: CoreErrorCode, message: string, public readonly details?: Readonly<Record<string, string>>) {
    super(message);
    this.name = 'CoreDomainError';
  }
}

export const authenticationRequired = (message = 'authentication required') => new CoreDomainError('AUTHENTICATION_REQUIRED', message);
export const authorizationDenied = (message = 'authorization denied') => new CoreDomainError('AUTHORIZATION_DENIED', message);
export const tenantMismatch = (message = 'tenant boundary rejected') => new CoreDomainError('TENANT_MISMATCH', message);
export const validationFailed = (message: string) => new CoreDomainError('VALIDATION_FAILED', message);
export const conflict = (message: string) => new CoreDomainError('CONFLICT', message);
