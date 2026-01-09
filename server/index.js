import { WebSocketServer } from 'ws';

const PORT = process.env.WS_PORT || 3001;

// Store rooms: { code: { host: ws, viewers: Set<ws>, state: object } }
const rooms = new Map();

// Generate a 6-character alphanumeric code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure unique code
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  let currentRoom = null;
  let isHost = false;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'CREATE_ROOM': {
          // Host creates a new room
          const code = generateRoomCode();
          rooms.set(code, {
            host: ws,
            viewers: new Set(),
            state: message.initialState || null
          });
          currentRoom = code;
          isHost = true;

          ws.send(JSON.stringify({
            type: 'ROOM_CREATED',
            code
          }));

          console.log(`Room created: ${code}`);
          break;
        }

        case 'JOIN_ROOM': {
          // Viewer joins an existing room
          const room = rooms.get(message.code);
          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Room not found'
            }));
            return;
          }

          room.viewers.add(ws);
          currentRoom = message.code;
          isHost = false;

          // Send current state to the viewer
          ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            code: message.code,
            state: room.state
          }));

          // Notify host of new viewer
          if (room.host.readyState === 1) {
            room.host.send(JSON.stringify({
              type: 'VIEWER_JOINED',
              viewerCount: room.viewers.size
            }));
          }

          console.log(`Viewer joined room: ${message.code} (${room.viewers.size} viewers)`);
          break;
        }

        case 'UPDATE_STATE': {
          // Host broadcasts state update to all viewers
          if (!isHost || !currentRoom) return;

          const room = rooms.get(currentRoom);
          if (!room) return;

          room.state = message.state;

          // Broadcast to all viewers
          room.viewers.forEach((viewer) => {
            if (viewer.readyState === 1) {
              viewer.send(JSON.stringify({
                type: 'STATE_UPDATE',
                state: message.state
              }));
            }
          });
          break;
        }

        case 'DRAFT_EVENT': {
          // Host broadcasts a specific draft event
          if (!isHost || !currentRoom) return;

          const room = rooms.get(currentRoom);
          if (!room) return;

          // Broadcast event to all viewers
          room.viewers.forEach((viewer) => {
            if (viewer.readyState === 1) {
              viewer.send(JSON.stringify({
                type: 'DRAFT_EVENT',
                event: message.event,
                data: message.data
              }));
            }
          });
          break;
        }

        case 'GET_VIEWER_COUNT': {
          if (!isHost || !currentRoom) return;

          const room = rooms.get(currentRoom);
          if (!room) return;

          ws.send(JSON.stringify({
            type: 'VIEWER_COUNT',
            count: room.viewers.size
          }));
          break;
        }
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        if (isHost) {
          // Host disconnected - notify viewers and close room
          room.viewers.forEach((viewer) => {
            if (viewer.readyState === 1) {
              viewer.send(JSON.stringify({
                type: 'HOST_DISCONNECTED'
              }));
            }
          });
          rooms.delete(currentRoom);
          console.log(`Room closed: ${currentRoom}`);
        } else {
          // Viewer disconnected
          room.viewers.delete(ws);
          if (room.host.readyState === 1) {
            room.host.send(JSON.stringify({
              type: 'VIEWER_LEFT',
              viewerCount: room.viewers.size
            }));
          }
          console.log(`Viewer left room: ${currentRoom} (${room.viewers.size} viewers)`);
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Cleanup stale rooms periodically
setInterval(() => {
  rooms.forEach((room, code) => {
    if (room.host.readyState !== 1) {
      room.viewers.forEach((viewer) => {
        if (viewer.readyState === 1) {
          viewer.send(JSON.stringify({
            type: 'HOST_DISCONNECTED'
          }));
        }
      });
      rooms.delete(code);
      console.log(`Cleaned up stale room: ${code}`);
    }
  });
}, 30000); // Check every 30 seconds
