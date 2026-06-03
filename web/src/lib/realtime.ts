// Real-time collaboration over a WebSocket (presence, per-article locks, project chat).
// The API is proxied at /api, so the socket lives at /api/ws/projects/<slug>.
import { useCallback, useEffect, useRef, useState } from "react";

export interface Member {
  id: number;
  name: string;
  initials: string;
}

export interface ChatMsg {
  id: number;
  author_name: string;
  author_initials: string;
  body: string;
  author_id?: number;
}

export interface Realtime {
  connected: boolean;
  presence: Member[];
  locks: Record<string, Member>; // node -> who holds it
  messages: ChatMsg[];
  you: Member | null;
  lock: (node: string) => void;
  unlock: (node: string) => void;
  sendChat: (body: string) => void;
  notifySaved: () => void;
}

export function useProjectRealtime(slug: string | undefined, enabled: boolean, onRefresh?: () => void): Realtime {
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<Member[]>([]);
  const [locks, setLocks] = useState<Record<string, Member>>({});
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [you, setYou] = useState<Member | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || !slug) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${window.location.host}/api/ws/projects/${slug}`);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 2500); // simple reconnect
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case "init":
            setYou(msg.you);
            setPresence(msg.presence ?? []);
            setLocks(msg.locks ?? {});
            setMessages(msg.messages ?? []);
            break;
          case "presence":
            setPresence(msg.presence ?? []);
            break;
          case "lock":
            setLocks((l) => ({ ...l, [msg.node]: msg.by }));
            break;
          case "unlock":
            setLocks((l) => {
              const { [msg.node]: _removed, ...rest } = l;
              return rest;
            });
            break;
          case "chat":
            setMessages((m) => (m.some((x) => x.id === msg.message.id) ? m : [...m, msg.message]));
            break;
          case "refresh":
            refreshRef.current?.();
            break;
        }
      };
    };

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [slug, enabled]);

  const send = (obj: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
  };
  const lock = useCallback((node: string) => send({ type: "lock", node }), []);
  const unlock = useCallback((node: string) => send({ type: "unlock", node }), []);
  const sendChat = useCallback((body: string) => send({ type: "chat", body }), []);
  const notifySaved = useCallback(() => send({ type: "saved" }), []);

  return { connected, presence, locks, messages, you, lock, unlock, sendChat, notifySaved };
}
