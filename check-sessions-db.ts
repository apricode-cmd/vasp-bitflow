/**
 * Check AdminSession records in database
 */
import { prisma } from './src/lib/prisma';

async function checkSessions() {
  console.log('\n🔍 Checking AdminSession table...\n');

  // Get all sessions
  const allSessions = await prisma.adminSession.findMany({
    select: {
      id: true,
      sessionId: true,
      sessionKey: true,
      adminId: true,
      isActive: true,
      createdAt: true,
      lastActivity: true,
      expiresAt: true,
      deviceType: true,
      browser: true,
      os: true,
      ipAddress: true,
      terminatedAt: true,
      terminationReason: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10, // Last 10 sessions
  });

  console.log(`📊 Total sessions found: ${allSessions.length}\n`);

  allSessions.forEach((session, idx) => {
    console.log(`\n─────────────────────────────────────────────`);
    console.log(`Session #${idx + 1}:`);
    console.log(`─────────────────────────────────────────────`);
    console.log(`ID:            ${session.id}`);
    console.log(`sessionId:     ${session.sessionId.substring(0, 8)}...`);
    console.log(`sessionKey:    ${session.sessionKey.substring(0, 20)}...`);
    console.log(`adminId:       ${session.adminId}`);
    console.log(`isActive:      ${session.isActive ? '✅ YES' : '❌ NO'}`);
    console.log(`Device:        ${session.browser} on ${session.os} (${session.deviceType})`);
    console.log(`IP:            ${session.ipAddress}`);
    console.log(`Created:       ${session.createdAt.toISOString()}`);
    console.log(`Last Activity: ${session.lastActivity.toISOString()}`);
    console.log(`Expires:       ${session.expiresAt.toISOString()}`);
    
    if (!session.isActive) {
      console.log(`Terminated:    ${session.terminatedAt?.toISOString()}`);
      console.log(`Reason:        ${session.terminationReason}`);
    }
  });

  // Count active sessions by admin
  const activeSessions = await prisma.adminSession.groupBy({
    by: ['adminId', 'isActive'],
    _count: true,
    where: {
      isActive: true,
    },
  });

  console.log(`\n\n📈 Active sessions by admin:`);
  activeSessions.forEach((group) => {
    console.log(`  Admin ${group.adminId}: ${group._count} active session(s)`);
  });

  // Check for sessionId matches
  console.log(`\n\n🔍 Checking sessionId format...`);
  const sessionsWithUUID = allSessions.filter(s => {
    // UUID format: 8-4-4-4-12 characters
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.sessionId);
  });
  console.log(`  Sessions with valid UUID sessionId: ${sessionsWithUUID.length}/${allSessions.length}`);

  const sessionsWithJWTKey = allSessions.filter(s => {
    // JWT starts with eyJ
    return s.sessionKey.startsWith('eyJ');
  });
  console.log(`  Sessions with JWT sessionKey: ${sessionsWithJWTKey.length}/${allSessions.length}`);

  await prisma.$disconnect();
}

checkSessions().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

