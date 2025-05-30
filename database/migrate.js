require('dotenv').config({ path: `../Siwes Registeration/.env`});
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parse');

// Verify environment variables
if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
  console.error('Error: ADMIN_USER and ADMIN_PASS must be set in .env file');
  process.exit(1);
}

const db = new sqlite3.Database('./database/interns.db');

db.serialize(() => {
  // Drop existing tables
  db.run('DROP TABLE IF EXISTS interns');

  // Create interns table with proper constraints
  db.run(`CREATE TABLE IF NOT EXISTS interns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    designation TEXT NOT NULL CHECK(designation IN ('SIWES', 'IT', 'NYSC')),
    course TEXT NOT NULL,
    posted_from TEXT DEFAULT 'Personnel Unit',
    year INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('in-progress', 'completed')) DEFAULT 'in-progress'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // Insert sample admin with verification
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  
  console.log('Creating default admin:', adminUser); // Debug log

  db.run(
    `INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
    [adminUser, adminPass],
    function(err) {
      if (err) {
        console.error('Error creating admin:', err);
      } else {
        console.log('Default admin created successfully');
      }
    }
  );

  // Add indexes for better search performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_interns_name ON interns(name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_interns_year ON interns(year)`);

  // Import data from CSV with date handling
  const fileContent = fs.readFileSync('./temp/data.csv', 'utf-8');
  const records = fileContent.split('\n');
  
  const stmt = db.prepare(`
    INSERT INTO interns (
      name, designation, course, posted_from, year, 
      start_date, end_date, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  records.forEach((record) => {
    if (record.trim()) {
      const [name, designation, course, posted_from, year] = record.split(',').map(s => s.trim());
      
      // Calculate start and end dates based on year
      const startDate = `${year}-01-01`; // January 1st of the year
      const endDate = `${year}-12-31`;   // December 31st of the year
      const status = new Date() > new Date(endDate) ? 'completed' : 'in-progress';

      stmt.run(
        name,
        designation,
        course,
        posted_from,
        year,
        startDate,
        endDate,
        status,
        function(err) {
          if (err) {
            console.error(`Error importing ${name}:`, err);
          }
        }
      );
    }
  });

  stmt.finalize();

  // Verify import
  db.all('SELECT * FROM interns', [], (err, rows) => {
    if (err) {
      console.error('Error verifying data:', err);
    } else {
      console.log(`Successfully imported ${rows.length} records`);
    }
  });

  // Log success
  console.log('Database migration completed');
});

// Close database connection
db.close((err) => {
  if (err) {
    console.error('Error closing database:', err);
  } else {
    console.log('Database connection closed');
  }
});