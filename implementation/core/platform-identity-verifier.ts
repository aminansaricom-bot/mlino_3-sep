import { CoreDomainError, authorizationDenied, validationFailed } from './errors';

export interface PlatformActor {
  readonly ref: string;
}

export interface PlatformIdentityVerifier {
  verify(credential: string): Promise<PlatformActor>;
}

export async function requireVerifiedPlatformActor(
  verifier: PlatformIdentityVerifier | undefined,
  credential: string | undefined,
): Promise<PlatformActor> {
  if (!verifier || !credential) {
    throw authorizationDenied('verified platform actor required');
  }
  try {
    const actor = await verifier.verify(credential);
    if (!actor?.ref) {
      throw validationFailed('platform verifier returned no actor reference');
    }
    return actor;
  } catch (error) {
    if (error instanceof CoreDomainError) {
      throw error;
    }
    throw authorizationDenied('platform credential rejected');
  }
}
