import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';

interface DraftState {
  draftConfig: {
    teams: Array<{ name: string; icon: string; color: string; standing: number }>;
    totalTeams: number;
    lotteryTeams: number;
    draftName: string;
    pickCountdown: number;
  } | null;
  drafted: Array<{ name: string; icon: string; color: string; standing: number; pick: number }>;
  current: { name: string; icon: string; color: string; standing: number } | null;
  isDrafting: boolean;
  showCurrent: boolean;
  countdown: number | null;
  lotteryOdds: Array<{
    team: { name: string; icon: string; color: string; standing: number };
    odds: number;
    drawings: number;
  }>;
  totalDrawings: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  isHost: boolean;
  roomCode: string | null;
  viewerCount: number;
  remoteState: DraftState | null;
  error: string | null;
  createRoom: (initialState: DraftState) => void;
  joinRoom: (code: string) => void;
  broadcastState: (state: DraftState) => void;
  broadcastEvent: (event: string, data: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [remoteState, setRemoteState] = useState<DraftState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setError('Failed to connect to server');
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'ROOM_CREATED':
            setRoomCode(message.code);
            setIsHost(true);
            break;

          case 'ROOM_JOINED':
            setRoomCode(message.code);
            setIsHost(false);
            if (message.state) {
              setRemoteState(message.state);
            }
            break;

          case 'STATE_UPDATE':
            if (!isHost) {
              setRemoteState(message.state);
            }
            break;

          case 'DRAFT_EVENT':
            // Handle specific draft events if needed
            break;

          case 'VIEWER_JOINED':
          case 'VIEWER_LEFT':
          case 'VIEWER_COUNT':
            setViewerCount(message.viewerCount ?? message.count ?? 0);
            break;

          case 'HOST_DISCONNECTED':
            setError('The host has disconnected');
            setRoomCode(null);
            break;

          case 'ERROR':
            setError(message.message);
            break;
        }
      } catch (err) {
        console.error('Error parsing message:', err);
      }
    };

    wsRef.current = ws;
  }, [isHost]);

  const createRoom = useCallback((initialState: DraftState) => {
    connect();

    const attemptCreate = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'CREATE_ROOM',
          initialState
        }));
      } else {
        setTimeout(attemptCreate, 100);
      }
    };

    attemptCreate();
  }, [connect]);

  const joinRoom = useCallback((code: string) => {
    connect();

    const attemptJoin = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'JOIN_ROOM',
          code: code.toUpperCase()
        }));
      } else {
        setTimeout(attemptJoin, 100);
      }
    };

    attemptJoin();
  }, [connect]);

  const broadcastState = useCallback((state: DraftState) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isHost) {
      wsRef.current.send(JSON.stringify({
        type: 'UPDATE_STATE',
        state
      }));
    }
  }, [isHost]);

  const broadcastEvent = useCallback((event: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && isHost) {
      wsRef.current.send(JSON.stringify({
        type: 'DRAFT_EVENT',
        event,
        data
      }));
    }
  }, [isHost]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        isHost,
        roomCode,
        viewerCount,
        remoteState,
        error,
        createRoom,
        joinRoom,
        broadcastState,
        broadcastEvent
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
