/**
 * Seed Script
 * Populates the database with realistic sample data for testing.
 * Run once: node scripts/seed.js
 */

const path = require('path');
// Resolve dotenv from the project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db, initializeSchema, seedDefaultAdmin } = require(path.join(__dirname, '..', 'src', 'db', 'schema'));

initializeSchema();
seedDefaultAdmin();

// ── Sample users ──────────────────────────────────────────────────────────────
const users = [
  { username: 'alice_analyst', email: 'alice@finance.local', password: 'Alice@123', role: 'analyst' },
  { username: 'bob_viewer',    email: 'bob@finance.local',   password: 'Bob@12345', role: 'viewer'  },
];

const userIds = {};

for (const u of users) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (existing) {
    userIds[u.username] = existing.id;
    console.log(`⏭  User already exists: ${u.username}`);
    continue;
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO users (id, username, email, password, role, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, u.username, u.email, bcrypt.hashSync(u.password, 10), u.role);
  userIds[u.username] = id;
  console.log(`✅ Created user: ${u.username} (${u.role})`);
}

// Get admin ID for created_by
const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();

// ── Sample financial records ───────────────────────────────────────────────────
const categories = {
  income:  ['salary', 'freelance', 'investment', 'rental', 'bonus'],
  expense: ['rent', 'groceries', 'utilities', 'transport', 'entertainment', 'healthcare', 'education'],
};

const notes = {
  income:  ['Monthly salary', 'Freelance project', 'Stock dividends', 'Rental income', 'Performance bonus'],
  expense: ['Monthly rent', 'Grocery shopping', 'Electricity bill', 'Cab fare', 'Netflix subscription', 'Doctor visit', 'Online course'],
};

const records = [];
const today = new Date();

// Generate 60 records spread across the last 12 months
for (let i = 0; i < 60; i++) {
  const type = i % 3 === 0 ? 'expense' : (i % 5 === 0 ? 'expense' : 'income');
  const cats = categories[type];
  const ns   = notes[type];
  const cat  = cats[i % cats.length];
  const n    = ns[i % ns.length];

  // Spread dates across last 12 months
  const daysBack = Math.floor(Math.random() * 365);
  const d = new Date(today);
  d.setDate(d.getDate() - daysBack);
  const dateStr = d.toISOString().split('T')[0];

  const amount = type === 'income'
    ? parseFloat((Math.random() * 8000 + 500).toFixed(2))   // 500–8500
    : parseFloat((Math.random() * 2000 + 50).toFixed(2));   // 50–2050

  records.push({ amount, type, category: cat, date: dateStr, notes: n });
}

const insertRecord = db.prepare(`
  INSERT INTO financial_records (id, amount, type, category, date, notes, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((recs) => {
  for (const r of recs) {
    insertRecord.run(uuidv4(), r.amount, r.type, r.category, r.date, r.notes, admin.id);
  }
});

insertMany(records);
console.log(`✅ Inserted ${records.length} financial records`);

console.log('\n🌱 Seed complete!\n');
console.log('Test credentials:');
console.log('  Admin   →  admin@finance.local       /  Admin@123');
console.log('  Analyst →  alice@finance.local       /  Alice@123');
console.log('  Viewer  →  bob@finance.local         /  Bob@12345\n');
