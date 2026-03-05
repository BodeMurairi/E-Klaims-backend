import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(webhookSecret);
  let event: WebhookEvent;

  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  const { type, data } = event;
  const email = (data as { email_addresses?: { email_address: string }[] }).email_addresses?.[0]?.email_address ?? "";
  const firstName = (data as { first_name?: string }).first_name ?? "";
  const lastName = (data as { last_name?: string }).last_name ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  const imageUrl = (data as { image_url?: string }).image_url;

  if (type === "user.created") {
    await fetchMutation(api.users.createFromWebhook, {
      clerkId: data.id,
      name,
      email,
      avatarUrl: imageUrl,
    });
  } else if (type === "user.updated") {
    await fetchMutation(api.users.syncFromWebhook, {
      clerkId: data.id,
      name,
      email,
      avatarUrl: imageUrl,
    });
  }

  return new Response("OK", { status: 200 });
}
