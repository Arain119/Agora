import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Tokens } from './pages/Tokens';
import { Models } from './pages/Models';
import { Logs } from './pages/Logs';
import { Upstreams } from './pages/admin/Upstreams';
import { AdminLogs } from './pages/admin/AdminLogs';
import { Users } from './pages/admin/Users';
import { Invites } from './pages/admin/Invites';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tokens" element={<Tokens />} />
            <Route path="models" element={<Models />} />
            <Route path="logs" element={<Logs />} />
            
            {/* Admin Routes */}
            <Route path="admin/upstreams" element={<Upstreams />} />
            <Route path="admin/logs" element={<AdminLogs />} />
            <Route path="admin/users" element={<Users />} />
            <Route path="admin/invites" element={<Invites />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
