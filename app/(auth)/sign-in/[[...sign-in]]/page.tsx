import { SignIn } from "@clerk/nextjs";
import { clerkClient } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

const HARDCODED_ADMIN = {
  email: "admin@eklaims.local",
  password: "Admin@12345",
  firstName: "Insurance",
  lastName: "Admin",
  username: "insurance_admin",
};

let bootstrapPromise: Promise<void> | null = null;

async function bootstrapHardcodedAdmin() {
  const client = await clerkClient();
  const existing = await client.users.getUserList({
    emailAddress: [HARDCODED_ADMIN.email],
    limit: 1,
  });

  const name = `${HARDCODED_ADMIN.firstName} ${HARDCODED_ADMIN.lastName}`;
  let clerkUserId: string;

  if (existing.data.length > 0) {
    const user = existing.data[0];
    clerkUserId = user.id;

    await client.users.updateUser(user.id, {
      firstName: HARDCODED_ADMIN.firstName,
      lastName: HARDCODED_ADMIN.lastName,
      password: HARDCODED_ADMIN.password,
      skipPasswordChecks: true,
    });

    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...(user.publicMetadata as Record<string, unknown>),
        role: "admin",
        onboardingComplete: true,
      },
    });
  } else {
    const user = await client.users.createUser({
      emailAddress: [HARDCODED_ADMIN.email],
      password: HARDCODED_ADMIN.password,
      firstName: HARDCODED_ADMIN.firstName,
      lastName: HARDCODED_ADMIN.lastName,
      skipPasswordChecks: true,
      publicMetadata: {
        role: "admin",
        onboardingComplete: true,
      },
    });
    clerkUserId = user.id;
  }

  await fetchMutation(api.users.completeOnboarding, {
    clerkId: clerkUserId,
    role: "admin",
    username: HARDCODED_ADMIN.username,
    name,
    email: HARDCODED_ADMIN.email,
  });
}

async function ensureHardcodedAdmin() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapHardcodedAdmin().catch((error) => {
      console.error("Failed to bootstrap hardcoded admin", error);
    });
  }
  await bootstrapPromise;
}

export default async function SignInPage() {
  await ensureHardcodedAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">E-Klaims</h1>
        </div>
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-semibold">Hardcoded Admin Credentials</p>
          <p>Email: {HARDCODED_ADMIN.email}</p>
          <p>Password: {HARDCODED_ADMIN.password}</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
