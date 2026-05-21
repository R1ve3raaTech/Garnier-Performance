import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute  from './components/ProtectedRoute';
import Layout          from './components/Layout';

import Login          from './pages/Login/Login';
import Unauthorized   from './pages/Unauthorized/Unauthorized';
import Dashboard      from './pages/Dashboard/Dashboard';
import HRAssistant    from './pages/HRAssistant/HRAssistant';
import PulseWork      from './pages/PulseWork/PulseWork';
import Performance    from './pages/Performance/Performance';
import TeamDashboard  from './pages/TeamDashboard/TeamDashboard';
import Meetings       from './pages/Meetings/Meetings';
import ENPSDashboard  from './pages/ENPSDashboard/ENPSDashboard';
import RAGDocuments      from './pages/RAGDocuments/RAGDocuments';
import ENPSForm         from './pages/ENPSForm/ENPSForm';
import Recognition      from './pages/Recognition/Recognition';
import Feedback         from './pages/Feedback/Feedback';
import SurveyManagement from './pages/SurveyManagement/SurveyManagement';
import Escalations      from './pages/Escalations/Escalations';
import Profile          from './pages/Profile/Profile';
import UserManagement  from './pages/UserManagement/UserManagement';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login"        element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Rutas protegidas — cualquier usuario autenticado */}
        <Route element={<ProtectedRoute allowedRoles={['Funcionario', 'Jefatura', 'RH', 'Admin']} />}>
          <Route element={<Layout />}>
            <Route index                 element={<Dashboard />} />
            <Route path="hr-assistant"  element={<HRAssistant />} />
            <Route path="pulse-work"    element={<PulseWork />} />
            <Route path="enps-form"     element={<ENPSForm />} />
            <Route path="performance"   element={<Performance />} />
            <Route path="recognition"   element={<Recognition />} />
            <Route path="feedback"      element={<Feedback />} />
            <Route path="profile"       element={<Profile />} />

            {/* Jefatura, RH y Admin */}
            <Route element={<ProtectedRoute allowedRoles={['Jefatura', 'RH', 'Admin']} />}>
              <Route path="team-dashboard" element={<TeamDashboard />} />
              <Route path="meetings"       element={<Meetings />} />
            </Route>

            {/* Solo RH y Admin */}
            <Route element={<ProtectedRoute allowedRoles={['RH', 'Admin']} />}>
              <Route path="enps-dashboard"    element={<ENPSDashboard />} />
              <Route path="survey-management" element={<SurveyManagement />} />
              <Route path="escalations"       element={<Escalations />} />
              <Route path="rag-documents"     element={<RAGDocuments />} />
            </Route>

            {/* Solo Admin */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="user-management" element={<UserManagement />} />
            </Route>
          </Route>
        </Route>

        {/* Cualquier ruta desconocida → inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
