const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Internal API key for socket notifications (shared secret)
const SOCKET_API_KEY = process.env.SOCKET_API_KEY || 'natura-beldi-internal-socket-key';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store io instance for the internal emit handler
let io = null;

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Internal endpoint for socket emissions
      if (parsedUrl.pathname === '/__internal/socket/emit' && req.method === 'POST') {
        // Verify internal API key
        const apiKey = req.headers['x-socket-api-key'];
        if (apiKey !== SOCKET_API_KEY) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        // Read request body
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { room, event, data } = JSON.parse(body);

            if (!room || !event) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing room or event' }));
              return;
            }

            if (io) {
              io.to(room).emit(event, data);
              console.log(`📤 [INTERNAL SOCKET] Emitted '${event}' to room '${room}'`);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, room, event }));
            } else {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Socket.IO not initialized' }));
            }
          } catch (parseError) {
            console.error('[INTERNAL SOCKET] Parse error:', parseError);
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    path: "/socket.io/"
  });

  // Store io instance globally
  global.io = io;

  io.on('connection', (socket) => {
    console.log(`🔌 [SOCKET.IO] Client connected: ${socket.id}`);

    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`📍 [SOCKET.IO] Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ [SOCKET.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log(`🔌 WebSocket server initialized`);
    });
});
