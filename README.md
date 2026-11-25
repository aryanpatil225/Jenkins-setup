# Pay1 To-Do

A small red-and-black Pay1-themed to-do app. It has a responsive browser UI, a Node.js HTTP backend, and JSON-file persistence. No third-party packages are required (Node.js 18+ recommended).

## Run with the backend

```sh
node server.js
```

Open <http://localhost:3000>. Tasks are stored in `data/tasks.json`, which the server creates on first write. Set `PORT` to choose another port, for example `PORT=8080 node server.js`.

The API supports:

- `GET /api/tasks` — list tasks
- `POST /api/tasks` — create a task with `{ "text": "..." }`
- `PATCH /api/tasks/:id` — update completion with `{ "completed": true }`
- `DELETE /api/tasks/:id` — remove a task

## Static hosting

The existing Jenkins pipeline publishes `index.html` to a static web server. The page detects when the API is unavailable and falls back to browser `localStorage`, so the to-do list remains usable on that existing static deployment. Run `node server.js` to enable the shared, file-backed backend; the frontend and API are served together by that server.
