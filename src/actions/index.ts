/**
 * Server actions (admin mutations + login). All inputs are validated with Zod; every admin
 * action re-checks the session (middleware only resolves it) and is rate limited per user.
 * Actions call services — never the database directly.
 */
import { ActionError, defineAction, type ActionAPIContext } from 'astro:actions';
import { env } from '../lib/config/env';
import { attemptLogin } from '../lib/auth/login';
import {
  clearSessionCookie,
  createSession,
  invalidateSession,
  sessionCookieName,
  setSessionCookie,
} from '../lib/auth/session';
import { clientKey, RateLimiter } from '../lib/http/rate-limit';
import * as admin from '../lib/services/admin';
import {
  attractionSchema,
  dayCreateSchema,
  dayUpdateSchema,
  destinationSchema,
  idSchema,
  loginSchema,
  mediaUpdateSchema,
  mediaUploadSchema,
  moveSchema,
  routeCreateSchema,
  routeStatusSchema,
  routeUpdateSchema,
  safeNext,
  stopCreateSchema,
  stopUpdateSchema,
} from '../lib/validation/route';

const mutationLimiter = new RateLimiter(120, 60_000);

function requireAdmin(context: ActionAPIContext) {
  const user = context.locals.admin;
  if (!user) throw new ActionError({ code: 'UNAUTHORIZED', message: 'Please sign in again.' });
  if (!mutationLimiter.hit(`admin:${user.id}`)) {
    throw new ActionError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many changes in a minute — slow down.',
    });
  }
  return user;
}

/** Wrap a service call: admin check + domain errors → ActionError. */
function adminAction<I, O>(fn: (input: I, context: ActionAPIContext) => Promise<O>) {
  return async (input: I, context: ActionAPIContext) => {
    requireAdmin(context);
    try {
      return await fn(input, context);
    } catch (err) {
      if (err instanceof admin.AdminError)
        throw new ActionError({ code: err.code, message: err.message });
      if (err instanceof ActionError) throw err;
      console.error('[admin] action failed', err);
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not save. Please try again.',
      });
    }
  };
}

export const server = {
  login: defineAction({
    accept: 'form',
    input: loginSchema,
    handler: async ({ email, password, next }, context) => {
      const key = clientKey(context.request, context.clientAddress, env().TRUST_PROXY);
      const result = await attemptLogin(email, password, key);
      if (!result.ok) {
        throw new ActionError(
          result.reason === 'rate_limited'
            ? { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Try again in 15 minutes.' }
            : { code: 'UNAUTHORIZED', message: 'Email or password is incorrect.' },
        );
      }
      const { token, expiresAt } = await createSession(result.user.id);
      setSessionCookie(context.cookies, token, expiresAt);
      return { redirect: safeNext(next) };
    },
  }),

  logout: defineAction({
    accept: 'form',
    handler: async (_input, context) => {
      await invalidateSession(context.cookies.get(sessionCookieName())?.value);
      clearSessionCookie(context.cookies);
      return { ok: true };
    },
  }),

  createRoute: defineAction({
    accept: 'form',
    input: routeCreateSchema,
    handler: adminAction(async (input) => ({ id: await admin.createRoute(input) })),
  }),
  updateRoute: defineAction({
    accept: 'form',
    input: routeUpdateSchema,
    handler: adminAction(async (input) => (await admin.updateRoute(input), { id: input.id })),
  }),
  setRouteStatus: defineAction({
    accept: 'form',
    input: routeStatusSchema,
    handler: adminAction(async ({ id, status }) => {
      const result = await admin.setRouteStatus(id, status);
      if (!result.ok)
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: `Cannot publish yet: ${result.problems.join(' ')}`,
        });
      return { id, status };
    }),
  }),

  addDay: defineAction({
    accept: 'form',
    input: dayCreateSchema,
    handler: adminAction(async ({ routeId, ...day }) => ({ id: await admin.addDay(routeId, day) })),
  }),
  updateDay: defineAction({
    accept: 'form',
    input: dayUpdateSchema,
    handler: adminAction(async ({ id, ...day }) => (await admin.updateDay(id, day), { id })),
  }),
  deleteDay: defineAction({
    accept: 'form',
    input: idSchema,
    handler: adminAction(async ({ id }) => (await admin.deleteDay(id), { id })),
  }),
  moveDay: defineAction({
    accept: 'form',
    input: moveSchema,
    handler: adminAction(async ({ id, direction }) => (await admin.moveDay(id, direction), { id })),
  }),

  addStop: defineAction({
    accept: 'form',
    input: stopCreateSchema,
    handler: adminAction(async ({ dayId, ...stop }) => ({ id: await admin.addStop(dayId, stop) })),
  }),
  updateStop: defineAction({
    accept: 'form',
    input: stopUpdateSchema,
    handler: adminAction(async ({ id, ...stop }) => (await admin.updateStop(id, stop), { id })),
  }),
  deleteStop: defineAction({
    accept: 'form',
    input: idSchema,
    handler: adminAction(async ({ id }) => (await admin.deleteStop(id), { id })),
  }),
  moveStop: defineAction({
    accept: 'form',
    input: moveSchema,
    handler: adminAction(
      async ({ id, direction }) => (await admin.moveStop(id, direction), { id }),
    ),
  }),

  saveDestination: defineAction({
    accept: 'form',
    input: destinationSchema,
    handler: adminAction(async (input) => (await admin.saveDestination(input), { ok: true })),
  }),
  saveAttraction: defineAction({
    accept: 'form',
    input: attractionSchema,
    handler: adminAction(async (input) => (await admin.saveAttraction(input), { ok: true })),
  }),

  uploadMedia: defineAction({
    accept: 'form',
    input: mediaUploadSchema,
    handler: adminAction(async (input) => ({ id: await admin.uploadMedia(input) })),
  }),
  updateMedia: defineAction({
    accept: 'form',
    input: mediaUpdateSchema,
    handler: adminAction(async (input) => (await admin.updateMedia(input), { id: input.id })),
  }),
};
