
import 'dotenv/config';
import { prisma } from '../src/config/database.js';

async function main() {
    try {
        const key = await prisma.apiKey.findFirst({
            where: {
                isActive: true,
                org: { isActive: true }
            }
        });

        if (key) {
            console.log(`FOUND_KEY:${key.key}`);
        } else {
            console.log('NO_ACTIVE_KEY_FOUND');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
