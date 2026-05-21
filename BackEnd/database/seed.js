import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

const SALT_ROUNDS = 10;

const users = [
  {
    name: 'Admin Garnier',
    email: 'admin@garnier.com',
    password: 'password123',
    role_id: 4, // Admin
    area_id: 2, // Recursos Humanos
    position: 'HR Director',
    hire_date: '2020-03-01',
  },
  {
    name: 'María Ramírez',
    email: 'rh@garnier.com',
    password: 'password123',
    role_id: 3, // RH
    area_id: 2, // Recursos Humanos
    position: 'HR Business Partner',
    hire_date: '2021-06-15',
  },
  {
    name: 'Carlos López',
    email: 'jefe@garnier.com',
    password: 'password123',
    role_id: 2, // Jefatura
    area_id: 1, // Tecnología
    position: 'Tech Lead',
    hire_date: '2022-01-10',
  },
  {
    name: 'Ana Torres',
    email: 'funcionario@garnier.com',
    password: 'password123',
    role_id: 1, // Funcionario
    area_id: 1, // Tecnología
    position: 'Developer',
    hire_date: '2023-08-20',
  },
];

const goalSeeds = [
  {
    userEmail: 'funcionario@garnier.com',
    goals: [
      {
        type: 'OKR',
        title: 'Aumentar satisfacción del cliente',
        description: 'Mejorar NPS de 65 a 80 puntos en Q3',
        target_value: 80,
        current_value: 71,
        unit: 'NPS points',
        due_date: '2026-09-30',
        status: 'EN_PROGRESO',
      },
      {
        type: 'KPI',
        title: 'Reducir tiempo de resolución de tickets',
        description: 'De 48h promedio a 24h',
        target_value: 24,
        current_value: 36,
        unit: 'horas',
        due_date: '2026-06-30',
        status: 'EN_PROGRESO',
      },
    ],
  },
];

const seed = async () => {
  console.log('Iniciando seed...\n');

  const insertedUsers = {};

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, role_id, area_id, position, hire_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [u.name, u.email, hash, u.role_id, u.area_id, u.position, u.hire_date]
    );
    const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [u.email]);
    insertedUsers[u.email] = rows[0].id;
    console.log(`Usuario creado: ${u.email}`);
  }

  for (const gs of goalSeeds) {
    const userId = insertedUsers[gs.userEmail];
    for (const g of gs.goals) {
      await pool.execute(
        `INSERT INTO goals (user_id, type, title, description, target_value, current_value, unit, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, g.type, g.title, g.description, g.target_value, g.current_value, g.unit, g.due_date, g.status]
      );
    }
    console.log(`Metas creadas para: ${gs.userEmail}`);
  }

  console.log('\nSeed completado.');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
