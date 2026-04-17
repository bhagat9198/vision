
import { prisma } from '../src/config/database';
import { config } from 'dotenv';
config();

// const prisma = new PrismaClient(); // Removed local instance

async function setKey() {
    const key = 'face_analysis_api_key';
    const value = 'gcf4jDwP7_gBAjuA309B3O75tFjPVAAA';

    console.log(`Setting ${key} to ${value}...`);

    await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });

    console.log('✅ Config updated successfully');
}

setKey()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
