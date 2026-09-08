/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as ai from "../ai.js";
import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as certificates from "../certificates.js";
import type * as community from "../community.js";
import type * as discussions from "../discussions.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as journal from "../journal.js";
import type * as learningProgress from "../learningProgress.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_validation from "../lib/validation.js";
import type * as migration from "../migration.js";
import type * as modules from "../modules.js";
import type * as notifications from "../notifications.js";
import type * as preferences from "../preferences.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tools from "../tools.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  ai: typeof ai;
  assessments: typeof assessments;
  auth: typeof auth;
  certificates: typeof certificates;
  community: typeof community;
  discussions: typeof discussions;
  goals: typeof goals;
  http: typeof http;
  journal: typeof journal;
  learningProgress: typeof learningProgress;
  "lib/auth": typeof lib_auth;
  "lib/validation": typeof lib_validation;
  migration: typeof migration;
  modules: typeof modules;
  notifications: typeof notifications;
  preferences: typeof preferences;
  profiles: typeof profiles;
  progress: typeof progress;
  subscriptions: typeof subscriptions;
  tools: typeof tools;
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
