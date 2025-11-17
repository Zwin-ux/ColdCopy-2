# ColdCopy

ColdCopy is a minimalist cold email creator that chains strict stage-based prompts so outreach stays focused, compliant, and reproducible even if the user never touches the prompts again.

## Backend pipeline

- **Target scrape**: extracts the `TargetProfile` JSON fields from the supplied text.
- **Signal extraction**: derives buying, credibility, and emotional hooks for outreach.
- **Angle generation**: produces three focused angles (value, curiosity, social) tied to the target signals.
- **Template assembly**: stitches an offer, angle, and signals into a four-line draft within 90 words.
- **Tone adapter**: rewrites the draft into one of the four supported tones (friendly, professional, aggressive, minimalist).
- **Humanizer**: injects subtle imperfections and human cadence for the final email.

The Express `/api/generate` endpoint validates input with `zod`, logs each stage, and lets you reuse cached research when regenerating with a new angle. Each response now includes a `deliverability` insight (risk level, cues, and recommendations) derived from the extracted signals to help you stay Gmail-compliant. A `/api/batch` route still exists for successive exports, and the new `/api/crm` route converts CRM-bound entries (research + final email + deliverability notes) into CSV for easy copy/paste into your CRM or automation platform.

### Running the backend

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in `OPENAI_API_KEY`, `OPENAI_MODEL` (optional), and `PORT` if you want a different port.
3. Start in dev mode: `npm run dev`
4. Build for production: `npm run build`

### Request payload

| Field | Notes |
| --- | --- |
| `offer` | What you're selling (required). |
| `targetText` | Link/blurb describing the prospect (required if no cache). |
| `tone` | One of `friendly`, `professional`, `aggressive`, `minimalist`. |
| `selectedAngle` | Optional, pass `value_angle`, `curiosity_angle`, or `social_angle`. |
| `cachedProfile`, `cachedSignals`, `cachedAngles` | Include when you only want to regenerate the email with a different angle. |

Response contains the research snapshot plus the final `FinalEmail` body and its `selected_angle` meta.

## Frontend (Vite + React)

- Located in `client/`, served via `vite --config client/vite.config.ts`.
- The UI sends the offer, target blurb, and tone to the backend and displays:
  - Industry/role/company plus the combined buying/emotional summary.
  - All three signals as pills for quick reference.
  - The final email in a monospace block with a copy button.
  - A regenerate button that cycles through the remaining angles while reusing the cached research.
- The UI also highlights differentiation ideas (compliance, deliverability, ROI) so you’re reminded to stay niche.

### Running the client

1. `npm run client:dev` to start the dev server (default port 5173). Set `VITE_API_BASE_URL` in your shell if the API runs elsewhere or add it to a `.env` file inside `client/`.
2. `npm run client:build` to produce `client/dist` assets.

### Verification commands
- `npm run test` to execute `vitest`, covering the pipeline stage sequence plus the new CRM export integration.

Run these commands locally to confirm both sides compile.

```bash
npm run build
npm run client:build
npm run client:dev
```

Kill the dev server (`Ctrl+C`) after you see the Vite ready output before continuing work.

### CI safeguards
- `npm run test` to run `vitest`, which mocks the pipeline executor and verifies the stage order plus the selected angle metadata.

- `/.github/workflows/ci.yml` installs deps, builds the backend, and runs the Vite build so every push/PR keeps the deterministic pipeline in sync.

## Differentiation & risk notes

- Target niches such as GDPR/CAN-SPAM compliance tooling, multi-channel (LinkedIn + email) workflows, or vertical-specific templates to stand out in a crowded AI outreach space.
- Watch deliverability (Gmail AI filters, engagement signals) and call out ethical safeguards.
- Campaigns that treat ROI seriously often cite ~$36 return per $1 spent—ColdCopy keeps that ROI narrative front and center.
- For competitor scouting use G2 directories and other ratings (50+ options) to inspire your templates.

## Assets

- Logo prompt for future image models: `logo_prompt` at the repo root.
- Black background mail icon (the supplied PNG) is copied into `client/public/logo.png` and shown in the UI.

## Testing & builds

- `npm run build` (backend TypeScript compile).
- `npm run client:build` (Vite React bundle).
