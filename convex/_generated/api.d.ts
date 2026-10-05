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
import type * as admin_activity from "../admin/activity.js";
import type * as admin_analytics from "../admin/analytics.js";
import type * as admin_announcements from "../admin/announcements.js";
import type * as admin_audit from "../admin/audit.js";
import type * as admin_certificates from "../admin/certificates.js";
import type * as admin_community from "../admin/community.js";
import type * as admin_content from "../admin/content.js";
import type * as admin_contentBuilder from "../admin/contentBuilder.js";
import type * as admin_errors from "../admin/errors.js";
import type * as admin_incidents from "../admin/incidents.js";
import type * as admin_insights from "../admin/insights.js";
import type * as admin_me from "../admin/me.js";
import type * as admin_mfa from "../admin/mfa.js";
import type * as admin_migrations from "../admin/migrations.js";
import type * as admin_staff from "../admin/staff.js";
import type * as admin_streaks from "../admin/streaks.js";
import type * as admin_tickets from "../admin/tickets.js";
import type * as admin_users from "../admin/users.js";
import type * as ai from "../ai.js";
import type * as announcements from "../announcements.js";
import type * as assessments from "../assessments.js";
import type * as auth from "../auth.js";
import type * as certificates from "../certificates.js";
import type * as community from "../community.js";
import type * as content from "../content.js";
import type * as crons from "../crons.js";
import type * as discussions from "../discussions.js";
import type * as emails from "../emails.js";
import type * as errors from "../errors.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as journal from "../journal.js";
import type * as learningProgress from "../learningProgress.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_contentRead from "../lib/contentRead.js";
import type * as lib_contentValidation from "../lib/contentValidation.js";
import type * as lib_contentWrite from "../lib/contentWrite.js";
import type * as lib_eligibility from "../lib/eligibility.js";
import type * as lib_emailQueue from "../lib/emailQueue.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_notices from "../lib/notices.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_profileSearch from "../lib/profileSearch.js";
import type * as lib_staff from "../lib/staff.js";
import type * as lib_streakMath from "../lib/streakMath.js";
import type * as lib_streakRestore from "../lib/streakRestore.js";
import type * as lib_taxonomy from "../lib/taxonomy.js";
import type * as lib_totp from "../lib/totp.js";
import type * as lib_validation from "../lib/validation.js";
import type * as migration from "../migration.js";
import type * as modules from "../modules.js";
import type * as notifications from "../notifications.js";
import type * as preferences from "../preferences.js";
import type * as profiles from "../profiles.js";
import type * as progress from "../progress.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tickets from "../tickets.js";
import type * as tools from "../tools.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  "admin/activity": typeof admin_activity;
  "admin/analytics": typeof admin_analytics;
  "admin/announcements": typeof admin_announcements;
  "admin/audit": typeof admin_audit;
  "admin/certificates": typeof admin_certificates;
  "admin/community": typeof admin_community;
  "admin/content": typeof admin_content;
  "admin/contentBuilder": typeof admin_contentBuilder;
  "admin/errors": typeof admin_errors;
  "admin/incidents": typeof admin_incidents;
  "admin/insights": typeof admin_insights;
  "admin/me": typeof admin_me;
  "admin/mfa": typeof admin_mfa;
  "admin/migrations": typeof admin_migrations;
  "admin/staff": typeof admin_staff;
  "admin/streaks": typeof admin_streaks;
  "admin/tickets": typeof admin_tickets;
  "admin/users": typeof admin_users;
  ai: typeof ai;
  announcements: typeof announcements;
  assessments: typeof assessments;
  auth: typeof auth;
  certificates: typeof certificates;
  community: typeof community;
  content: typeof content;
  crons: typeof crons;
  discussions: typeof discussions;
  emails: typeof emails;
  errors: typeof errors;
  goals: typeof goals;
  http: typeof http;
  journal: typeof journal;
  learningProgress: typeof learningProgress;
  "lib/analytics": typeof lib_analytics;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/contentRead": typeof lib_contentRead;
  "lib/contentValidation": typeof lib_contentValidation;
  "lib/contentWrite": typeof lib_contentWrite;
  "lib/eligibility": typeof lib_eligibility;
  "lib/emailQueue": typeof lib_emailQueue;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/errors": typeof lib_errors;
  "lib/notices": typeof lib_notices;
  "lib/permissions": typeof lib_permissions;
  "lib/profileSearch": typeof lib_profileSearch;
  "lib/staff": typeof lib_staff;
  "lib/streakMath": typeof lib_streakMath;
  "lib/streakRestore": typeof lib_streakRestore;
  "lib/taxonomy": typeof lib_taxonomy;
  "lib/totp": typeof lib_totp;
  "lib/validation": typeof lib_validation;
  migration: typeof migration;
  modules: typeof modules;
  notifications: typeof notifications;
  preferences: typeof preferences;
  profiles: typeof profiles;
  progress: typeof progress;
  subscriptions: typeof subscriptions;
  tickets: typeof tickets;
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
