# Pay1 IT Support

A responsive Pay1-themed IT ticket-raising platform with a Node.js HTTP backend and JSON-file persistence.

## Run locally

```sh
node server.js
```

Open <http://localhost:3000>. Set `PORT` to use another port:

```sh
PORT=8080 node server.js
```

Tickets are stored in `data/tickets.json`. The existing Jenkins pipeline continues to deploy `index.html` to NGINX on EC2. When no API is available, the browser falls back to `localStorage`.

## API

- `GET /api/tickets` — list tickets
- `POST /api/tickets` — raise a ticket
- `PATCH /api/tickets/:id` — update status or priority
- `DELETE /api/tickets/:id` — remove a ticket
