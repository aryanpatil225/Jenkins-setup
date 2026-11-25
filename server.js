const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = path.join(__dirname, 'data', 'tickets.json');
const INDEX_FILE = path.join(__dirname, 'index.html');

function readTickets() {
  try { const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); return Array.isArray(parsed) ? parsed : []; }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function writeTickets(tickets) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const temporary = DATA_FILE + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(tickets, null, 2) + '\n', 'utf8');
  fs.renameSync(temporary, DATA_FILE);
}
function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(value === null ? '' : JSON.stringify(value));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk; if (body.length > 32768) reject(Object.assign(new Error('Request body too large'), { status: 413 })); });
    request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (_) { reject(Object.assign(new Error('Body must be valid JSON'), { status: 400 })); } });
    request.on('error', reject);
  });
}
function validateTicket(body) {
  if (typeof body.subject !== 'string' || !body.subject.trim() || body.subject.length > 120) throw Object.assign(new Error('A valid subject is required.'), { status: 400 });
  if (typeof body.description !== 'string' || !body.description.trim() || body.description.length > 2000) throw Object.assign(new Error('A valid description is required.'), { status: 400 });
  if (!['Low','Medium','High'].includes(body.priority)) throw Object.assign(new Error('Priority must be Low, Medium, or High.'), { status: 400 });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://' + (request.headers.host || 'localhost'));
  if (url.pathname === '/api/tickets') {
    try {
      const tickets = readTickets();
      if (request.method === 'GET') return sendJson(response, 200, tickets);
      if (request.method === 'POST') {
        const body = await readBody(request); validateTicket(body);
        const now = new Date().toISOString();
        const max = tickets.reduce((highest, ticket) => Math.max(highest, Number(String(ticket.id).split('-').pop()) || 1041), 1041);
        const ticket = {
          id: typeof body.id === 'string' && /^PAY-\d+$/.test(body.id) ? body.id : 'PAY-' + String(max + 1).padStart(4, '0'),
          subject: body.subject.trim(), description: body.description.trim(),
          category: typeof body.category === 'string' ? body.category : 'Other', priority: body.priority,
          status: 'Open', name: typeof body.name === 'string' ? body.name.trim().slice(0, 80) : 'Anonymous',
          email: typeof body.email === 'string' ? body.email.trim().slice(0, 120) : '',
          createdAt: now, updatedAt: now
        };
        tickets.unshift(ticket); writeTickets(tickets); return sendJson(response, 201, ticket);
      }
      return sendJson(response, 405, { error: 'Method not allowed.' });
    } catch (error) { return sendJson(response, error.status || 500, { error: error.status ? error.message : 'Unable to process tickets.' }); }
  }

  const ticketRoute = url.pathname.match(/^\/api\/tickets\/([^/]+)$/);
  if (ticketRoute) {
    let id; try { id = decodeURIComponent(ticketRoute[1]); } catch (_) { return sendJson(response, 400, { error: 'Invalid ticket ID.' }); }
    try {
      const tickets = readTickets(); const index = tickets.findIndex(ticket => ticket.id === id);
      if (index < 0) return sendJson(response, 404, { error: 'Ticket not found.' });
      if (request.method === 'PATCH') {
        const body = await readBody(request);
        if (body.status !== undefined) {
          if (!['Open','In Progress','Resolved'].includes(body.status)) return sendJson(response, 400, { error: 'Invalid status.' });
          tickets[index].status = body.status;
        }
        if (body.priority !== undefined) {
          if (!['Low','Medium','High'].includes(body.priority)) return sendJson(response, 400, { error: 'Invalid priority.' });
          tickets[index].priority = body.priority;
        }
        tickets[index].updatedAt = new Date().toISOString(); writeTickets(tickets); return sendJson(response, 200, tickets[index]);
      }
      if (request.method === 'DELETE') { tickets.splice(index, 1); writeTickets(tickets); response.writeHead(204); return response.end(); }
      return sendJson(response, 405, { error: 'Method not allowed.' });
    } catch (error) { return sendJson(response, error.status || 500, { error: error.status ? error.message : 'Unable to update ticket.' }); }
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(INDEX_FILE).pipe(response);
  }
  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(PORT, HOST, () => console.log(`Pay1 IT Support is running at http://${HOST}:${PORT}`));
