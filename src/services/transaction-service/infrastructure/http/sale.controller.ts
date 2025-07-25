import { SaleUseCases } from '../../application/use-cases/sale.use-cases';

export class SaleController {
  constructor(private readonly saleUseCases: SaleUseCases) {}

  async createSale(req: any, res: any): Promise<void> {
    try {
      const sale = await this.saleUseCases.createSale(req.body);
      res.status(201).json(sale);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getSale(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const sale = await this.saleUseCases.getSale(id);
      res.json(sale);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getAllSales(req: any, res: any): Promise<void> {
    try {
      const sales = await this.saleUseCases.getAllSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getSalesByUser(req: any, res: any): Promise<void> {
    try {
      const userId = parseInt(req.params.userId);
      const sales = await this.saleUseCases.getSalesByUser(userId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getSalesByStore(req: any, res: any): Promise<void> {
    try {
      const storeId = parseInt(req.params.storeId);
      const sales = await this.saleUseCases.getSalesByStore(storeId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async updateSaleStatus(req: any, res: any): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const sale = await this.saleUseCases.updateSaleStatus(id, status);
      res.json(sale);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async getSalesSummary(req: any, res: any): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const summary = await this.saleUseCases.getSalesSummary(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(summary);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
