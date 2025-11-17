/**
 * Clear all AdminSession records from database
 */
import { prisma } from './src/lib/prisma';

async function clearSessions() {
  console.log('🗑️ Clearing all AdminSession records...\n');

  try {
    const result = await prisma.adminSession.deleteMany({});
    
    console.log(`✅ Deleted ${result.count} session(s) from database\n`);
    console.log('🔄 Ready for fresh testing! Please login again.\n');
  } catch (error) {
    console.error('❌ Error clearing sessions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearSessions();

