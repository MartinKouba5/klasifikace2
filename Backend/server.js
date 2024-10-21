const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());  // Pro zpracování JSON těla requestu

const db = mysql.createConnection({
    host: "127.0.0.1",
    user: 'root',
    password: '',
    database: 'kouba2'
});

db.connect((err) => {
    if (err) {
        console.error('Chyba při připojování k databázi:', err);
        return;
    }
    console.log('Připojeno k databázi MySQL');
});

// Endpoint pro zobrazení všech tříd
app.get('/tridy', (req, res) => {
    const sql = "SELECT * FROM tridy";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Chyba při dotazu na databázi:", err);
            return res.status(500).json({ error: 'Chyba při dotazu na databázi', details: err });
        }
        return res.json(data);
    });
});

// Endpoint pro zobrazení všech žáků podle třídy
app.get('/zaci/:tridaId', (req, res) => {
    const tridaId = req.params.tridaId;
    const sql = "SELECT * FROM zaci WHERE trida_id = ?";
    db.query(sql, [tridaId], (err, data) => {
        if (err) {
            console.error("Chyba při dotazu na databázi:", err);
            return res.status(500).json({ error: 'Chyba při dotazu na databázi', details: err });
        }
        return res.json(data);
    });
});

// Endpoint pro zobrazení známek žáka
app.get('/znamky/:zakId', (req, res) => {
    const zakId = req.params.zakId;
    const sql = "SELECT * FROM znamky WHERE zak_id = ?";
    db.query(sql, [zakId], (err, data) => {
        if (err) {
            console.error("Chyba při dotazu na databázi:", err);
            return res.status(500).json({ error: 'Chyba při dotazu na databázi', details: err });
        }
        return res.json(data);
    });
});

// Endpoint pro přidání žáka
app.post('/zaci', (req, res) => {
    const { jmeno, trida_id } = req.body;
    const sql = "INSERT INTO zaci (jmeno, trida_id) VALUES (?, ?)";
    db.query(sql, [jmeno, trida_id], (err, result) => {
        if (err) {
            console.error("Chyba při vkládání žáka:", err);
            return res.status(500).json({ error: 'Chyba při vkládání žáka', details: err });
        }
        return res.json({ id: result.insertId, jmeno, trida_id });
    });
});

// Endpoint pro přidání známky pro žáka
app.post('/znamky', (req, res) => {
    const { znamka, vaha, popis, zak_id } = req.body; // Změněno z 'hodnota' na 'znamka'

    

    const sql = "INSERT INTO znamky (zak_id, znamka, vaha, popis) VALUES (?, ?, ?, ?)";
    db.query(sql, [zak_id, znamka, vaha, popis], (err, result) => {
        if (err) {
            console.error("Chyba při vkládání známky:", err);
            return res.status(500).json({ error: 'Chyba při vkládání známky', details: err });
        }
        console.log("Nová známka byla přidána:", { id: result.insertId, znamka, vaha, popis, zak_id });
        return res.json({ id: result.insertId, znamka, vaha, popis, zak_id });
    });
});


// Endpoint pro smazání známky
app.delete('/znamky/:znamkaId', (req, res) => {
    const znamkaId = req.params.znamkaId;
    const sql = "DELETE FROM znamky WHERE id = ?";
    db.query(sql, [znamkaId], (err, result) => {
        if (err) {
            console.error("Chyba při mazání známky:", err);
            return res.status(500).json({ error: 'Chyba při mazání známky', details: err });
        }
        return res.json({ message: 'Známka smazána' });
    });
});

// Endpoint pro smazání žáka
app.delete('/zaci/:zakId', (req, res) => {
    const zakId = req.params.zakId;
    const sql = "DELETE FROM zaci WHERE id = ?";
    db.query(sql, [zakId], (err, result) => {
        if (err) {
            console.error("Chyba při mazání žáka:", err);
            return res.status(500).json({ error: 'Chyba při mazání žáka', details: err });
        }
        return res.json({ message: 'Žák smazán' });
    });
});

app.listen(8081, () => {
    console.log("Listening on port 8081");
});
