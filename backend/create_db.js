const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    user: 'postgres',
    password: 'postgres', // Adjust this if the user has a different password
    host: 'localhost',
    port: 5432,
    database: 'postgres' // Connect to default db to create another one
  });

  try {
    await client.connect();
    const res = await client.query("SELECT datname FROM pg_database WHERE datname = 'myturn_db'");
    if (res.rowCount === 0) {
      await client.query('CREATE DATABASE myturn_db');
      console.log('Database myturn_db created successfully.');
    } else {
      console.log('Database myturn_db already exists.');
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
  } finally {
    await client.end();
  }
}

createDatabase();
