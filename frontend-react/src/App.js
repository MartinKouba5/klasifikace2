import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [prijmeni, setPrijmeni] = useState('');
  const [classes, setClasses] = useState([]);
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState('');
  const [pendingStudents, setPendingStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentGrades, setStudentGrades] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newGrade, setNewGrade] = useState({ znamka: '', vaha: '', popis: '' });
  const [average, setAverage] = useState(null);

  useEffect(() => {
    if (isLoggedIn || isRegistering) {
      fetch('http://localhost:8081/tridy')
        .then(response => response.json())
        .then(data => setClasses(data))
        .catch(err => console.error("Chyba při načítání tříd:", err));
    }

    if (isLoggedIn && userRole === 'teacher') {
      fetchPendingStudents();
      fetchStudents();
    } else if (isLoggedIn && userRole === 'student') {
      fetchStudentGrades();
    }
  }, [isLoggedIn, isRegistering, userRole]);

  const fetchPendingStudents = () => {
    fetch('http://localhost:8081/pending-students', {
      headers: { Authorization: token },
    })
      .then(response => response.json())
      .then(data => setPendingStudents(data))
      .catch(err => console.error("Chyba při načítání neschválených žáků:", err));
  };

  const fetchStudents = () => {
    const classId = JSON.parse(atob(token.split('.')[1])).classId;
    fetch(`http://localhost:8081/zaci/${classId}`, {
      headers: { Authorization: token },
    })
      .then(response => response.json())
      .then(data => setStudents(data))
      .catch(err => console.error("Chyba při načítání žáků:", err));
  };

  const fetchStudentGrades = (userId = null) => {
    const id = userId || (selectedStudent && selectedStudent.user_id) || JSON.parse(atob(token.split('.')[1])).id;
    fetch(`http://localhost:8081/znamky/${id}`, {
      headers: { Authorization: token },
    })
      .then(response => response.json())
      .then(data => setStudentGrades(data))
      .catch(err => console.error("Chyba při načítání známek:", err));
  };

  const handleRegister = () => {
    if (username && password && (selectedClass || role) && jmeno && prijmeni) {
      const userData = { username, password, role: role || 'student', classId: selectedClass || null, jmeno, prijmeni };
      fetch('http://localhost:8081/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setIsRegistering(false);
            alert('Registrace úspěšná. Nyní se můžete přihlásit.');
          } else {
            alert('Registrace selhala: ' + data.message);
          }
        })
        .catch(err => console.error('Chyba při registraci:', err));
    } else {
      alert('Vyplňte prosím všechny potřebné údaje.');
    }
  };

  const handleLogin = () => {
    if (username && password) {
      fetch('http://localhost:8081/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.token) {
            setToken(data.token);
            setUserRole(data.role);
            setIsLoggedIn(true);
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
  
            // Pokud je přihlášený uživatel student, automaticky nastavíme `selectedStudent`
            if (data.role === 'student') {
              const studentId = JSON.parse(atob(data.token.split('.')[1])).id;
              setSelectedStudent({ id: studentId });
              fetchStudentGrades(studentId);
            }
  
            alert('Přihlášení úspěšné.');
          } else {
            alert('Přihlášení selhalo: ' + data.error);
          }
        })
        .catch(err => console.error('Chyba při přihlášení:', err));
    } else {
      alert('Vyplňte prosím přihlašovací údaje.');
    }
  };
  

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    setUserRole('');
    setPendingStudents([]);
    setStudentGrades([]);
    setAverage(null);
    setSelectedStudent(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    alert('Odhlášení úspěšné.');
  };

  const handleApproveStudent = (studentId) => {
    fetch(`http://localhost:8081/approve-user/${studentId}`, {
      method: 'PUT',
      headers: { Authorization: token },
    })
      .then(response => {
        if (response.ok) {
          setPendingStudents(pendingStudents.filter(student => student.id !== studentId));
          alert('Žák byl schválen');
        } else {
          alert('Nepodařilo se schválit žáka');
        }
      })
      .catch(err => console.error("Chyba při schvalování žáka:", err));
  };

  const handleAddGrade = () => {
    if (selectedStudent && newGrade.znamka && newGrade.vaha) {
      fetch('http://localhost:8081/znamky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          znamka: parseInt(newGrade.znamka),
          vaha: parseInt(newGrade.vaha),
          popis: newGrade.popis || '',
          userId: selectedStudent.user_id || selectedStudent.id,
        }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(() => {
          fetchStudentGrades(selectedStudent.user_id || selectedStudent.id);
          setNewGrade({ znamka: '', vaha: '', popis: '' });
          alert('Známka byla úspěšně přidána');
        })
        .catch(err => console.error("Chyba při přidávání známky:", err));
    } else {
      alert('Vyplňte všechny hodnoty pro známku.');
    }
  };

  const handleDeleteGrade = (gradeId) => {
    fetch(`http://localhost:8081/znamky/${gradeId}`, {
      method: 'DELETE',
      headers: { Authorization: token },
    })
      .then(() => fetchStudentGrades(selectedStudent.user_id || selectedStudent.id))
      .catch(err => console.error("Chyba při mazání známky:", err));
  };

  const handleDeleteStudent = (studentId) => {
    fetch(`http://localhost:8081/zaci/${studentId}`, {
      method: 'DELETE',
      headers: { Authorization: token },
    })
      .then(() => setPendingStudents(pendingStudents.filter(student => student.id !== studentId)))
      .catch(err => console.error("Chyba při mazání žáka:", err));
  };

  const calculateAverage = () => {
    fetch(`http://localhost:8081/prumer/${selectedStudent.user_id || selectedStudent.id}`, {
      headers: { Authorization: token },
    })
      .then(response => response.json())
      .then(data => setAverage(data.prumer))
      .catch(err => console.error("Chyba při výpočtu průměru:", err));
  };
  
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    fetchStudentGrades(student.user_id || student.id); // Zajišťuje, že načítáme známky pro správného žáka
  };
  

  const renderGrades = () => (
    <div>
      <h3>Známky</h3>
      <ul>
        {studentGrades.length > 0 ? (
          studentGrades.map((grade, index) => (
            <li key={index}>
              Známka: {grade.znamka}, Váha: {grade.vaha}, Popis: {grade.popis}
              {userRole === 'teacher' && (
                <button onClick={() => handleDeleteGrade(grade.id)}>Smazat</button>
              )}
            </li>
          ))
        ) : (
          <li>Žádné známky k dispozici</li>
        )}
      </ul>
      <button onClick={calculateAverage}>Spočítat průměr</button>
      {average !== null && <p>Průměr: {average}</p>}
    </div>
  );

  const renderTeacherControls = () => (
    <div>
      <h2>Správa známek</h2>
      <h3>Neschválení žáci</h3>
      <ul>
        {pendingStudents.length > 0 ? (
          pendingStudents.map(student => (
            <li key={student.id}>
              {student.jmeno} {student.prijmeni}
              <button onClick={() => handleApproveStudent(student.id)}>Schválit</button>
            </li>
          ))
        ) : (
          <li>Žádní neschválení studenti</li>
        )}
      </ul>
      <h3>Žáci ve třídě</h3>
      <ul>
        {students.map(student => (
          <li key={student.id} onClick={() => handleSelectStudent(student)} className="student-item">
            {student.jmeno} {student.prijmeni}
          </li>
        ))}
      </ul>
      {selectedStudent && (
        <div>
          <h3>Vybraný žák: {selectedStudent.jmeno} {selectedStudent.prijmeni}</h3>
          {renderGrades()}
          <input type="number" placeholder="Známka (1-5)" value={newGrade.znamka} onChange={(e) => setNewGrade({ ...newGrade, znamka: e.target.value })} />
          <input type="number" placeholder="Váha (1-10)" value={newGrade.vaha} onChange={(e) => setNewGrade({ ...newGrade, vaha: e.target.value })} />
          <input type="text" placeholder="Popis" value={newGrade.popis} onChange={(e) => setNewGrade({ ...newGrade, popis: e.target.value })} />
          <button onClick={handleAddGrade}>Přidat známku</button>
        </div>
      )}
    </div>
  );
  
  const renderRegister = () => (
    <div>
      <h2>Registrace</h2>
      <input type="text" placeholder="Uživatelské jméno" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="text" placeholder="Jméno" value={jmeno} onChange={(e) => setJmeno(e.target.value)} />
      <input type="text" placeholder="Příjmení" value={prijmeni} onChange={(e) => setPrijmeni(e.target.value)} />
      <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
        <option value="">Vyberte třídu</option>
        {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.nazev}</option>)}
      </select>
      <div>
        <label><input type="radio" name="role" value="student" checked={role === 'student'} onChange={(e) => setRole(e.target.value)} /> Žák</label>
        <label><input type="radio" name="role" value="teacher" checked={role === 'teacher'} onChange={(e) => setRole(e.target.value)} /> Učitel</label>
      </div>
      <button onClick={handleRegister}>Zaregistrovat se</button>
      <p>Máte již účet? <button onClick={() => setIsRegistering(false)}>Přihlaste se</button></p>
    </div>
  );

  const renderLogin = () => (
    <div>
      <h2>Přihlášení</h2>
      <input type="text" placeholder="Uživatelské jméno" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Heslo" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Přihlásit se</button>
      <p>Nemáte účet? <button onClick={() => setIsRegistering(true)}>Zaregistrujte se</button></p>
    </div>
  );

  const renderContent = () => {
    if (userRole === 'teacher') {
      return renderTeacherControls();
    } else if (userRole === 'student') {
      return (
        <div>
          <p>Jste přihlášen jako žák. Zde jsou vaše známky.</p>
          {renderGrades()}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="App">
      <h1>Školní známkovací systém</h1>
      {isLoggedIn ? (
        <div>
          {renderContent()}
          <button onClick={handleLogout}>Odhlásit se</button>
        </div>
      ) : (
        isRegistering ? renderRegister() : renderLogin()
      )}
    </div>
  );
}

export default App;
