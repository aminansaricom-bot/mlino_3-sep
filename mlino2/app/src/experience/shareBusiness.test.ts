import { describe, expect, it, vi } from 'vitest';
import { businessShareText, shareBusiness } from './shareBusiness';

describe('minimal, explicit business sharing', () => {
  it('shares only identity and test-data disclosure, with no location or private choices', () => {
    const record = {name:'مکان آزمایشی',category:'cafe' as const,location:{latitude:35,longitude:51},viewed:['private'],liked:['private'],url:'https://private.invalid'};
    expect(businessShareText(record)).toBe('مکان آزمایشی\nکافه\nکشف با MLINO\nداده‌ی آزمایشی MLINO');
  });
  it('uses native share with text only', async () => {
    const share=vi.fn().mockResolvedValue(undefined), writeText=vi.fn();
    expect(await shareBusiness('text',{share,writeText})).toBe('shared');
    expect(share).toHaveBeenCalledWith({text:'text'});
    expect(writeText).not.toHaveBeenCalled();
  });
  it('treats cancellation as normal and never copies after cancellation', async () => {
    const share=vi.fn().mockRejectedValue({name:'AbortError'}), writeText=vi.fn();
    expect(await shareBusiness('text',{share,writeText})).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });
  it('falls back to copying on a real sharing error', async () => {
    const writeText=vi.fn().mockResolvedValue(undefined);
    expect(await shareBusiness('text',{share:vi.fn().mockRejectedValue(new Error('unavailable')),writeText})).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('text');
  });
  it('copies if native sharing is unavailable', async () => {
    expect(await shareBusiness('text',{writeText:vi.fn().mockResolvedValue(undefined)})).toBe('copied');
  });
  it('exposes manual text if both APIs are unavailable', async () => {
    expect(await shareBusiness('text',{})).toBe('manual');
  });
  it('exposes manual text if clipboard permission is denied', async () => {
    expect(await shareBusiness('text',{writeText:vi.fn().mockRejectedValue(new Error('denied'))})).toBe('manual');
  });
});
