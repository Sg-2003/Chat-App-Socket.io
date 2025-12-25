# QuickChat — MERN Real-time Chat

A compact, clear guide to running and contributing to QuickChat — a small real-time messaging app built with MongoDB, Express, React (Vite), Node and Socket.IO.

---

## Table of contents
- Quick start
- Environment variables
- Project structure
- How it works (brief)
- API examples (curl)
- Troubleshooting (Network / Upload issues)
- Development notes
- Deploy & testing
- Contributing & license

---

## Quick start (run locally)
1. Clone & open the repo
   ```bash
   git clone <repo-url>
   cd ChatApp
   ```
2. Start the server (in one terminal)
   ```bash
   cd server
   npm install
   npm run server    # nodemon -> server runs on PORT (default 5000)
   ```
3. Start the client (in another terminal)
   ```bash
   cd client
   npm install
   npm run dev       # Vite dev server (default 5173)
   ```
4. Visit http://localhost:5173 and sign up / log in

---

## Environment variables (server)
Create `server/.env` and set:
```env
MONGODB_URI=your_mongo_connection_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```
Client (optional local override):
```env
# client/.env
VITE_BACKEND_URL=http://localhost:5000
```

---

## Project structure (detailed & why it matters)

A clear map of where features live and what to edit for common tasks. Use this as a quick reference when you add features or debug problems.

```
ChatApp/
├─ client/
│  ├─ public/                 # static files served by Vite (index.html, favicon)
│  ├─ src/
│  │  ├─ assets/              # icons, images and exported assets used across UI
│  │  ├─ components/          # reusable UI components
│  │  │  ├─ Sidebar.jsx       # user list / select user -> updates ChatContext
│  │  │  ├─ ChatContainer.jsx # chat view, file input + message sending
│  │  │  └─ RightSidebar.jsx  # profile / media view
│  │  ├─ pages/               # views mounted by routes (Home, Login, Profile)
│  │  ├─ context/             # app state and side-effects
│  │  │  ├─ AuthContext.jsx   # axios baseURL / token header, socket connect/disconnect
│  │  │  └─ ChatContext.jsx   # messages, users, sendMessage/getMessages (central chat logic)
│  │  ├─ lib/                 # helpers (formatting, small utilities)
│  │  ├─ main.jsx / App.jsx   # entry point and route setup
│  └─ package.json
├─ server/
│  ├─ controllers/           # core business logic (messageController handles cloudinary upload)
│  ├─ models/                # Mongoose schemas (User.js, Message.js)
│  ├─ routes/                # express route definitions (auth, messages)
│  ├─ middleware/            # auth.js — JWT verification for protected routes
│  ├─ lib/
│  │  ├─ db.js               # database connection (uses MONGODB_URI)
│  │  └─ cloudinary.js       # cloudinary config & export
│  ├─ server.js              # entry point: express setup, body size limits, socket.io
│  └─ package.json
├─ README.md
```

### Why these files matter (quick)
- `client/context/AuthContext.jsx` — **critical**: sets axios baseURL and token header, and opens the socket connection. If auth or sockets fail, start debugging here.
- `client/context/ChatContext.jsx` — **chat logic hub**: fetching users/messages, sending messages, updating unseen counts. Modify here to change how messaging behaves. Keep functions stable (useCallback) so effects don't refire.
- `client/components/ChatContainer.jsx` — **send/preview images**: adjust `handleSendImage` if you switch to multipart uploads or direct Cloudinary uploads.
- `server/server.js` — **server config**: body-parser limits (avoid PayloadTooLarge), CORS, and Socket.IO initialization. Increase JSON limit here if needed or add multer.
- `server/controllers/messageController.js` — **message lifecycle**: where image upload to Cloudinary happens and messages are saved. Swap logic here when moving to direct client uploads or to multer-based multipart handling.
- `server/middleware/auth.js` — **access control**: verify JWT and set `req.user`. If routes return auth errors, check this file and `JWT_SECRET`.

### Common change tasks — where to start
- Add a new API route: edit `server/routes/*` then the handler in `server/controllers/*` and update client axios calls in `client/context/*`.
- Fix upload size / image issues: prefer these choices in this order:
  1. Client → Cloudinary direct upload (update `client/components/ChatContainer.jsx`) and send only URL to server.
  2. Use multipart/form-data + `multer` on the server — change `messageRoutes` and `messageController`.
  3. Increase JSON body size in `server/server.js` (temporary) with `express.json({ limit: '10mb' })`.

### Security & deployment notes (short)
- Keep `JWT_SECRET`, `CLOUDINARY_API_SECRET`, and database credentials out of source control.
- For client direct uploads, use signed or unsigned upload presets correctly — avoid embedding secrets in the client.
- Deploy server to a host that supports WebSockets for real-time features (DigitalOcean, Render, EC2, Heroku classic dynos).

---

## How it works (short)
- Auth: login/signup return a JWT; client sends the token in `token` header for protected routes.
- Realtime: socket.io used for user presence and `newMessage` events.
- Messages: client sends text or base64 image to `/api/messages/send/:id`. Server uploads images to Cloudinary and stores message in MongoDB.

---

## API examples (curl)
Sign up / login (example):
```bash
curl -X POST http://localhost:5000/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"fullName":"Test","email":"t@example.com","password":"pass"}'
```
Get users (requires token):
```bash
curl -H "token: <JWT>" http://localhost:5000/api/messages/users
```
Send a text message (client normally uses axios):
```bash
curl -X POST http://localhost:5000/api/messages/send/<receiverId> \
  -H "token: <JWT>" -H 'Content-Type: application/json' \
  -d '{"text":"hi"}'
```

---

## Troubleshooting (most common)
1. Network Error / repeated failed requests
   - Check DevTools → Network for failing requests and their status codes.
   - Inspect server logs for errors (e.g. `PayloadTooLargeError`).
2. PayloadTooLargeError / 413 when sending images
   - Cause: sending base64 images in JSON can exceed `express.json()` size limit.
   - Quick fix: in `server/server.js` increase limit: `app.use(express.json({ limit: '10mb' }))`.
   - Recommended fix: switch to multipart uploads (`multer`) or upload directly to Cloudinary from the client and send only the image URL.
3. Many repeated requests or `ERR_INSUFFICIENT_RESOURCES`
   - Likely cause: unstable function references used in `useEffect` causing re-runs.
   - Fix: memoize request functions with `useCallback` in `ChatContext` (already done in this repo).
4. Socket.IO connection issues
   - Verify the `VITE_BACKEND_URL` value in `client/.env` and that server is running and reachable.

If you want, I can add a short troubleshooting checklist (with exact commands) tailored to your environment.

---

## Development notes
- Key files to edit:
  - `client/context/AuthContext.jsx` — manage axios baseURL, JWT header, socket connection
  - `client/context/ChatContext.jsx` — chat state and API calls
  - `server/controllers/messageController.js` — message send/receive and Cloudinary upload
- To reproduce API errors: use Postman or curl to run requests and watch server console logs.

---

## Deploy & testing
- Use a host that supports WebSockets for production (DigitalOcean, Render, EC2, Heroku classic dynos).
- When deploying client (Vercel/Netlify) set `VITE_BACKEND_URL` to your server URL.
- For production, consider direct client→Cloudinary uploads to remove base64 payloads from server.

---

## Contributing & License
- Contributions welcome. Open an issue or submit a PR with a clear description and tests when applicable.
- License: MIT

---

If you want, I can also add: a CONTRIBUTING.md, a short PR template, or implement direct Cloudinary uploads (client-side) or server-side `multer` support — tell me which one and I’ll implement it.
Create `.env` in the `server/` folder with these variables:

```env
MONGODB_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

For local client development (optional):
```env
# in client/.env or your environment
VITE_BACKEND_URL=http://localhost:5000
```

---

## Scripts you need to know
- Server
  - npm run server — start dev server with nodemon
  - npm start — start production server (node)
- Client
  - npm run dev — run Vite dev server
  - npm run build — build production bundle

---

## How the app works (short)
- Auth: JWT in `token` header for protected routes.
- Real-time: Socket.IO used to emit and receive `newMessage` and online user lists.
- Images: Client currently sends base64 image data to `/api/messages/send/:id` which server uploads to Cloudinary.

---

## Troubleshooting (common, simple fixes) 🔧
- Network Error / repeated failed requests
  - Open DevTools → Network to inspect failing requests and status codes.
  - If the server log shows `PayloadTooLargeError` then images are too large for `express.json()`.
    - Quick fix: increase JSON limit in `server/server.js`, e.g. `express.json({ limit: '10mb' })`.
    - Better: switch to `multipart/form-data` (multer) or upload directly to Cloudinary from the client.
- `net::ERR_INSUFFICIENT_RESOURCES` or many duplicate requests
  - Caused by effects re-running (unstable dependencies). Wrap request functions with `useCallback` so `useEffect` does not refire continuously.
- Socket.IO problems
  - Verify `VITE_BACKEND_URL` is correct and server is running and reachable.
  - Use a host that supports WebSockets for production (not serverless functions).
- Protected routes returning auth errors
  - Ensure client sends `token` header (set after login) and the server has the correct `JWT_SECRET`.

---

## Next improvements (ideas)
- Direct client → Cloudinary uploads (remove base64 traffic to server)
- Add multer-based file uploads for better efficiency
- Implement message pagination for long chats

---

## Contributing & License
- Contributions welcome — open issues or PRs with a short description.
- License: MIT (default)

---

If you want, I can also:
- Add a short CONTRIBUTING.md, or
- Implement direct Cloudinary uploads or multer integration — tell me which and I’ll implement it.
"# Chat-App-Socket.io" 
