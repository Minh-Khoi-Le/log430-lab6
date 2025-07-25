import { EventEmitter } from 'events';

class EventBus {
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  publish(eventName: string, data: any): void {
    this.eventEmitter.emit(eventName, data);
  }

  subscribe(eventName: string, listener: (data: any) => void): void {
    this.eventEmitter.on(eventName, listener);
  }

  unsubscribe(eventName: string, listener: (data: any) => void): void {
    this.eventEmitter.off(eventName, listener);
  }
}

export const eventBus = new EventBus();