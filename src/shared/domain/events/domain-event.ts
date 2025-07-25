export interface DomainEvent {
  eventType: string;
  occurredOn: Date;
  data: any;
}