import { useEffect, useRef, useCallback } from "react";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export function useWebSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch {}
    };

    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(() => {
        wsRef.current = new WebSocket(WS_URL);
      }, 3000);
    };

    return () => ws.close();
  }, []);

  return wsRef;
}
