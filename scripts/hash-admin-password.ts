import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run admin:hash -- "your-strong-password"');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  // Next.js expands $VAR in .env files — escape dollars for safe paste
  const escaped = hash.replaceAll("$", "\\$");
  console.log("# Paste into .env as:");
  console.log(`ADMIN_PASSWORD_HASH="${escaped}"`);
  console.log("# Raw bcrypt hash:");
  console.log(hash);
});
