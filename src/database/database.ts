import { Database } from '@nozbe/watermelondb';
import { modelClasses } from '@/entities';
import { adapter, createAdapter } from './adapter';

export { adapter, createAdapter };

export const database = new Database({
  adapter,
  modelClasses,
});
