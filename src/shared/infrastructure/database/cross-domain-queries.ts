/**
 * Cross-Domain Query Interface
 * 
 * Provides controlled access to data across service domain boundaries.
 * This interface enables services to validate and access data from other domains
 * while maintaining proper audit logging and access control.
 * 
 */

import { PrismaClient } from '@prisma/client';
import { IDatabaseManager } from './database-manager';
import { createLogger } from '../logging';

const logger = createLogger('cross-domain-queries');

// Audit log entry interface
export interface AuditLogEntry {
  timestamp: Date;
  requestingService: string;
  operation: string;
  targetDomain: string;
  targetId: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// Cross-domain query result types
export interface UserDetails {
  id: number;
  name: string;
  role: string;
}

export interface ProductDetails {
  id: number;
  name: string;
  price: number;
  description?: string;
}

export interface StoreDetails {
  id: number;
  name: string;
  address?: string;
}

export interface StockDetails {
  id: number;
  quantity: number;
  storeId: number;
  productId: number;
}

// Cross-domain query interface
export interface ICrossDomainQueries {
  // User domain queries
  validateUserExists(userId: number, requestingService: string): Promise<boolean>;
  getUserDetails(userId: number, requestingService: string): Promise<UserDetails | null>;
  validateUserRole(userId: number, expectedRole: string, requestingService: string): Promise<boolean>;

  // Product domain queries
  validateProductExists(productId: number, requestingService: string): Promise<boolean>;
  getProductDetails(productId: number, requestingService: string): Promise<ProductDetails | null>;
  validateProductPrice(productId: number, expectedPrice: number, requestingService: string): Promise<boolean>;

  // Store domain queries
  validateStoreExists(storeId: number, requestingService: string): Promise<boolean>;
  getStoreDetails(storeId: number, requestingService: string): Promise<StoreDetails | null>;

  // Stock domain queries
  validateStockAvailability(storeId: number, productId: number, requiredQuantity: number, requestingService: string): Promise<boolean>;
  getStockDetails(storeId: number, productId: number, requestingService: string): Promise<StockDetails | null>;

  // Batch validation methods
  validateMultipleUsers(userIds: number[], requestingService: string): Promise<{ [userId: number]: boolean }>;
  validateMultipleProducts(productIds: number[], requestingService: string): Promise<{ [productId: number]: boolean }>;
  validateMultipleStores(storeIds: number[], requestingService: string): Promise<{ [storeId: number]: boolean }>;

  // Audit log methods
  getAuditLogs(filters?: {
    requestingService?: string;
    targetDomain?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]>;
}

/**
 * Implementation of cross-domain queries with audit logging
 */
export class CrossDomainQueries implements ICrossDomainQueries {
  private readonly databaseManager: IDatabaseManager;
  private auditLogs: AuditLogEntry[] = [];

  constructor(databaseManager: IDatabaseManager) {
    this.databaseManager = databaseManager;
  }

  private get prisma(): PrismaClient {
    return this.databaseManager.getClient();
  }

  /**
   * Log audit entry for cross-domain access
   */
  private logAudit(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.auditLogs.push(auditEntry);

    // Log to application logger
    logger.info('Cross-domain query executed', {
      requestingService: entry.requestingService,
      operation: entry.operation,
      targetDomain: entry.targetDomain,
      targetId: entry.targetId,
      success: entry.success,
      error: entry.error,
      metadata: entry.metadata,
    });

    // Keep only last 1000 audit entries in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  /**
   * Validate access permissions for cross-domain queries
   */
  private validateAccess(requestingService: string, targetDomain: string, operation: string): boolean {
    // Define allowed cross-domain access patterns
    const allowedAccess: Record<string, string[]> = {
      'transaction-service': ['user', 'product', 'store', 'stock'],
      'catalog-service': ['user'], // Limited access for user validation
      'user-service': [], // User service should not need cross-domain access
    };

    const allowedDomains = allowedAccess[requestingService] || [];
    const isAllowed = allowedDomains.includes(targetDomain);

    if (!isAllowed) {
      logger.warn('Cross-domain access denied', {
        requestingService,
        targetDomain,
        operation,
        reason: 'Service not authorized for this domain',
      });
    }

    return isAllowed;
  }

  // User domain queries
  public async validateUserExists(userId: number, requestingService: string): Promise<boolean> {
    const operation = 'validateUserExists';
    const targetDomain = 'user';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: false,
        error: 'Access denied',
      });
      return false;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      const exists = !!user;
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: true,
        metadata: { exists },
      });

      return exists;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async getUserDetails(userId: number, requestingService: string): Promise<UserDetails | null> {
    const operation = 'getUserDetails';
    const targetDomain = 'user';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: false,
        error: 'Access denied',
      });
      return null;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: true,
        metadata: { found: !!user },
      });

      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async validateUserRole(userId: number, expectedRole: string, requestingService: string): Promise<boolean> {
    const operation = 'validateUserRole';
    const targetDomain = 'user';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: false,
        error: 'Access denied',
      });
      return false;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      const isValidRole = user?.role === expectedRole;
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: true,
        metadata: { expectedRole, actualRole: user?.role, isValid: isValidRole },
      });

      return isValidRole;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: userId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  // Product domain queries
  public async validateProductExists(productId: number, requestingService: string): Promise<boolean> {
    const operation = 'validateProductExists';
    const targetDomain = 'product';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: false,
        error: 'Access denied',
      });
      return false;
    }

    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });

      const exists = !!product;
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: true,
        metadata: { exists },
      });

      return exists;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async getProductDetails(productId: number, requestingService: string): Promise<ProductDetails | null> {
    const operation = 'getProductDetails';
    const targetDomain = 'product';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: false,
        error: 'Access denied',
      });
      return null;
    }

    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
        },
      });

      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: true,
        metadata: { found: !!product },
      });

      if (!product) {
        return null;
      }

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async validateProductPrice(productId: number, expectedPrice: number, requestingService: string): Promise<boolean> {
    const operation = 'validateProductPrice';
    const targetDomain = 'product';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: false,
        error: 'Access denied',
      });
      return false;
    }

    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { price: true },
      });

      const isValidPrice = product?.price === expectedPrice;
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: true,
        metadata: { expectedPrice, actualPrice: product?.price, isValid: isValidPrice },
      });

      return isValidPrice;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: productId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  // Store domain queries
  public async validateStoreExists(storeId: number, requestingService: string): Promise<boolean> {
    const operation = 'validateStoreExists';
    const targetDomain = 'store';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: 'Access denied',
      });
      return false;
    }

    try {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true },
      });

      const exists = !!store;
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: true,
        metadata: { exists },
      });

      return exists;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  public async getStoreDetails(storeId: number, requestingService: string): Promise<StoreDetails | null> {
    const operation = 'getStoreDetails';
    const targetDomain = 'store';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: 'Access denied',
      });
      return null;
    }

    try {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          name: true,
          address: true,
        },
      });

      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: true,
        metadata: { found: !!store },
      });

      if (!store) {
        return null;
      }

      return {
        id: store.id,
        name: store.name,
        address: store.address || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  // Stock domain queries
  public async validateStockAvailability(storeId: number, productId: number, requiredQuantity: number, requestingService: string): Promise<boolean> {
    const operation = 'validateStockAvailability';
    const targetDomain = 'stock';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: 'Access denied',
        metadata: { productId, requiredQuantity },
      });
      return false;
    }

    try {
      const stock = await this.prisma.stock.findUnique({
        where: {
          storeId_productId: {
            storeId,
            productId,
          },
        },
        select: { quantity: true },
      });

      const isAvailable = (stock?.quantity || 0) >= requiredQuantity;
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: true,
        metadata: {
          productId,
          requiredQuantity,
          availableQuantity: stock?.quantity || 0,
          isAvailable,
        },
      });

      return isAvailable;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: errorMessage,
        metadata: { productId, requiredQuantity },
      });
      throw error;
    }
  }

  public async getStockDetails(storeId: number, productId: number, requestingService: string): Promise<StockDetails | null> {
    const operation = 'getStockDetails';
    const targetDomain = 'stock';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: 'Access denied',
        metadata: { productId },
      });
      return null;
    }

    try {
      const stock = await this.prisma.stock.findUnique({
        where: {
          storeId_productId: {
            storeId,
            productId,
          },
        },
        select: {
          id: true,
          quantity: true,
          storeId: true,
          productId: true,
        },
      });

      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: true,
        metadata: { productId, found: !!stock },
      });

      return stock;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAudit({
        requestingService,
        operation,
        targetDomain,
        targetId: storeId,
        success: false,
        error: errorMessage,
        metadata: { productId },
      });
      throw error;
    }
  }

  // Batch validation methods
  public async validateMultipleUsers(userIds: number[], requestingService: string): Promise<{ [userId: number]: boolean }> {
    const operation = 'validateMultipleUsers';
    const targetDomain = 'user';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      const result: { [userId: number]: boolean } = {};
      userIds.forEach(id => {
        result[id] = false;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: false,
          error: 'Access denied',
        });
      });
      return result;
    }

    try {
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: userIds },
        },
        select: { id: true },
      });

      const existingIds = new Set(users.map(u => u.id));
      const result: { [userId: number]: boolean } = {};

      userIds.forEach(id => {
        const exists = existingIds.has(id);
        result[id] = exists;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: true,
          metadata: { exists },
        });
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: { [userId: number]: boolean } = {};
      userIds.forEach(id => {
        result[id] = false;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: false,
          error: errorMessage,
        });
      });
      throw error;
    }
  }

  public async validateMultipleProducts(productIds: number[], requestingService: string): Promise<{ [productId: number]: boolean }> {
    const operation = 'validateMultipleProducts';
    const targetDomain = 'product';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      const result: { [productId: number]: boolean } = {};
      productIds.forEach(id => {
        result[id] = false;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: false,
          error: 'Access denied',
        });
      });
      return result;
    }

    try {
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
        },
        select: { id: true },
      });

      const existingIds = new Set(products.map(p => p.id));
      const result: { [productId: number]: boolean } = {};

      productIds.forEach(id => {
        const exists = existingIds.has(id);
        result[id] = exists;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: true,
          metadata: { exists },
        });
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: { [productId: number]: boolean } = {};
      productIds.forEach(id => {
        result[id] = false;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: false,
          error: errorMessage,
        });
      });
      throw error;
    }
  }

  public async validateMultipleStores(storeIds: number[], requestingService: string): Promise<{ [storeId: number]: boolean }> {
    const operation = 'validateMultipleStores';
    const targetDomain = 'store';

    if (!this.validateAccess(requestingService, targetDomain, operation)) {
      const result: { [storeId: number]: boolean } = {};
      storeIds.forEach(id => {
        result[id] = false;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: false,
          error: 'Access denied',
        });
      });
      return result;
    }

    try {
      const stores = await this.prisma.store.findMany({
        where: {
          id: { in: storeIds },
        },
        select: { id: true },
      });

      const existingIds = new Set(stores.map(s => s.id));
      const result: { [storeId: number]: boolean } = {};

      storeIds.forEach(id => {
        const exists = existingIds.has(id);
        result[id] = exists;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: true,
          metadata: { exists },
        });
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: { [storeId: number]: boolean } = {};
      storeIds.forEach(id => {
        result[id] = false;
        this.logAudit({
          requestingService,
          operation,
          targetDomain,
          targetId: id,
          success: false,
          error: errorMessage,
        });
      });
      throw error;
    }
  }

  // Audit log methods
  public async getAuditLogs(filters?: {
    requestingService?: string;
    targetDomain?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let filteredLogs = [...this.auditLogs];

    if (filters) {
      if (filters.requestingService) {
        filteredLogs = filteredLogs.filter(log => log.requestingService === filters.requestingService);
      }
      if (filters.targetDomain) {
        filteredLogs = filteredLogs.filter(log => log.targetDomain === filters.targetDomain);
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit);
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

// Export singleton instance
export function createCrossDomainQueries(databaseManager: IDatabaseManager): ICrossDomainQueries {
  return new CrossDomainQueries(databaseManager);
}