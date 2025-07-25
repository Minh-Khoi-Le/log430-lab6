import { RefundUseCases } from '../../application/use-cases/refund.use-cases';

export class RefundController {
  constructor(private readonly refundUseCases: RefundUseCases) {}

  async createRefund(req: any, res: any): Promise<void> {
    try {
      const refund = await this.refundUseCases.createRefund(req.body);
      res.status(201).json(refund);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getRefund(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const refund = await this.refundUseCases.getRefund(id);
      res.json(refund);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getAllRefunds(req: any, res: any): Promise<void> {
    try {
      const refunds = await this.refundUseCases.getAllRefunds();
      res.json(refunds);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getRefundsByUser(req: any, res: any): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const refunds = await this.refundUseCases.getRefundsByUser(userId);
      res.json(refunds);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getRefundsByStore(req: any, res: any): Promise<void> {
    try {
      const storeId = parseInt(req.params.storeId);
      const refunds = await this.refundUseCases.getRefundsByStore(storeId);
      res.json(refunds);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getRefundsBySale(req: any, res: any): Promise<void> {
    try {
      const saleId = parseInt(req.params.saleId);
      const refunds = await this.refundUseCases.getRefundsBySale(saleId);
      res.json(refunds);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getRefundsSummary(req: any, res: any): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const summary = await this.refundUseCases.getRefundsSummary(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(summary);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
