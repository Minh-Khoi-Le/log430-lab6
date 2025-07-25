/**
 * Database Seeder Service
 * 
 * This service seeds the database with demo data when run in a Docker container.
 * It connects to PostgreSQL and uses Prisma for database operations.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Demo Users
const users = [
  {
    name: "admin",
    role: "admin",
    password: "admin123" // In production, this should be hashed
  },
  {
    name: "client",
    role: "client",
    password: "client123" // In production, this should be hashed
  }
];

// Demo Stores
const stores = [
  {
    name: "Downtown Store",
    address: "123 Main St, Downtown"
  },
  {
    name: "Mall Store", 
    address: "456 Shopping Mall, Level 2"
  },
  {
    name: "Airport Store",
    address: "789 Airport Terminal B"
  }
];

// Demo Products (25+ products)
const products = [
  {
    name: "Wireless Bluetooth Headphones",
    description: "Premium noise-cancelling wireless headphones with 30-hour battery life",
    price: 149.99
  },
  {
    name: "Smart Fitness Watch",
    description: "Advanced fitness tracker with heart rate monitoring and GPS",
    price: 249.99
  },
  {
    name: "Organic Cotton T-Shirt",
    description: "Comfortable organic cotton t-shirt in various colors",
    price: 29.99
  },
  {
    name: "Professional Coffee Maker",
    description: "12-cup programmable coffee maker with thermal carafe",
    price: 89.99
  },
  {
    name: "Leather Office Chair",
    description: "Ergonomic executive leather chair with lumbar support",
    price: 299.99
  },
  {
    name: "Wireless Phone Charger",
    description: "Fast wireless charging pad compatible with all Qi devices",
    price: 39.99
  },
  {
    name: "Running Shoes",
    description: "Professional running shoes with advanced cushioning technology",
    price: 129.99
  },
  {
    name: "Stainless Steel Water Bottle",
    description: "Insulated water bottle that keeps drinks cold for 24 hours",
    price: 24.99
  },
  {
    name: "Bluetooth Speaker",
    description: "Portable waterproof speaker with 360-degree sound",
    price: 79.99
  },
  {
    name: "Bamboo Cutting Board Set",
    description: "Set of 3 eco-friendly bamboo cutting boards in different sizes",
    price: 34.99
  },
  {
    name: "LED Desk Lamp",
    description: "Adjustable LED desk lamp with USB charging port",
    price: 49.99
  },
  {
    name: "Yoga Mat Premium",
    description: "Non-slip premium yoga mat with carrying strap",
    price: 59.99
  },
  {
    name: "Ceramic Kitchen Knife Set",
    description: "Professional ceramic knife set with magnetic block",
    price: 119.99
  },
  {
    name: "Memory Foam Pillow",
    description: "Contoured memory foam pillow for better sleep support",
    price: 69.99
  },
  {
    name: "Laptop Stand Adjustable",
    description: "Ergonomic aluminum laptop stand with cooling ventilation",
    price: 89.99
  },
  {
    name: "Essential Oil Diffuser",
    description: "Ultrasonic aromatherapy diffuser with color-changing LED",
    price: 44.99
  },
  {
    name: "Mechanical Gaming Keyboard",
    description: "RGB backlit mechanical keyboard with blue switches",
    price: 159.99
  },
  {
    name: "Insulated Lunch Box",
    description: "Leak-proof insulated lunch box with multiple compartments",
    price: 32.99
  },
  {
    name: "Car Phone Mount",
    description: "Magnetic car phone mount with 360-degree rotation",
    price: 19.99
  },
  {
    name: "Resistance Band Set",
    description: "Complete resistance band workout set with door anchor",
    price: 39.99
  },
  {
    name: "Digital Photo Frame",
    description: "10-inch WiFi digital photo frame with cloud storage",
    price: 199.99
  },
  {
    name: "Portable Air Purifier",
    description: "Compact HEPA air purifier for small rooms",
    price: 129.99
  },
  {
    name: "Stainless Steel Pan Set",
    description: "Professional 5-piece stainless steel cookware set",
    price: 179.99
  },
  {
    name: "Ergonomic Mouse Pad",
    description: "Gel wrist support mouse pad for comfortable computing",
    price: 15.99
  },
  {
    name: "Smart Thermostat",
    description: "WiFi-enabled programmable thermostat with app control",
    price: 199.99
  }
];

// Demo Inventory/Stock data (use storeName and productName instead of IDs)
const inventory = [
  // Downtown Store inventory
  { productName: "Wireless Bluetooth Headphones", storeName: "Downtown Store", quantity: 15 },
  { productName: "Smart Fitness Watch", storeName: "Downtown Store", quantity: 8 },
  { productName: "Organic Cotton T-Shirt", storeName: "Downtown Store", quantity: 25 },
  { productName: "Professional Coffee Maker", storeName: "Downtown Store", quantity: 12 },
  { productName: "Leather Office Chair", storeName: "Downtown Store", quantity: 6 },
  { productName: "Wireless Phone Charger", storeName: "Downtown Store", quantity: 20 },
  { productName: "Running Shoes", storeName: "Downtown Store", quantity: 18 },
  { productName: "Stainless Steel Water Bottle", storeName: "Downtown Store", quantity: 30 },
  { productName: "Bluetooth Speaker", storeName: "Downtown Store", quantity: 14 },
  { productName: "Bamboo Cutting Board Set", storeName: "Downtown Store", quantity: 22 },

  // Mall Store inventory
  { productName: "Wireless Bluetooth Headphones", storeName: "Mall Store", quantity: 12 },
  { productName: "Organic Cotton T-Shirt", storeName: "Mall Store", quantity: 35 },
  { productName: "Leather Office Chair", storeName: "Mall Store", quantity: 4 },
  { productName: "Running Shoes", storeName: "Mall Store", quantity: 22 },
  { productName: "LED Desk Lamp", storeName: "Mall Store", quantity: 16 },
  { productName: "Yoga Mat Premium", storeName: "Mall Store", quantity: 8 },
  { productName: "Ceramic Kitchen Knife Set", storeName: "Mall Store", quantity: 10 },
  { productName: "Memory Foam Pillow", storeName: "Mall Store", quantity: 7 },
  { productName: "Laptop Stand Adjustable", storeName: "Mall Store", quantity: 25 },
  { productName: "Essential Oil Diffuser", storeName: "Mall Store", quantity: 5 },

  // Airport Store inventory  
  { productName: "Smart Fitness Watch", storeName: "Airport Store", quantity: 6 },
  { productName: "Professional Coffee Maker", storeName: "Airport Store", quantity: 8 },
  { productName: "Wireless Phone Charger", storeName: "Airport Store", quantity: 15 },
  { productName: "Stainless Steel Water Bottle", storeName: "Airport Store", quantity: 20 },
  { productName: "Bluetooth Speaker", storeName: "Airport Store", quantity: 9 },
  { productName: "Yoga Mat Premium", storeName: "Airport Store", quantity: 11 },
  { productName: "Memory Foam Pillow", storeName: "Airport Store", quantity: 7 },
  { productName: "Essential Oil Diffuser", storeName: "Airport Store", quantity: 13 },
  { productName: "Mechanical Gaming Keyboard", storeName: "Airport Store", quantity: 18 },
  { productName: "Insulated Lunch Box", storeName: "Airport Store", quantity: 12 }
];

// Demo Sales data
const sales = [
  {
    customerId: 2,
    storeId: 1,
    productId: 1,
    quantity: 2,
    unitPrice: 149.99,
    totalAmount: 299.98,
    saleDate: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
    status: "completed"
  },
  {
    customerId: 2,
    storeId: 1,
    productId: 7,
    quantity: 1,
    unitPrice: 129.99,
    totalAmount: 129.99,
    saleDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    status: "completed"
  },
  {
    customerId: 2,
    storeId: 2,
    productId: 2,
    quantity: 1,
    unitPrice: 249.99,
    totalAmount: 249.99,
    saleDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    status: "completed"
  },
  {
    customerId: 2,
    storeId: 3,
    productId: 4,
    quantity: 1,
    unitPrice: 89.99,
    totalAmount: 89.99,
    saleDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    status: "completed"
  }
];

// Demo Refunds data
const refunds = [
  {
    saleId: 3,
    productId: 2,
    quantity: 1,
    refundAmount: 249.99,
    reason: "Defective product",
    refundDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    status: "processed"
  }
];

/**
 * Clear existing data (use with caution!)
 */
async function clearDatabase() {
  console.log('  Clearing existing data...');
  // Delete in order to respect foreign key constraints
  await prisma.refundLine.deleteMany();
  await prisma.saleLine.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stock.deleteMany(); // Fixed: was inventory
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
  console.log(' Database cleared');
}

/**
 * Hash user passwords
 */
async function hashUserPasswords(users) {
  const saltRounds = 10;
  const hashedUsers = [];
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, saltRounds);
    hashedUsers.push({ ...user, password: hashedPassword });
  }
  return hashedUsers;
}

/**
 * Seed the database with demo data
 */
async function seedDatabase() {
  console.log('Starting database seeding...');
  try {
    // Check if --force flag is provided
    const forceFlag = process.argv.includes('--force');

    // Check if data already exists
    const existingUsers = await prisma.user.findMany();
    console.log('DEBUG: Existing users in DB:', existingUsers);
    if (existingUsers.length > 0 && !forceFlag) {
      console.log('  Database already contains data. Use --force flag to overwrite.');
      return;
    }

    if (forceFlag) {
      await clearDatabase();
    }

    // Seed Stores
    console.log(' Seeding stores...');
    const createdStores = [];
    for (const store of stores) {
      const created = await prisma.store.create({ data: store });
      createdStores.push(created);
    }
    console.log(` Seeded ${createdStores.length} stores`);

    // Map store names to real IDs
    const storeNameToId = {};
    for (const store of createdStores) {
      storeNameToId[store.name] = store.id;
    }

    // Seed Users
    console.log(' Seeding users...');
    const hashedUsers = await hashUserPasswords(users);
    console.log('DEBUG: Users to be seeded:', hashedUsers);
    for (const user of hashedUsers) {
      await prisma.user.upsert({
        where: { name: user.name },
        update: user,
        create: user,
      });
    }
    console.log(` Seeded ${hashedUsers.length} users`);

    // Seed Products
    console.log(' Seeding products...');
    const createdProducts = [];
    for (const product of products) {
      const created = await prisma.product.create({ data: product });
      createdProducts.push(created);
    }
    console.log(` Seeded ${createdProducts.length} products`);

    // Map product names to real IDs
    const productNameToId = {};
    for (const product of createdProducts) {
      productNameToId[product.name] = product.id;
    }

    // Seed Inventory (Stock)
    console.log(' Seeding inventory...');
    for (const item of inventory) {
      const realStoreId = storeNameToId[item.storeName];
      const realProductId = productNameToId[item.productName];
      if (!realStoreId || !realProductId) {
        console.warn('Skipping inventory item due to missing store or product:', item);
        continue;
      }
      await prisma.stock.upsert({
        where: {
          storeId_productId: {
            productId: realProductId,
            storeId: realStoreId,
          },
        },
        update: { quantity: item.quantity, productId: realProductId, storeId: realStoreId },
        create: { quantity: item.quantity, productId: realProductId, storeId: realStoreId },
      });
    }
    console.log(` Seeded ${inventory.length} inventory items`);

    console.log(' Database seeding completed successfully!');
  } catch (error) {
    console.error(' Error seeding database:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await seedDatabase();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default {
  seedDatabase,
  clearDatabase,
  users,
  stores,
  products,
  inventory,
  sales,
  refunds
};
