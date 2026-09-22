/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_RELOCATE?: string;
  readonly VITE_DEMO_ANCHOR?: string;
  /** کلید API DeepSeek — فقط از env؛ هرگز در ریپو/کد (الزام ۴ دستور LLM) */
  readonly V2_DEEPSEEK_API_KEY?: string;
  /** کلید API Gemini — فقط از env؛ هرگز در ریپو/کد */
  readonly V2_GEMINI_API_KEY?: string;
  /** شناسه‌ی پلن کاربر — از config می‌آید؛ بدون پلن، Edge-first قاعده‌محور */
  readonly V2_PLAN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
