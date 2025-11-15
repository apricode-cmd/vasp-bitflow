import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing passkey challenge generation...');
    
    const email = 'admin@apricode.io';
    
    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { email },
      include: {
        webAuthnCreds: {
          where: { isActive: true },
          select: { 
            id: true,
            credentialId: true, 
            transports: true,
            deviceName: true,
          },
        },
      },
    });
    
    console.log('Admin found:', admin ? 'YES' : 'NO');
    if (admin) {
      console.log('Admin ID:', admin.id);
      console.log('Email:', admin.email);
      console.log('Is Active:', admin.isActive);
      console.log('Is Suspended:', admin.isSuspended);
      console.log('Passkeys count:', admin.webAuthnCreds?.length || 0);
      
      if (admin.webAuthnCreds && admin.webAuthnCreds.length > 0) {
        console.log('Passkeys:', admin.webAuthnCreds.map(c => ({
          deviceName: c.deviceName,
          credentialId: c.credentialId.substring(0, 20) + '...'
        })));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
