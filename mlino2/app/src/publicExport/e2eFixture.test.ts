import { describe, expect, it } from 'vitest'
import artifact from './fixtures/e2e/public-business.v1.json'
import bundle from './fixtures/e2e/trust-bundle.json'
import { PublicExportConsumer, TTL_MS } from './consumer'
import { FileTransport } from './transport'
import { trustBundleFromBuildJson } from './trustBundle'

const NOW = Date.parse('2026-09-19T09:00:00.000Z')
const bytes = () => new TextEncoder().encode(JSON.stringify(artifact))

describe('M2-3R V1 to V2 public export fixture', () => {
  it('accepts the distributed producer bytes with the producer trust bundle', async () => {
    const consumer = new PublicExportConsumer(new FileTransport(bytes()), trustBundleFromBuildJson(JSON.stringify(bundle)))
    await consumer.refresh(NOW)
    expect(consumer.read(NOW)).toHaveLength(1)
    expect(consumer.read(NOW)[0].business.organization_id).toBe('e2e-org')
  })

  it('rejects one-byte tamper, revoked key, and expired artifact', async () => {
    const valid = bytes()
    const tampered = new Uint8Array(valid)
    const index = new TextDecoder().decode(tampered).indexOf('E2E TEST')
    tampered[index] = 'X'.charCodeAt(0)
    const trust = trustBundleFromBuildJson(JSON.stringify(bundle))
    await expect(new PublicExportConsumer(new FileTransport(tampered), trust).refresh(NOW)).rejects.toThrow('PUBLIC_EXPORT_BAD_SIGNATURE')
    const revoked = trustBundleFromBuildJson(JSON.stringify({ ...bundle, revokedIds: [bundle.keys[0].keyId] }))
    await expect(new PublicExportConsumer(new FileTransport(valid), revoked).refresh(NOW)).rejects.toThrow('PUBLIC_EXPORT_UNKNOWN_OR_REVOKED_KEY')
    await expect(new PublicExportConsumer(new FileTransport(valid), trust).refresh(NOW + TTL_MS + 1)).rejects.toThrow('PUBLIC_EXPORT_EXPIRED_OR_FUTURE')
  })

  it('jointly rejects a non-canonical spelling of the same decoded signature', async () => {
    const parsed = JSON.parse(new TextDecoder().decode(bytes())) as { signature: { value: string } }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    const value = parsed.signature.value
    const tail = alphabet.indexOf(value.at(-1)!)
    expect(tail % 16).toBe(0)
    parsed.signature.value = value.slice(0, -1) + alphabet[tail + 1]
    const nonCanonical = new TextEncoder().encode(JSON.stringify(parsed))
    await expect(new PublicExportConsumer(new FileTransport(nonCanonical), trustBundleFromBuildJson(JSON.stringify(bundle))).refresh(NOW))
      .rejects.toThrow('PUBLIC_EXPORT_SIGNATURE_VALUE')
  })
})
