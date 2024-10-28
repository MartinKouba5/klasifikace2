const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

const SECRET_KEY = 'your_secret_key';  // Změňte na bezpečnější klíč v produkčním prostředí

app.use(cors());
app.use(express.json());

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

// Middleware pro ověřování tokenu
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ error: 'Token nebyl poskytnut' });
    }
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Neplatný token' });
        }
        req.user = decoded;
        next();
    });
};

// Registrace uživatele
app.post('/register', (req, res) => {
    const { username, password, role, classId, jmeno, prijmeni } = req.body;

    const schvalen = role === 'teacher' ? 1 : 0;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Chyba při hashování hesla' });
        }

        const sqlInsertUser = "INSERT INTO uzivatele (jmeno, heslo, role, trida_id, schvalen) VALUES (?, ?, ?, ?, ?)";
        db.query(sqlInsertUser, [username, hash, role, classId, schvalen], (err, userResult) => {
            if (err) {
                console.error("Chyba při registraci uživatele:", err);
                return res.status(500).json({ error: 'Chyba při registraci uživatele' });
            }

            const userId = userResult.insertId;

            if (role === 'student') {
                const sqlInsertStudent = "INSERT INTO zaci (jmeno, prijmeni, trida_id, user_id) VALUES (?, ?, ?, ?)";
                db.query(sqlInsertStudent, [jmeno, prijmeni, classId, userId], (err, studentResult) => {
                    if (err) {
                        console.error("Chyba při přidávání žáka:", err);
                        return res.status(500).json({ error: 'Chyba při přidávání žáka' });
                    }
                    res.json({ success: true, message: 'Student zaregistrován a přidán do seznamu žáků.', schvalen });
                });
            } else {
                const sqlInsertTeacher = "INSERT INTO ucitele (jmeno, prijmeni, trida_id) VALUES (?, ?, ?)";
                db.query(sqlInsertTeacher, [jmeno, prijmeni, classId], (err, teacherResult) => {
                    if (err) {
                        console.error("Chyba při přidávání učitele:", err);
                        return res.status(500).json({ error: 'Chyba při přidávání učitele' });
                    }
                    res.json({ success: true, message: 'Učitel zaregistrován a přidán do seznamu učitelů.', schvalen });
                });
            }
        });
    });
});

// Přihlášení uživatele
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM uzivatele WHERE jmeno = ? AND schvalen = 1";
    db.query(sql, [username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Uživatel nebyl nalezen nebo není schválen' });
        }

        const user = results[0];

        bcrypt.compare(password, user.heslo, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(401).json({ error: 'Nesprávné heslo' });
            }

            const token = jwt.sign({ id: user.id, role: user.role, classId: user.trida_id }, SECRET_KEY);
            res.json({ token, role: user.role });
        });
    });
});

// Endpoint pro zobrazení všech tříd
app.get('/tridy', (req, res) => {
    const sql = "SELECT * FROM tridy";
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Chyba při dotazu na databázi:", err);
            return res.status(500).json({ error: 'Chyba při dotazu na databázi', details: err });
        }
        if (!data || data.length === 0) {
            console.warn("Žádné třídy nebyly nalezeny.");
            return res.status(404).json({ error: 'Žádné třídy nebyly nalezeny.' });
        }
        console.log("Třídy načteny:", data);
        return res.json(data);
    });
});

// Přidání známky pro žáka
app.post('/znamky', verifyToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Pouze učitelé mohou přidávat známky' });
    }

    const { znamka, vaha, popis, userId } = req.body;
    const sqlInsertGrade = "INSERT INTO znamky (znamka, vaha, popis, user_id) VALUES (?, ?, ?, ?)";

    db.query(sqlInsertGrade, [znamka, vaha, popis, userId], (err, result) => {
        if (err) {
            console.error("Chyba při přidávání známky:", err);
            return res.status(500).json({ error: 'Chyba při přidávání známky' });
        }
        res.json({ success: true, message: 'Známka přidána' });
    });
});

// Zobrazení známek konkrétního žáka
app.get('/znamky/:userId', verifyToken, (req, res) => {
    const userId = req.params.userId;

    if (req.user.role !== 'teacher' && req.user.id != userId) {
        return res.status(403).json({ error: 'Nemáte oprávnění zobrazit známky tohoto uživatele' });
    }

    const sqlGetGrades = "SELECT * FROM znamky WHERE user_id = ?";
    db.query(sqlGetGrades, [userId], (err, results) => {
        if (err) {
            console.error("Chyba při načítání známek:", err);
            return res.status(500).json({ error: 'Chyba při načítání známek' });
        }
        res.json(results);
    });
});

// Smazání známky
app.delete('/znamky/:gradeId', verifyToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Pouze učitelé mohou mazat známky' });
    }

    const gradeId = req.params.gradeId;
    const sqlDeleteGrade = "DELETE FROM znamky WHERE id = ?";
    db.query(sqlDeleteGrade, [gradeId], (err, result) => {
        if (err) {
            console.error("Chyba při mazání známky:", err);
            return res.status(500).json({ error: 'Chyba při mazání známky' });
        }
        res.json({ success: true, message: 'Známka smazána' });
    });
});

// Výpočet průměru známek žáka
app.get('/prumer/:userId', verifyToken, (req, res) => {
    const userId = req.params.userId;

    if (req.user.role !== 'teacher' && req.user.id != userId) {
        return res.status(403).json({ error: 'Nemáte oprávnění zobrazit průměr tohoto uživatele' });
    }

    const sqlCalculateAverage = "SELECT SUM(znamka * vaha) / SUM(vaha) AS prumer FROM znamky WHERE user_id = ?";
    db.query(sqlCalculateAverage, [userId], (err, results) => {
        if (err) {
            console.error("Chyba při výpočtu průměru:", err);
            return res.status(500).json({ error: 'Chyba při výpočtu průměru' });
        }
        res.json(results[0]);
    });
});

// Smazání žáka (včetně známek)
app.delete('/zaci/:userId', verifyToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Pouze učitelé mohou mazat žáky' });
    }

    const userId = req.params.userId;

    const sqlDeleteGrades = "DELETE FROM znamky WHERE user_id = ?";
    db.query(sqlDeleteGrades, [userId], (err, result) => {
        if (err) {
            console.error("Chyba při mazání známek žáka:", err);
            return res.status(500).json({ error: 'Chyba při mazání známek žáka' });
        }

        const sqlDeleteStudent = "DELETE FROM zaci WHERE user_id = ?";
        db.query(sqlDeleteStudent, [userId], (err, result) => {
            if (err) {
                console.error("Chyba při mazání žáka:", err);
                return res.status(500).json({ error: 'Chyba při mazání žáka' });
            }

            const sqlDeleteUser = "DELETE FROM uzivatele WHERE id = ?";
            db.query(sqlDeleteUser, [userId], (err, result) => {
                if (err) {
                    console.error("Chyba při mazání uživatele:", err);
                    return res.status(500).json({ error: 'Chyba při mazání uživatele' });
                }
                res.json({ success: true, message: 'Žák a všechny jeho známky byly smazány' });
            });
        });
    });
});

// Endpoint pro úpravu schválení uživatele (pouze pro učitele ve stejné třídě)
app.put('/approve-user/:userId', verifyToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Pouze učitelé mohou schvalovat uživatele' });
    }

    const userId = req.params.userId;

    const sqlTeacherClass = "SELECT trida_id FROM uzivatele WHERE id = ?";
    db.query(sqlTeacherClass, [req.user.id], (err, teacherResult) => {
        if (err || teacherResult.length === 0) {
            return res.status(500).json({ error: 'Chyba při získávání třídy učitele' });
        }

        const teacherClassId = teacherResult[0].trida_id;

        const sqlCheckStudent = `
            SELECT * FROM uzivatele u
            JOIN zaci z ON u.id = z.user_id
            WHERE u.id = ? AND z.trida_id = ?
        `;
        db.query(sqlCheckStudent, [userId, teacherClassId], (err, studentResult) => {
            if (err || studentResult.length === 0) {
                return res.status(403).json({ error: 'Nemáte oprávnění schválit tohoto studenta.' });
            }

            const sqlApproveUser = "UPDATE uzivatele SET schvalen = 1 WHERE id = ?";
            db.query(sqlApproveUser, [userId], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Chyba při schvalování uživatele' });
                }
                res.json({ message: 'Uživatel schválen' });
            });
        });
    });
});

// Endpoint pro získání seznamu žáků ve třídě učitele
app.get('/zaci/:classId', verifyToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Pouze učitelé mohou zobrazit seznam žáků' });
    }

    const { classId } = req.params;
    const sqlGetStudents = "SELECT * FROM zaci WHERE trida_id = ?";
    
    db.query(sqlGetStudents, [classId], (err, results) => {
        if (err) {
            console.error("Chyba při načítání žáků:", err);
            return res.status(500).json({ error: 'Chyba při načítání žáků' });
        }
        res.json(results);
    });
});


// Endpoint pro zobrazení neschválených žáků učitele
app.get('/pending-students', verifyToken, (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Pouze učitelé mohou vidět neschválené žáky' });
    }

    const sql = `
        SELECT z.jmeno, z.prijmeni, u.id
        FROM zaci z
        JOIN uzivatele u ON z.user_id = u.id
        WHERE u.schvalen = 0 AND z.trida_id = ?
    `;
    db.query(sql, [req.user.classId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Chyba při načítání neschválených žáků' });
        }
        res.json(results);
    });
});

app.listen(8081, () => {
    console.log("Listening on port 8081");
});
