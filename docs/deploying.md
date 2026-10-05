# Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`:

1. **Verify**: type-check (app and Convex), lint, unit tests, Convex function tests. Nothing deploys if any fail.
2. **Convex**: `npx convex deploy` to production, using `CONVEX_DEPLOY_KEY`.
3. **Vercel**: `vercel deploy --prod`, using `VERCEL_TOKEN`.
4. **Smoke test**: the home page and `/admin` load and the backend answers.

Pull requests run step 1 only. You can also run the whole thing from the Actions tab ("Run workflow").

## One-time setup (GitHub: Settings > Secrets and variables > Actions)

| Name | Kind | Where it comes from |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | Secret | Convex dashboard > project > production deployment > Settings > Deploy keys |
| `VERCEL_TOKEN` | Secret | vercel.com/account/tokens (scope it to the team) |
| `VERCEL_ORG_ID` | Variable | `.vercel/project.json` `orgId` (`team_Ur7JkyCeZNNDxDm39ydN6pcb`) |
| `VERCEL_PROJECT_ID` | Variable | `.vercel/project.json` `projectId` (`prj_pVzaWxBNJnLhuy5uvt0bGfbgm4EE`) |

Create an Actions environment named `production` (Settings > Environments) and, if you want a human gate before
each release, add yourself as a required reviewer there.

Runtime secrets (Stripe, Groq, auth keys, `ADMIN_PATH_ENABLED`…) stay in Vercel and Convex. They are not needed in GitHub.

## Rolling back

Vercel: Deployments > pick the last good one > Promote to Production. Convex: redeploy the previous commit (re-run
the workflow on it); schema changes in this project are additive, so older code keeps working against newer data.
