# Intern Management System

A system for managing ICT interns, SIWES students, and NYSC members.

## Database Setup and Management

### Prerequisites
- Node.js installed
- npm package manager
- Environment variables set up in `.env` file:
  ```
  ADMIN_USER=your_admin_username
  ADMIN_PASS=your_admin_password
  ```

### Initial Database Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run database migrations:
   ```bash
   npm run migrate
   ```

### Importing Data from CSV

1. Create a CSV file with the following columns:
   ```
   name,designation,course,posted_from,year
   ```

   Example format:
   ```csv
   John Doe,SIWES,Computer Science,Personnel Unit,2024
   Jane Smith,IT,Engineering,Personnel Unit,2024
   ```

   Note: 
   - `designation` must be one of: SIWES, IT, or NYSC
   - `year` should be a valid year (e.g., 2024)

2. Place your CSV file in the `temp` folder as `data.csv`

3. Run the migration script to import:
   ```bash
   npm run migrate
   ```

   This will:
   - Create necessary tables if they don't exist
   - Import data from the CSV file
   - Automatically calculate start_date (January 1st) and end_date (December 31st)
   - Set status as 'in-progress' or 'completed' based on end date

### Database Structure

The database uses SQLite with the following main tables:

1. `interns` table:
   ```sql
   CREATE TABLE interns (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     designation TEXT NOT NULL CHECK(designation IN ('SIWES', 'IT', 'NYSC')),
     course TEXT NOT NULL,
     posted_from TEXT DEFAULT 'Personnel Unit',
     year INTEGER NOT NULL,
     start_date TEXT NOT NULL,
     end_date TEXT NOT NULL,
     status TEXT NOT NULL CHECK(status IN ('in-progress', 'completed'))
   )
   ```

2. `admins` table:
   ```sql
   CREATE TABLE admins (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT UNIQUE,
     password TEXT
   )
   ```

### Backup and Recovery

1. To backup the database:
   - Copy the `database/interns.db` file to a safe location

2. To restore from backup:
   - Stop the application
   - Replace `database/interns.db` with your backup file
   - Restart the application

### Common Issues and Solutions

1. **CSV Import Fails**
   - Ensure CSV format matches the required structure
   - Check for special characters in the CSV
   - Verify the file is saved as UTF-8 encoding

2. **Database Locked**
   - Ensure no other processes are using the database
   - Stop and restart the application

### API Endpoints

The system provides several API endpoints for managing interns:

- GET `/api/interns` - List all interns (with filtering)
- POST `/api/interns` - Add new intern
- GET `/api/interns/:id` - Get single intern
- DELETE `/api/interns/:id` - Delete intern
- GET `/api/interns/stats` - Get statistics

## Running the Application

1. Start the server:
   ```bash
   npm start
   ```

2. For development with auto-reload:
   ```bash
   npm run dev
   ```

