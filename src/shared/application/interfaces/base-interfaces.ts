import { DomainEvent } from '../../domain/events/domain-events';

// Base Repository Interface
export interface Repository<T> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(id: number, entity: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

// Event Publisher Interface
export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishMany(events: DomainEvent[]): Promise<void>;
}

// Event Handler Interface
export interface EventHandler<T> {
  handle(event: T): Promise<void>;
}

// Use Case Interface
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<TResponse>;
}

// API Response Interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination Interface
export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
