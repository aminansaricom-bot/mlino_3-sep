# Dockerfile — سرو اپ V2 برای تست میدانی (دوربین/قطب‌نما فقط در Secure Context کار می‌کنند)
#
# تصمیم فنی (مستند در HANDOFF/20260907_docker_fieldtest_REPORT.md):
#   nginx:alpine به‌جای `vite preview` — تصویر کوچک‌تر (~50MB در برابر ~180MB Node)،
#   نماینده‌ی محیط واقعی production، و کنترل کامل روی TLS/هدرها (Permissions-Policy
#   برای camera/gyroscope). اپ V2 کاملاً استاتیک است؛ سرور Node ای لازم نیست.
#
# امنیت کلیدها (الزام دستور): build context با .dockerignore از .env*/*.local/scripts/
# پاک می‌شود — هیچ کلید API وارد image نمی‌شود. در Container، intent فقط
# قاعده‌محور (Edge-first) است؛ اتصال زنده‌ی LLM به تصمیم Backend آینده موکول است (L-2 بازبینی).
#
# شبکه‌ی این ماشین registry.npmjs.org را فیلتر می‌کند — پیش‌فرض ARG روی yarnpkg است
# (همان بسته‌ها، همان integrity hashes). در محیط عادی:
#   --build-arg NPM_REGISTRY=https://registry.npmjs.org

# ---------- مرحله‌ی ۱: build ----------
FROM node:22-alpine AS build
WORKDIR /app
ARG NPM_REGISTRY=https://registry.yarnpkg.com

# کلید نمایش نقشه‌ی نشان — عمداً از طریق build-arg، نه فایل env.
#
# چرا این با قاعده‌ی «هیچ کلیدی در image» تناقض ندارد: کلید `web.` نشان از
# جنس کلیدهای LLM نیست. طبق طراحی خودِ نشان محدود به دامنه است و برای
# نمایش در مرورگر ساخته شده — مثل کلید عمومی نقشه در هر اپ نقشه‌محور.
# آنچه همچنان مطلقاً ممنوع است: کلید `service.` نشان (مسیریابی/جست‌وجو) و
# کلیدهای LLM؛ آن‌ها سمت کلاینت نمی‌آیند و `.dockerignore` جلوی `.env*` را
# می‌گیرد. بدون این ARG، اپ ساخته می‌شود ولی نقشه صادقانه حالت خطا می‌دهد.
ARG V2_NESHAN_MAP_KEY=
ARG V2_NESHAN_MAPTYPE=dreamy
ENV V2_NESHAN_MAP_KEY=$V2_NESHAN_MAP_KEY
ENV V2_NESHAN_MAPTYPE=$V2_NESHAN_MAPTYPE

# .npmrc برای رجیستری نشان لازم است و باید پیش از npm ci حاضر باشد
COPY package.json package-lock.json .npmrc ./
# فقط URLهای lockfile به رجیستری انتخابی هدایت می‌شوند؛ integrityها دست‌نخورده و verify می‌شوند
RUN sed -i "s#https://registry.npmjs.org/#${NPM_REGISTRY}/#g" package-lock.json && npm ci
COPY . .
RUN npm run build

# ---------- مرحله‌ی ۲: سرو با nginx ----------
FROM nginx:1.27-alpine
# گواهی self-signed در build-time تولید می‌شود تا اجرا به اینترنت وابسته نباشد؛
# self-signed یعنی گوشی یک بار هشدار مرورگر را می‌پذیرد (راهنما در گزارش).
# برای گواهی دلخواه: volume روی /etc/nginx/certs جایگزین می‌کند.
RUN apk add --no-cache openssl && mkdir -p /etc/nginx/certs && \
    openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
      -keyout /etc/nginx/certs/dev-key.pem -out /etc/nginx/certs/dev-cert.pem \
      -subj "/CN=mlino2-dev" \
      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,DNS:mlino2-dev.local"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8443
