
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

const prisma = new PrismaClient();

async function checkKey() {
    const key = 'gcf4jDwP7_gBAjuA309B3O75tFjPVAAA';
    console.log(`Checking key: ${key}`);

    const record = await prisma.apiKey.findUnique({
        where: { key },
        include: { org: true }
    });

    if (record) {
        console.log('Found key:', JSON.stringify(record, null, 2));
    } else {
        console.log('Key NOT found');

        // List all keys to see what's there
        const all = await prisma.apiKey.findMany();
        console.log('All keys:', all.map(k => k.key));
    }
}

checkKey()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
