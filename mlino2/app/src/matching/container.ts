// container.ts — سیم‌کشی وابستگی‌ها (تنها جایی که Singletonها ساخته می‌شوند)
// MatchingService فقط از BusinessDirectoryService داده می‌گیرد (سند 01 بخش ۲).

import { directoryService } from '../directory/BusinessDirectoryService';
import { MatchingService } from './MatchingService';

export const matchingService = new MatchingService(directoryService);
