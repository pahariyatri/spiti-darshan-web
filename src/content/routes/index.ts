/** Every route file must be listed here. Order = order on /routes/ (featured first). */
import type { RouteContent } from '../types';
import { shimlaToSpiti } from './shimla-to-spiti';
import { winterSpiti7Days } from './winter-spiti-7-days';
import { winterSpiti8Days } from './winter-spiti-8-days';

export const routeContent: RouteContent[] = [shimlaToSpiti, winterSpiti7Days, winterSpiti8Days];
