type NotificationPayload = {
  type: "notification";
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

type WorkspacePayload = {
  type: "workspace";
  kind: "task_moved" | "task_changed";
  companyId: string;
  taskId?: string;
  at: string;
};

export type RealtimePayload = NotificationPayload | WorkspacePayload;

type Subscriber = (payload: RealtimePayload) => void;

const globalForBus = globalThis as unknown as {
  workpilotBus?: Map<string, Set<Subscriber>>;
};

function bus() {
  if (!globalForBus.workpilotBus) {
    globalForBus.workpilotBus = new Map();
  }
  return globalForBus.workpilotBus;
}

export function subscribeUser(userId: string, fn: Subscriber) {
  const map = bus();
  if (!map.has(userId)) map.set(userId, new Set());
  map.get(userId)!.add(fn);
  return () => {
    map.get(userId)?.delete(fn);
  };
}

export function publishToUser(userId: string, payload: RealtimePayload) {
  const subs = bus().get(userId);
  if (!subs?.size) return;
  for (const fn of subs) {
    try {
      fn(payload);
    } catch (error) {
      console.error("realtime publish failed", error);
    }
  }
}

export function publishToUsers(userIds: string[], payload: RealtimePayload) {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  for (const id of unique) publishToUser(id, payload);
}
