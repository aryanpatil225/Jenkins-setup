const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');
const INDEX_FILE = path.join(__dirname, 'index.html');

function readTasks() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}
function writeTasks(tasks) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const temporary = DATA_FILE + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(tasks, null, 2) + '\n', 'utf8');
  fs.renameSync(temporary, DATA_FILE);
}
function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(value === null ? '' : JSON.stringify(value));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 16_384) { reject(Object.assign(new Error('Request body too large'), { status: 413 })); request.destroy(); }
    });
    request.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (_) { reject(Object.assign(new Error('Body must be valid JSON'), { status: 400 })); }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://' + (request.headers.host || 'localhost'));
  if (url.pathname === '/api/tasks') {
    try {
      const tasks = readTasks();
      if (request.method === 'GET') return sendJson(response, 200, tasks);
      if (request.method === 'POST') {
        const body = await readBody(request);
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        if (!text || text.length > 180) return sendJson(response, 400, { error: 'Task text must be between 1 and 180 characters.' });
        const task = { id: typeof body.id === 'string' && body.id.length <= 100 ? body.id : crypto.randomUUID(), text, completed: false };
        if (tasks.some(item => item.id === task.id)) return sendJson(response, 409, { error: 'A task with that ID already exists.' });
        tasks.unshift(task); writeTasks(tasks); return sendJson(response, 201, task);
      }
      return sendJson(response, 405, { error: 'Method not allowed.' });
    } catch (error) { return sendJson(response, error.status || 500, { error: error.status ? error.message : 'Unable to read or save tasks.' }); }
  }

  const taskRoute = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskRoute) {
    let id;
    try { id = decodeURIComponent(taskRoute[1]); } catch (_) { return sendJson(response, 400, { error: 'Invalid task ID.' }); }
    try {
      const tasks = readTasks(); const index = tasks.findIndex(task => task.id === id);
      if (index < 0) return sendJson(response, 404, { error: 'Task not found.' });
      if (request.method === 'PATCH') {
        const body = await readBody(request);
        if (typeof body.completed !== 'boolean') return sendJson(response, 400, { error: 'completed must be true or false.' });
        tasks[index].completed = body.completed; writeTasks(tasks); return sendJson(response, 200, tasks[index]);
      }
      if (request.method === 'DELETE') {
        tasks.splice(index, 1); writeTasks(tasks); response.writeHead(204); return response.end();
      }
      return sendJson(response, 405, { error: 'Method not allowed.' });
    } catch (error) { return sendJson(response, error.status || 500, { error: error.status ? error.message : 'Unable to update tasks.' }); }
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(INDEX_FILE).pipe(response);
  }
  sendJson(response, 404, { error: 'Not found.' });
});

server.listen(PORT, HOST, () => console.log(`Pay1 To-Do is running at http://${HOST}:${PORT}`));
