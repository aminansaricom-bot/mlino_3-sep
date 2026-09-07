/**
 * اعلان تایپ برای SDK لیفلت نشان.
 *
 * پکیج نشان تایپ همراه ندارد، اما روی همان Leaflet 1.9.4 ساخته شده — پس
 * تایپ‌های رسمی `@types/leaflet` (که از قبل نصب است) دقیقاً همان API را
 * توصیف می‌کنند. اینجا فقط همان‌ها را دوباره صادر می‌کنیم و گزینه‌های
 * اختصاصی نشان را به `MapOptions` اضافه می‌کنیم.
 *
 * عمداً `any` نگذاشتیم: با این کار مارکر، آیکون، رویدادها و متدهای نقشه
 * همگی تایپ‌دار می‌مانند و اشتباه در زمان کامپایل گرفته می‌شود.
 */
declare module '@neshan-maps-platform/leaflet' {
  import * as L from 'leaflet';

  module 'leaflet' {
    interface MapOptions {
      /** کلید دسترسی نشان از نوع وب (`web.*`) — محدود به دامنه */
      key?: string;
      /** استایل نقشه: dreamy، standard-night و … */
      maptype?: string;
      /** لایه‌ی مکان‌ها — طبق مستندات نشان در SDK لیفلت به‌روزرسانی نمی‌شود */
      poi?: boolean;
      /** لایه‌ی ترافیک زنده — همان محدودیت */
      traffic?: boolean;
    }
  }

  export = L;
}

declare module '@neshan-maps-platform/leaflet/dist/leaflet.css';
