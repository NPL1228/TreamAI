import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChatRoom from './pages/ChatRoom';
import MeetingRoom from './pages/MeetingRoom';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import FriendsList from './pages/FriendsList';
import ChatList from './pages/ChatList';
import ChatInfo from './pages/ChatInfo';
import Notifications from './pages/Notifications';
import MeetingLeft from './pages/MeetingLeft';
import Layout from './components/Layout';
import './index.css';

function App() {
  const [user, setUser] = useState(() => localStorage.getItem('treamai_user'));

  const handleLogin = (username) => {
    localStorage.setItem('treamai_user', username);
    setUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('treamai_user');
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/forgot-password" 
          element={!user ? <ForgotPassword /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/reset-password" 
          element={!user ? <ResetPassword /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/" 
          element={!user ? <Landing /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <Layout user={user} onLogout={handleLogout}><Dashboard user={user} /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={user ? <Layout user={user} onLogout={handleLogout}><Settings user={user} /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/notifications" 
          element={user ? <Layout user={user} onLogout={handleLogout}><Notifications user={user} /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/friends" 
          element={user ? <Layout user={user} onLogout={handleLogout}><FriendsList user={user} /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/chats/private" 
          element={user ? <Layout user={user} onLogout={handleLogout}><ChatList user={user} type="private" /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/chats/team" 
          element={user ? <Layout user={user} onLogout={handleLogout}><ChatList user={user} type="team" /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/chat/:chatId" 
          element={user ? <Layout user={user} onLogout={handleLogout}><ChatRoom user={user} /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/chat/:chatId/info" 
          element={user ? <Layout user={user} onLogout={handleLogout}><ChatInfo user={user} /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/meeting/:meetingId" 
          element={user ? <MeetingRoom user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/meeting-left" 
          element={user ? <MeetingLeft /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
