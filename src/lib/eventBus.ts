// Simple event bus for cross-component synchronization
type EventListener = (data: any) => void;

class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();

  on(event: string, callback: EventListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: EventListener) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const eventBus = new EventBus();

// Event types
export const EVENTS = {
  DATA_CHANGED: 'pv:data:changed',
  JOB_UPDATED: 'pv:job:updated',
  JOB_DELETED: 'pv:job:deleted',
  INVOICE_UPDATED: 'pv:invoice:updated',
  QUOTE_UPDATED: 'pv:quote:updated',
  PLANNING_UPDATED: 'pv:planning:updated',
};
