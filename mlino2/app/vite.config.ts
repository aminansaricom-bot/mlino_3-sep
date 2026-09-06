import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// dev: HTTPS پیش‌فرض (localhost). dev:https: + گواهی خودامضا برای تست میدانی AR
// روی گوشی واقعی در همان شبکه‌ی LAN (دوربین/قطب‌نما فقط در Secure Context کار می‌کنند).
// NOTE(field-test): گواهی basic-ssl خودامضا است — مرورگر گوشی یک بار هشدار می‌دهد؛
// زیرساخت deploy عمومی جداگانه و فقط با تصمیم مالک محصول.
export default defineConfig(({ command, mode }) => {
  const httpsMode = mode === 'https' || process.env.V2_DEV_HTTPS === '1'
  return {
    plugins: httpsMode ? [react(), basicSsl()] : [react()],
    server: httpsMode
      ? {
          host: true, // دسترسی از گوشی در LAN
          https: true,
        }
      : undefined,
  }
})
