# SportTracker.Web

Ionic React frontend for the SportTracker API. This is the step 4g skeleton; feature pages are placeholders until their dedicated lots are integrated.

## Local development

```sh
npm ci
npm run dev
```

The development API is `http://localhost:5294`; production uses `https://api.fmon-vps-n8n.fr`. Set `VITE_API_BASE_URL` to override either address.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install webkit
npx playwright test
```

`npm run gen:api` regenerates `src/api/schema.d.ts` from the local API's `/openapi/v1.json`; start the API first.

All navigation routes for the planned features are declared in `src/app/routes.tsx`. Feature lots implement the corresponding exported page components within their `src/features/<feature>/` folder. The live route is outside `IonTabs`; detail routes use Ionic's nested outlet for iOS back gestures.
