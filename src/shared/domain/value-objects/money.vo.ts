export class Money {
  private readonly amount: number;
  private readonly currency: string;

  constructor(amount: number, currency: string) {
    if (amount < 0) {
      throw new Error("Amount must be a positive number");
    }
    this.amount = amount;
    this.currency = currency;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(money: Money): Money {
    if (this.currency !== money.getCurrency()) {
      throw new Error("Cannot add money with different currencies");
    }
    return new Money(this.amount + money.getAmount(), this.currency);
  }

  subtract(money: Money): Money {
    if (this.currency !== money.getCurrency()) {
      throw new Error("Cannot subtract money with different currencies");
    }
    if (this.amount < money.getAmount()) {
      throw new Error("Insufficient funds");
    }
    return new Money(this.amount - money.getAmount(), this.currency);
  }

  equals(money: Money): boolean {
    return this.amount === money.getAmount() && this.currency === money.getCurrency();
  }
}