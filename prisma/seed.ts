import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Admin@123456', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@storage.local' },
    update: {},
    create: {
      email: 'admin@storage.local',
      username: 'superadmin',
      displayName: 'Super Administrator',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  console.log(`Super admin created: ${superAdmin.email}`);

  await prisma.setting.createMany({
    skipDuplicates: true,
    data: [
      { key: 'app_name', value: 'StorageServer', group: 'general', label: 'Application Name', isPublic: true },
      { key: 'app_logo', value: '', group: 'general', label: 'Application Logo URL', isPublic: true },
      { key: 'allow_registration', value: 'true', type: 'boolean', group: 'auth', label: 'Allow User Registration' },
      { key: 'require_email_verification', value: 'false', type: 'boolean', group: 'auth', label: 'Require Email Verification' },
      { key: 'default_user_quota_gb', value: '10', type: 'number', group: 'storage', label: 'Default User Quota (GB)' },
      { key: 'max_file_size_mb', value: '5000', type: 'number', group: 'storage', label: 'Max File Size (MB)', isPublic: true },
      { key: 'allowed_extensions', value: '*', group: 'storage', label: 'Allowed Extensions (* for all)', isPublic: true },
      { key: 'virus_scan_enabled', value: 'false', type: 'boolean', group: 'security', label: 'Virus Scan Enabled' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', group: 'general', label: 'Maintenance Mode' },
      { key: 'storage_warning_percent', value: '80', type: 'number', group: 'storage', label: 'Storage Warning Threshold (%)' },
    ],
  });

  console.log('Default settings created');
  console.log('');
  console.log('─────────────────────────────────────────');
  console.log('Seed complete!');
  console.log('');
  console.log('Login:    admin@storage.local');
  console.log('Password: Admin@123456');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
