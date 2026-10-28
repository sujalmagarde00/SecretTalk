# SecretTalk deployment guide (Render frontend + Render backend)

## Before publishing
- This project is a student/demo app. It has not been fully build-tested in this environment.
- Do not commit passwords, database credentials, private keys, or real user data to GitHub.
- Use a persistent disk/object storage for uploaded files; container filesystems can be temporary.
- WebRTC calls may need a TURN server for reliable connections across networks. This project currently has a STUN-only ICE configuration.
- Configure a production database and back it up before deploying. Hibernate `ddl-auto=update` is convenient for a demo, not a full migration strategy.

## 1. Upload source to GitHub
1. Extract this ZIP.
2. Create a new GitHub repository (keep it private while testing if you prefer).
3. Upload the contents of the `SecretTalk` folder so `frontend/` and `backend/` are at the repository root.
4. Do not upload `node_modules`, passwords, `.env` files, or database dumps.

## 2. Create a MySQL database
Create a MySQL 8 database with a hosting provider you trust. Note its host, port, database name, username, and password. Ensure your backend host can reach it. The backend expects `DB_URL` to be a JDBC URL, e.g. `jdbc:mysql://HOST:3306/secretalk?useSSL=true&allowPublicKeyRetrieval=true` (adjust parameters to your provider). Never use a placeholder URL in production.

## 3. Deploy backend on Render using Docker
1. In Render, choose **New → Web Service**, connect the GitHub repository.
2. Select **Docker** as runtime/build method.
3. Set **Root Directory** to `backend` and Dockerfile path to `Dockerfile` if asked.
4. Add environment variables:
   - `DB_URL` = your provider's JDBC URL
   - `DB_USERNAME` = your database username
   - `DB_PASSWORD` = your database password
   - `APP_CORS_ORIGINS` = `https://YOUR-FRONTEND.vercel.app` (after Vercel deploy; comma-separate additional exact origins if needed)
   - `UPLOAD_DIR` = `/var/data/uploads` if you attach a persistent disk at `/var/data`; otherwise `/app/uploads` is temporary and uploaded files may disappear after redeploy/restart.
5. If you need file attachments to persist, attach a persistent disk at `/var/data` and set `UPLOAD_DIR=/var/data/uploads`. Availability/price of disks depends on your plan.
6. Deploy and copy the backend URL, e.g. `https://your-service.onrender.com`.

## 4. Deploy frontend on Render Static Site
1. In Render, choose **New → Static Site**, connect the same GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm ci && npm run build`. Publish directory: `dist`.
4. Add environment variable `VITE_API_URL` = your deployed backend URL (no trailing slash), e.g. `https://your-service.onrender.com`.
5. Deploy and copy the final static-site URL.
6. Go to the backend service environment and set `APP_CORS_ORIGINS` to the exact frontend origin, e.g. `https://your-site.onrender.com` (no trailing slash), then redeploy the backend.

Keeping frontend and backend on Render's `onrender.com` subdomains helps avoid cross-site session-cookie issues compared with hosting the frontend on a completely different domain. If you use a different frontend host, test login/session cookies carefully; browsers may block cross-site cookies.

## 5. Test deployment
- Open the frontend URL and register two test accounts.
- Test login/logout, search, messages, attachments, theme, call history and call signaling.
- Test audio/video calls on two different devices/networks.
- Browser notifications require permission and usually work only on HTTPS (or localhost).
- Free hosting tiers may sleep or have limits; first request can take time to wake up.

## Important limitations
- No deployment can be considered production-ready until build and end-to-end tests pass.
- Never publish private chats or personal data while testing. Review authentication, authorization, upload validation, HTTPS, rate limiting, and privacy controls before inviting real users.
