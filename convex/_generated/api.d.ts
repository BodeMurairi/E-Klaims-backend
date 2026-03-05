/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_aiStubs from "../actions/aiStubs.js";
import type * as actions_clerkAdmin from "../actions/clerkAdmin.js";
import type * as auditLogs from "../auditLogs.js";
import type * as claims from "../claims.js";
import type * as documentRequirements from "../documentRequirements.js";
import type * as documents from "../documents.js";
import type * as fileStorage from "../fileStorage.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as policies from "../policies.js";
import type * as proposals from "../proposals.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/aiStubs": typeof actions_aiStubs;
  "actions/clerkAdmin": typeof actions_clerkAdmin;
  auditLogs: typeof auditLogs;
  claims: typeof claims;
  documentRequirements: typeof documentRequirements;
  documents: typeof documents;
  fileStorage: typeof fileStorage;
  http: typeof http;
  messages: typeof messages;
  notifications: typeof notifications;
  policies: typeof policies;
  proposals: typeof proposals;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
