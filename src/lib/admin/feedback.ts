import { isInputError } from 'astro:actions';

type AnyResult = { data?: unknown; error?: unknown } | undefined;

export interface Feedback {
  submitted: boolean;
  ok: boolean;
  message: string | null;
  fields: Record<string, string[] | undefined>;
}

/** Collapse the results of the actions a page can receive into one message for the template. */
export function feedbackFrom(results: AnyResult[]): Feedback {
  const hit = results.find((r) => r !== undefined);
  if (!hit) return { submitted: false, ok: false, message: null, fields: {} };
  if (!hit.error) return { submitted: true, ok: true, message: null, fields: {} };
  const err = hit.error as { message?: string };
  if (isInputError(hit.error)) {
    return {
      submitted: true,
      ok: false,
      message: 'Please fix the highlighted fields.',
      fields: hit.error.fields,
    };
  }
  return {
    submitted: true,
    ok: false,
    message: err.message ?? 'Something went wrong.',
    fields: {},
  };
}
