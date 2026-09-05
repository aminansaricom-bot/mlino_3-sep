// container.ts (ar) — سیم‌کشی سرویس AR؛ داده فقط از BusinessDirectoryService (سند 01 بخش ۲)
import { directoryService } from '../directory/BusinessDirectoryService';
import { ArOverlayService } from './ArOverlayService';

export const arOverlayService = new ArOverlayService(directoryService);
