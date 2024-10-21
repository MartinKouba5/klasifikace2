import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newGrade, setNewGrade] = useState({ value: '', weight: '', description: '' });

  useEffect(() => {
    fetch('http://localhost:8081/tridy')
      .then(response => response.json())
      .then(data => setClasses(data))
      .catch(err => console.error("Chyba při načítání tříd:", err));
  }, []);

  const handleSelectClass = (e) => {
    const selectedClassId = e.target.value;
    setSelectedClass(selectedClassId);
    setSelectedStudent(null);

    fetch(`http://localhost:8081/zaci/${selectedClassId}`)
      .then(response => response.json())
      .then(data => setStudents(data))
      .catch(err => console.error("Chyba při načítání žáků:", err));
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent({ ...student, grades: [] });

    fetch(`http://localhost:8081/znamky/${student.id}`)
      .then(response => response.json())
      .then(data => {
        setSelectedStudent(prevStudent => ({ ...prevStudent, grades: data || [] }));
      })
      .catch(err => console.error("Chyba při načítání známek:", err));
  };

  const handleAddGrade = () => {
    if (selectedStudent && newGrade.value && newGrade.weight) {
      const gradeData = {
        znamka: parseInt(newGrade.value),
        vaha: parseInt(newGrade.weight),
        popis: newGrade.description || '',
        zak_id: selectedStudent.id
      };

      fetch('http://localhost:8081/znamky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gradeData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Chyba při přidávání známky: ${response.statusText}`);
        }
        return response.json();
      })
      .then(addedGrade => {
        if (addedGrade && addedGrade.id) {
          setSelectedStudent(prevStudent => ({
            ...prevStudent,
            grades: [...prevStudent.grades, addedGrade]
          }));
          setNewGrade({ value: '', weight: '', description: '' });
        } else {
          console.error("Chyba při přidávání známky: Neplatná odpověď serveru");
        }
      })
      .catch(err => console.error("Chyba při přidávání známky:", err));
    } else {
      console.error("Prosím vyplňte všechny hodnoty pro známku.");
    }
  };

  const handleDeleteGrade = (gradeId, index) => {
    fetch(`http://localhost:8081/znamky/${gradeId}`, {
      method: 'DELETE'
    })
    .then(() => {
      setSelectedStudent(prevStudent => {
        const updatedGrades = [...prevStudent.grades];
        updatedGrades.splice(index, 1);
        return { ...prevStudent, grades: updatedGrades };
      });
    })
    .catch(err => console.error("Chyba při mazání známky:", err));
  };

  const handleAddStudent = () => {
    if (newStudentName && selectedClass) {
      const studentData = {
        jmeno: newStudentName,
        trida_id: selectedClass
      };

      fetch('http://localhost:8081/zaci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      })
      .then(response => response.json())
      .then(newStudent => {
        setStudents([...students, newStudent]);
        setNewStudentName('');
      })
      .catch(err => console.error("Chyba při přidávání žáka:", err));
    }
  };

  const handleDeleteStudent = (studentId) => {
    fetch(`http://localhost:8081/zaci/${studentId}`, {
      method: 'DELETE'
    })
    .then(() => {
      setStudents(students.filter(student => student.id !== studentId));
      setSelectedStudent(null);
    })
    .catch(err => console.error("Chyba při mazání žáka:", err));
  };

  const calculateAverage = (grades) => {
    if (!grades || grades.length === 0) return 0;
    const totalWeight = grades.reduce((sum, grade) => sum + grade.vaha, 0);
    const weightedSum = grades.reduce((sum, grade) => sum + (grade.znamka * grade.vaha), 0);
    return (weightedSum / totalWeight).toFixed(2);
  };

  return (
    <div className="App">
      <h1>Školní známkovací systém</h1>

      <div>
        <label>Vyber třídu: </label>
        <select value={selectedClass} onChange={handleSelectClass}>
          <option value="">--Vyber třídu--</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.nazev}</option>
          ))}
        </select>
      </div>

      {selectedClass && (
        <div>
          <h2>Přidat nového žáka</h2>
          <input
            type="text"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            placeholder="Jméno žáka"
          />
          <button onClick={handleAddStudent}>Přidat žáka</button>
        </div>
      )}

      {selectedClass && (
        <div>
          <h2>Žáci ve třídě</h2>
          <ul>
            {students.map(student => (
              <li key={student.id}>
                {student.jmeno}
                <button onClick={() => handleSelectStudent(student)}>Vybrat</button>
                <button onClick={() => handleDeleteStudent(student.id)}>Smazat žáka</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedStudent && (
        <div>
          <h2>Přidat známku pro {selectedStudent.jmeno}</h2>
          <input
            type="number"
            value={newGrade.value}
            onChange={(e) => setNewGrade({ ...newGrade, value: e.target.value })}
            placeholder="Známka (1-5)"
            min="1"
            max="5"
          />
          <input
            type="number"
            value={newGrade.weight}
            onChange={(e) => setNewGrade({ ...newGrade, weight: e.target.value })}
            placeholder="Váha (1-10)"
            min="1"
            max="10"
          />
          <input
            type="text"
            value={newGrade.description}
            onChange={(e) => setNewGrade({ ...newGrade, description: e.target.value })}
            placeholder="Popis"
          />
          <button onClick={handleAddGrade}>Přidat známku</button>

          <h3>Známky</h3>
          <ul>
            {selectedStudent.grades && selectedStudent.grades.length > 0 ? (
              selectedStudent.grades.map((grade, index) => (
                <li key={index}>
                  Známka: {grade.znamka}, Váha: {grade.vaha}, Popis: {grade.popis}
                  <button onClick={() => handleDeleteGrade(grade.id, index)}>Smazat</button>
                </li>
              ))
            ) : (
              <li>Žádné známky k dispozici</li>
            )}
          </ul>

          <h3>Průměr známek: {calculateAverage(selectedStudent.grades)}</h3>
        </div>
      )}
    </div>
  );
}

export default App;
