require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');
const os = require('os');
const app = express();
const port = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./database/interns.db');

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Admin auth middleware
const adminAuth = (req, res, next) => {
  req.session.admin ? next() : res.redirect('/login');
};

// Routes
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/admin/dashboard', adminAuth, (req, res) => res.sendFile(path.join(__dirname, 'public/admin/dashboard.html')));
app.get('/student/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public/student/dashboard.html')));

// Admin Login API
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required' 
    });
  }

  db.get(
    'SELECT id FROM admins WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          error: 'Database error' 
        });
      }
      
      if (row) {
        req.session.admin = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }
    }
  );
});

// Admin Registration API
app.post('/api/admin/register', adminAuth, (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required' 
    });
  }

  // Check if username already exists
  db.get('SELECT id FROM admins WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database error' 
      });
    }
    
    if (row) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username already exists' 
      });
    }

    // Insert new admin
    db.run(
      'INSERT INTO admins (username, password) VALUES (?, ?)',
      [username, password],
      function(err) {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create admin user' 
          });
        }
        res.json({ success: true });
      }
    );
  });
});

// Interns API
app.get('/api/interns', adminAuth, (req, res) => {
  const { search, status, year, page = 1, limit = 10 } = req.query;
  let conditions = [];
  let params = [];

  if (search) {
    conditions.push('(name LIKE ? OR course LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (year) {
    conditions.push('year = ?');
    params.push(year);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const query = `
    SELECT * FROM interns ${whereClause}
    ORDER BY start_date DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM interns ${whereClause}
  `;

  db.get(countQuery, params, (err, { total }) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    db.all(query, [...params, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const totalPages = Math.ceil(total / limit);
      res.json({
        data: rows,
        total,
        page: Number(page),
        totalPages
      });
    });
  });
});

// Get single intern
app.get('/api/interns/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM interns WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Intern not found' });
    res.json(row);
  });
});

// Student API
app.get('/api/student', (req, res) => {
  const { name, year } = req.query;
  db.get(
    'SELECT * FROM interns WHERE name = ? AND year = ?',
    [name, year],
    (err, row) => res.json(row || {})
  );
});

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return `20${year}-${month}-${day}`; // Convert to ISO format for storage
}

// Add Intern
app.post('/api/interns', adminAuth, (req, res) => {
  const { name, designation, course, year } = req.body;
  let { start_date, end_date } = req.body;

  // Convert dates to ISO format if they're in dd/mm/yy format
  if (start_date && start_date.includes('/')) {
    start_date = parseDate(start_date);
  }
  if (end_date && end_date.includes('/')) {
    end_date = parseDate(end_date);
  }

  // Validate required fields
  if (!name || !designation || !course || !year) {
    return res.status(400).json({ 
      success: false, 
      error: 'Name, designation, course and year are required' 
    });
  }

  // Set default dates if not provided
  if (!start_date) start_date = `${year}-01-01`;
  if (!end_date) end_date = `${year}-12-31`;

  // Determine status
  const status = new Date() > new Date(end_date) ? 'completed' : 'in-progress';

  db.run(
    `INSERT INTO interns (
      name, designation, course, year, 
      start_date, end_date, status, posted_from
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, designation, course, year, start_date, end_date, status, 'Personnel Unit'],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Database error' 
        });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

app.put('/api/interns/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { name, designation, course, year } = req.body;
  let { start_date, end_date, status } = req.body;

  // Validate required fields
  if (!name || !designation || !course || !year || !start_date || !end_date) {
    return res.status(400).json({ 
      success: false, 
      error: 'All fields are required' 
    });
  }

  // Convert dates if in dd/mm/yy format
  if (start_date.includes('/')) {
    const [day, month, year] = start_date.split('/');
    start_date = `20${year}-${month}-${day}`;
  }
  if (end_date.includes('/')) {
    const [day, month, year] = end_date.split('/');
    end_date = `20${year}-${month}-${day}`;
  }

  // Automatically determine status based on end date
  const today = new Date();
  const endDate = new Date(end_date);
  status = endDate < today ? 'completed' : 'in-progress';

  db.run(
    `UPDATE interns 
     SET name = ?, 
         designation = ?, 
         course = ?, 
         year = ?, 
         start_date = ?, 
         end_date = ?, 
         status = ?
     WHERE id = ?`,
    [name, designation, course, year, start_date, end_date, status, id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Database error' 
        });
      }
      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Intern not found' 
        });
      }
      res.json({ success: true });
    }
  );
});

// Delete intern
app.delete('/api/interns/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM interns WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ success: false, error: 'Database error' });
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Intern not found' });
    }
    res.json({ success: true });
  });
});

app.get('/api/interns/stats', adminAuth, (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM interns`;

  db.get(query, [], (err, stats) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(stats);
  });
});

function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(port, '0.0.0.0', () => {
  const networkIp = getLocalNetworkIp();
  console.log(`\nServer running!`);
  console.log(`Local:   http://localhost:${port}/`);
  console.log(`Network: http://${networkIp}:${port}/\n`);
});