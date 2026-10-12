import process from "node:process";
import pg from "pg";

if (process.env.APP_ENV !== "development" || process.env.EMAIL_DELIVERY_MODE !== "database") {
  console.error("El buzón de pruebas solo está habilitado con APP_ENV=development y EMAIL_DELIVERY_MODE=database.");
  process.exit(1);
}

const recipient = process.argv[2]?.trim().toLowerCase();
const kind = process.argv[3]?.trim().toUpperCase() ?? null;
if (!recipient) {
  console.error("Uso: npm run mailbox:latest -- correo@ejemplo.cl [EMAIL_VERIFICATION|PASSWORD_RESET]");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, application_name: "ems-dev-mailbox", max: 1 });
try {
  const result = await pool.query(
    `SELECT kind, action_url, expires_at, created_at
       FROM identity_test_email
      WHERE recipient = $1 AND ($2::text IS NULL OR kind = $2)
      ORDER BY created_at DESC LIMIT 1`,
    [recipient, kind]
  );
  const message = result.rows[0];
  if (!message) {
    console.error("No hay mensajes de prueba para ese correo.");
    process.exitCode = 1;
  } else {
    console.log("Buzón local de desarrollo. El enlace es secreto y de un solo uso.");
    console.log(`${message.kind}: ${message.action_url}`);
    console.log(`Vence: ${new Date(message.expires_at).toISOString()}`);
  }
} finally {
  await pool.end();
}
