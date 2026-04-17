import pkg from './generated/prisma/index.cjs' with { type: 'commonjs' };
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
const photo = await prisma.photo.findUnique({ where: { id: 'f614d045-dee9-488b-bf0a-db313bca6d34' } });
console.log(JSON.stringify(photo, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
await prisma.$disconnect();
