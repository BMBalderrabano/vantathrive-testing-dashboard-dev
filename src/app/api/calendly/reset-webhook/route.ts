import { NextResponse } from "next/server";

import { isFlywheelOperatorEmail } from "@/lib/auth/flywheel";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

const CALENDLY_API = "https://api.calendly.com/webhook_subscriptions";

const WEBHOOK_EVENTS = [
  "invitee.created",
  "invitee.canceled",
  "invitee_no_show.created",
  "invitee_no_show.deleted",
] as const;

type CalendlySubscription = {
  uri?: string;
  callback_url?: string;
  state?: string;
  events?: string[];
};

type StepLog = {
  step: "list" | "delete" | "create";
  ok: boolean;
  status: number;
  detail: unknown;
};

function config() {
  const token = process.env.CALENDLY_API_TOKEN?.trim();
  const organization = process.env.CALENDLY_ORGANIZATION_URI?.trim();
  const webhookUrl = process.env.CALENDLY_WEBHOOK_URL?.trim();
  const signingKey = process.env.CALENDLY_SIGNING_KEY?.trim();
  const missing = [
    !token && "CALENDLY_API_TOKEN",
    !organization && "CALENDLY_ORGANIZATION_URI",
    !webhookUrl && "CALENDLY_WEBHOOK_URL",
    !signingKey && "CALENDLY_SIGNING_KEY",
  ].filter(Boolean);

  if (missing.length > 0 || !token || !organization || !webhookUrl || !signingKey) {
    return { error: `Missing ${missing.join(", ")}` } as const;
  }

  return { token, organization, webhookUrl, signingKey } as const;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function listSubscriptions(
  token: string,
  organization: string,
): Promise<{ ok: true; items: CalendlySubscription[]; raw: unknown } | { ok: false; status: number; detail: unknown }> {
  const items: CalendlySubscription[] = [];
  const pages: unknown[] = [];
  let nextUrl: string | null = (() => {
    const url = new URL(CALENDLY_API);
    url.searchParams.set("scope", "organization");
    url.searchParams.set("organization", organization);
    url.searchParams.set("count", "100");
    return url.toString();
  })();

  for (let page = 0; page < 10 && nextUrl; page += 1) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const detail = await readBody(response);
    pages.push(detail);
    if (!response.ok) {
      return { ok: false, status: response.status, detail };
    }

    const body = detail as {
      collection?: CalendlySubscription[];
      pagination?: { next_page?: string | null };
    };
    items.push(...(body.collection ?? []));
    nextUrl = body.pagination?.next_page ?? null;
  }

  return { ok: true, items, raw: pages.length === 1 ? pages[0] : pages };
}

export async function POST() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isFlywheelOperatorEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = config();
  if ("error" in settings) {
    return NextResponse.json({ error: settings.error }, { status: 500 });
  }

  const steps: StepLog[] = [];
  const listed = await listSubscriptions(settings.token, settings.organization);
  if (!listed.ok) {
    steps.push({ step: "list", ok: false, status: listed.status, detail: listed.detail });
    return NextResponse.json({ error: "Failed to list webhook subscriptions", steps }, { status: 502 });
  }

  const matches = listed.items.filter((item) => item.callback_url === settings.webhookUrl);
  steps.push({
    step: "list",
    ok: true,
    status: 200,
    detail: {
      matchCount: matches.length,
      matches: matches.map((item) => ({
        uri: item.uri,
        callback_url: item.callback_url,
        state: item.state,
        events: item.events,
      })),
      response: listed.raw,
    },
  });

  if (matches.length > 1) {
    return NextResponse.json(
      {
        error: `Expected one webhook for ${settings.webhookUrl}, found ${matches.length}. Nothing was deleted or created.`,
        steps,
      },
      { status: 409 },
    );
  }

  const match = matches[0];
  if (match?.uri) {
    const response = await fetch(match.uri, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${settings.token}` },
    });
    const detail = await readBody(response);
    steps.push({ step: "delete", ok: response.ok, status: response.status, detail: detail ?? { uri: match.uri } });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to delete the current webhook", steps }, { status: 502 });
    }
  } else {
    steps.push({
      step: "delete",
      ok: true,
      status: 204,
      detail: { skipped: true, reason: "No subscription matched the webhook URL" },
    });
  }

  const createResponse = await fetch(CALENDLY_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: settings.webhookUrl,
      events: WEBHOOK_EVENTS,
      organization: settings.organization,
      scope: "organization",
      signing_key: settings.signingKey,
    }),
  });
  const created = await readBody(createResponse);
  steps.push({
    step: "create",
    ok: createResponse.ok,
    status: createResponse.status,
    detail: created,
  });

  if (!createResponse.ok) {
    return NextResponse.json({ error: "Failed to register the webhook", steps }, { status: 502 });
  }

  return NextResponse.json({ ok: true, steps });
}
