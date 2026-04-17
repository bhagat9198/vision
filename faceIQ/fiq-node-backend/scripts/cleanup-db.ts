import 'dotenv/config';
import { prisma } from '../src/config/database.ts';

async function main() {
    console.log('Cleaning up DELETED status records...');

    // Use raw SQL to bypass Prisma schema validation issues during migration
    try {
        const result = await prisma.$executeRawUnsafe(`DELETE FROM "event_image_statuses" WHERE status::text = 'DELETED'`);
        console.log(`Deleted ${result} records with DELETED status.`);
    } catch (error) {
        console.error('Error cleaning up:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
