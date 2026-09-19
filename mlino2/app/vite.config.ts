import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { randomUUID } from 'node:crypto'

// dev: HTTPS پیش‌فرض (localhost). dev:https: + گواهی خودامضا برای تست میدانی AR
// روی گوشی واقعی در همان شبکه‌ی LAN (دوربین/قطب‌نما فقط در Secure Context کار می‌کنند).
// NOTE(field-test): گواهی basic-ssl خودامضا است — مرورگر گوشی یک بار هشدار می‌دهد؛
// زیرساخت deploy عمومی جداگانه و فقط با تصمیم مالک محصول.
export default defineConfig(({ command, mode }) => {
  const httpsMode = mode === 'https' || process.env.V2_DEV_HTTPS === '1'
  // شناسه صرفاً عمومی است؛ هر build شناسهٔ تازه می‌گیرد و همان مقدار در برنامه و فایل نسخه می‌نشیند.
  const buildId = `${new Date().toISOString().replace(/[^0-9]/g, '')}-${randomUUID()}`
  return {
    plugins: [react(), ...(httpsMode ? [basicSsl()] : []), {
      name: 'mlino-public-build-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build_id: buildId }) })
      },
    }],
    define: { 'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId) },
    // کلیدها/پلن فقط از env (الزام ۴ دستور LLM) — پیشوند V2_ عمداً جدا از VITE_ است
    // تا از تصادفی‌بودن خروجی‌های کلاینتی تفکیک بماند؛ هرگز در ریپو Commit نمی‌شوند.
    envPrefix: ['VITE_', 'V2_'],
    server: httpsMode
      ? {
          host: true, // دسترسی از گوشی در LAN
          https: true,
        }
      : undefined,
  }
})
