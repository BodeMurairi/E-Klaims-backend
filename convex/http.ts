import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await request.text();
    const wh = new Webhook(webhookSecret);
    let event: { type: string; data: { id: string; email_addresses: { email_address: string }[]; first_name: string; last_name: string; image_url: string } };

    try {
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as typeof event;
    } catch {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    const { type, data } = event;
    const email = data.email_addresses?.[0]?.email_address ?? "";
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

    if (type === "user.created") {
      await ctx.runMutation(api.users.createFromWebhook, {
        clerkId: data.id,
        name,
        email,
        avatarUrl: data.image_url,
      });
    } else if (type === "user.updated") {
      await ctx.runMutation(api.users.syncFromWebhook, {
        clerkId: data.id,
        name,
        email,
        avatarUrl: data.image_url,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
