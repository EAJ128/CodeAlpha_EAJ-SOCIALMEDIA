# Deployment / Migration TODO

## Firebase + Deployment (Cloud Run backend; Firebase Hosting for frontend)

- [ ] Update `server.ts` to only run `seedDatabase` when `SEED_DEMO_DATA=true` (avoid reseeding on every restart).
- [ ] Ensure production startup creates required directories even when `DATA_DIR` is missing/incorrect (guard/log).
- [ ] Update `README.md` to reflect the correct deployment approach: Firebase Hosting for frontend + Cloud Run for backend; remove/limit Docker instructions.
- [ ] Verify build/start commands locally for production (`npm run build` + `npm start`).

