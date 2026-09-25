/**
 * The owner's voice-assistant microphone, drawn as SVG from his image: a capsule with two slots, a U-shaped holder,
 * a stem and a base. It takes the current colour (the brand green; the lighter green in dark mode).
 */
export default function MicIcon({ size = 26 }: { size?: number }) {
  return <svg className="mic-icon-rs" width={size} height={size} viewBox="104 150 1044 1044" aria-hidden="true" focusable="false">
    <defs>
      <mask id="mic-slots">
        <rect x="104" y="150" width="1044" height="1044" fill="#fff" />
        <rect x="505" y="383" width="243" height="66" rx="33" fill="#000" />
        <rect x="505" y="498" width="243" height="66" rx="33" fill="#000" />
      </mask>
    </defs>
    <rect x="417" y="165" width="418" height="715" rx="209" fill="currentColor" mask="url(#mic-slots)" />
    <path d="M313 627V670A312.5 312.5 0 0 0 938 670V627" fill="none" stroke="currentColor" strokeWidth="96" strokeLinecap="round" />
    <rect x="578" y="990" width="96" height="120" fill="currentColor" />
    <rect x="378" y="1090" width="495" height="90" rx="45" fill="currentColor" />
  </svg>;
}
