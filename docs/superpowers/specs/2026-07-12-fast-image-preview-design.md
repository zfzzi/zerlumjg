# Fast image preview and background upscale

## Goal

Reduce the time before a user can see a generated landscape image. The canvas must show the qweapi base image as soon as it is available, then continue the selected 2K–8K RunningHub upscale without blocking that preview. Generation controls must report real workflow stages instead of a synthetic percentage.

## Selected approach

Use an asynchronous upscale task with client polling.

1. The canvas sends the user's current prompt directly to `/api/zerlum-image`. Automatic prompt rewriting is removed from the image-generation action; users can still explicitly choose “一键生成提示词”.
2. `/api/zerlum-image` generates the base image through qweapi. When RunningHub upscale is configured, it uploads the base image, submits the upscale task, and returns immediately with the base image plus `upscaleTaskId`.
3. The canvas displays the base image immediately and polls `/api/zerlum-image-upscale-status?taskId=...` every three seconds.
4. When upscale completes, the selected version is replaced with the high-resolution result. If submission or polling fails, the base image remains successful and usable.

This avoids sending a multi-megabyte base64 image from the browser back to Vercel and avoids holding one serverless request open for the full RunningHub queue.

## Alternatives considered

- Keep the current synchronous request and only improve the progress animation. Rejected because it does not reduce time to first image and can still hit the 300-second function limit.
- Disable upscale completely. Rejected because 2K–8K output remains a product requirement.
- Return the base image, then upload it again from the browser through a second endpoint. Rejected because qweapi often returns large data URLs that approach Vercel request-body limits and add an unnecessary upload.

## API contracts

### `POST /api/zerlum-image`

Existing request fields remain compatible. For qweapi generation, the response becomes:

```json
{
  "imageUrl": "<base image>",
  "baseImageUrl": "<base image>",
  "upscaled": false,
  "upscalePending": true,
  "upscaleTaskId": "<RunningHub task id>",
  "resolution": "4k"
}
```

When upscale is unavailable or submission fails, the endpoint still returns HTTP 200 with the base image, `upscalePending: false`, and a user-readable `upscaleError`. Existing synchronous behavior remains available to callers that explicitly send `waitForUpscale: true`.

### `GET /api/zerlum-image-upscale-status`

The endpoint requires `taskId` and returns one of:

```json
{ "status": "running", "taskId": "..." }
{ "status": "done", "taskId": "...", "imageUrl": "..." }
{ "status": "error", "taskId": "...", "error": "..." }
```

The endpoint performs one RunningHub outputs/status query per request. It does not run a long server-side polling loop.

## Canvas behavior

- Stage 1: `生成原图中` while qweapi is running. No percentage is shown.
- Stage 2: `高清放大中` after the base image is visible and an upscale task exists.
- Final: `AI生成` after the high-resolution image replaces the base image.
- Fallback: `原图可用，高清放大未完成` when upscale fails. The version remains `done`, keeps the base image, and can be previewed or saved.
- Starting a new generation creates a new version; completion updates only the version and task id that initiated it.

## Local and production parity

The Vite development middleware and Vercel handlers must expose the same asynchronous contracts. A new `api/zerlum-image-upscale-status.ts` function provides the production status route.

## Tests and acceptance

- A failing source-contract test first proves that image generation no longer calls prompt rewriting implicitly.
- API tests prove base-image-first responses, task submission, status polling, and base-image fallback.
- UI tests prove stage labels do not display the old synthetic percentage.
- The full Node test suite and production build pass.
- Production verification confirms the base image appears before RunningHub upscale finishes, the status endpoint reaches `done`, and browser console errors remain empty.
