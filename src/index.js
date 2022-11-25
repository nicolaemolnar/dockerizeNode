import express from 'express';
import { createConnection } from 'mysql';

const db = createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'cars'
});

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.json({ 
    message: 'Welcome to my REST API! 🎉'+
    '👉🏻 Visit `/api/cars` to list all the cars in the database' +
    '👉🏻 Visit `/api/cars/:id` to get a specific car by its id' +
    '👉🏻 Post a json to `/api/cars/` to add a new car to the database' +
    ' Thanks for visiting! 🙏🏻'
}));

app.get('/api/cars', (req, res) =>
    // Fetch all cars in db
    db.query('SELECT * FROM cars', (err, rows) => {
        if (err) throw err;
        res.json(rows);
    })
);

app.get('/api/cars/:id', (req, res) =>
    // Fetch a specific car in db
    db.query('SELECT * FROM cars WHERE id = ?', [req.params.id], (err, rows) => {
        if (err) throw err;
        res.json(rows);
    })
);

app.post('/api/cars', (req, res) =>
    // Add a new car to db
    db.query('INSERT INTO cars SET ?', req.body, (err, rows) => {
        if (err) throw err;
        res.json(rows);
    })
);

app.listen(port, () => console.log(`Server running on port ${port}`));
