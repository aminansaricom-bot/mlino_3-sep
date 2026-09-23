// Melino's face, carried over from Content Studio (components/assistant/AssistantOrb.tsx) without
// changing the character: fixed body, two eyes, a halo whose colour follows the state. Eight states.

export type AssistantState = 'idle' | 'thinking' | 'happy' | 'concerned' | 'warning' | 'suggesting' | 'celebrating' | 'processing';

const MOOD: Record<AssistantState, [string, string]> = {
  idle: ['#8a6bff', '#4d8dff'],
  thinking: ['#6a3fd6', '#402a8f'],
  happy: ['#2fe3e3', '#3ddc8a'],
  concerned: ['#f5a742', '#d6842a'],
  warning: ['#ff6b6b', '#d6483f'],
  suggesting: ['#4d8dff', '#2fe3e3'],
  celebrating: ['#8a6bff', '#ff6cc8'],
  processing: ['#2f8bff', '#00c2ff'],
};

function eyeTransform(state: AssistantState): string {
  switch (state) {
    case 'thinking': return 'scaleY(0.88)';
    case 'processing': return 'scale(0.92, 0.8)';
    case 'warning': return 'scaleY(0.55)';
    case 'suggesting': return 'scaleY(1.05)';
    default: return 'none';
  }
}

function arcEyes(state: AssistantState): 'up' | 'down' | null {
  if (state === 'happy' || state === 'celebrating') return 'up';
  if (state === 'concerned') return 'down';
  return null;
}

export default function Orb({ state, size = 60 }: { state: AssistantState; size?: number }) {
  const [a, b] = MOOD[state] ?? MOOD.idle;
  const arc = arcEyes(state);
  const motion = state === 'thinking' || state === 'processing' ? 'orb-tilt' : state === 'idle' || state === 'happy' || state === 'suggesting' ? 'orb-float' : '';
  const halo = state === 'thinking' || state === 'processing' || state === 'suggesting' || state === 'celebrating' ? 'orb-halo-fast' : 'orb-halo';
  const eye = (side: 'left' | 'right') => (
    <span key={side} className="orb-eye" style={{ left: side === 'left' ? '35%' : '65%' }}>
      {arc ? <svg viewBox="0 0 100 100" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
        <path d={arc === 'up' ? 'M8,62 Q50,18 92,62' : 'M8,40 Q50,84 92,40'} fill="none" stroke={a} strokeWidth="14" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${a})` }} />
      </svg> : <picture>
        <source srcSet={`/melino/melino-eye-${side}.webp`} type="image/webp" />
        <img src={`/melino/melino-eye-${side}.png`} alt="" style={{ transform: eyeTransform(state) }} />
      </picture>}
    </span>
  );
  return <span className={`orb ${motion}`} style={{ width: size, height: size }} aria-hidden="true">
    <span className={`orb-halo ${halo}`} style={{ background: `radial-gradient(closest-side, ${a} 0%, ${b} 45%, transparent 72%)` }} />
    <span className="orb-body">
      <picture><source srcSet="/melino/melino-core-base.webp" type="image/webp" /><img src="/melino/melino-core-base.png" alt="" draggable={false} /></picture>
      {eye('left')}{eye('right')}
    </span>
  </span>;
}
