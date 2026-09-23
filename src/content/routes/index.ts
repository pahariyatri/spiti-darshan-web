/** Every route file must be listed here. Order = order on /routes/ (featured first). */
import type { RouteContent } from '../types';
import { shimlaToSpiti } from './shimla-to-spiti';

export const routeContent: RouteContent[] = [shimlaToSpiti];
