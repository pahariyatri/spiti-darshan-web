import { and, count, desc, gte, sql } from 'drizzle-orm';
import { db, schema as s } from '../db/client';
import type { EventType } from '../validation/lead';

export interface LeadIntentInput {
  eventType: EventType;
  routeId: number | null;
  dayNumber: number | null;
  ctaLocation: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
}

export async function insertLeadIntent(input: LeadIntentInput) {
  await db().insert(s.leadIntents).values(input);
}

export async function leadSummary(days: number) {
  const since = new Date(Date.now() - days * 86_400_000);
  const where = gte(s.leadIntents.createdAt, since);
  const byType = await db()
    .select({ eventType: s.leadIntents.eventType, total: count() })
    .from(s.leadIntents)
    .where(where)
    .groupBy(s.leadIntents.eventType);
  const byCta = await db()
    .select({ cta: s.leadIntents.ctaLocation, total: count() })
    .from(s.leadIntents)
    .where(and(where, sql`${s.leadIntents.eventType} = 'whatsapp_click'`))
    .groupBy(s.leadIntents.ctaLocation)
    .orderBy(desc(count()));
  const bySource = await db()
    .select({
      source: sql<string>`coalesce(${s.leadIntents.utmSource}, ${s.leadIntents.referrerHost}, '(direct)')`,
      total: count(),
    })
    .from(s.leadIntents)
    .where(and(where, sql`${s.leadIntents.eventType} = 'whatsapp_click'`))
    .groupBy(sql`1`)
    .orderBy(desc(count()))
    .limit(10);
  return { byType, byCta, bySource };
}
