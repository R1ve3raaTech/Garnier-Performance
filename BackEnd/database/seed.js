import dotenv from 'dotenv';
dotenv.config();

import supabase from '../src/config/supabaseClient.js';

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
    const { data: existing } = await supabase.from('profiles').select('id').eq('email', u.email).maybeSingle();

    let userId;
    if (existing) {
      userId = existing.id;
      console.log(`Usuario ya existe, reutilizando: ${u.email}`);
    } else {
      const { data: created, error: authError } = await supabase.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
      });
      if (authError) throw authError;
      userId = created.user.id;

      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId, name: u.name, email: u.email,
        role_id: u.role_id, area_id: u.area_id, position: u.position, hire_date: u.hire_date,
      });
      if (profileError) throw profileError;
      console.log(`Usuario creado: ${u.email}`);
    }

    insertedUsers[u.email] = userId;
  }

  for (const gs of goalSeeds) {
    const userId = insertedUsers[gs.userEmail];
    for (const g of gs.goals) {
      const { error } = await supabase.from('goals').insert({ user_id: userId, ...g });
      if (error) throw error;
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
