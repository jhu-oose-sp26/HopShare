import { useMemo, useState, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import LandingPage from '@/pages/LandingPage';
import ProfilePage from '@/pages/ProfilePage';
import UserProfile from '@/pages/UserProfile';
import FriendsPage from '@/pages/FriendsPage';
import ChatPage from '@/pages/ChatPage';
import MessagesPage from '@/pages/MessagesPage';
import StatusPage from '@/pages/StatusPage';
import BottomNav from '@/components/BottomNav';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
const USER_STORAGE_KEY = 'hopshare.user';
const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const socket = io(SOCKET_URL || API_ROOT);

const encodeEmail = (email) => email?.replace(/\./g, '(dot)') || '';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function AppRoutes({ currentUser, authApi }) {
  const location = useLocation();
  const showNav = currentUser && location.pathname !== '/landing' && !location.pathname.startsWith('/status');
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!currentUser?.email) return;
    const fetchUnread = async () => {
      try {
        const [postRes, dmRes] = await Promise.all([
          fetch(`${API_ROOT}/chat/user/${encodeURIComponent(currentUser.email)}`),
          fetch(`${API_ROOT}/chat/dm/user/${encodeURIComponent(currentUser.email)}`)
        ]);
        const postChats = await postRes.json();
        const dmChats = await dmRes.json();
        const all = [...(Array.isArray(postChats) ? postChats : []), ...(Array.isArray(dmChats) ? dmChats : [])];
        const total = all.reduce((sum, c) => sum + (c.unreadCount?.[encodeEmail(currentUser.email)] || 0), 0);
        setTotalUnread(total);
      } catch {}
    };
    fetchUnread();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.email) return;
    const handler = ({ sender }) => {
      if (sender === currentUser.email) return;
      setTotalUnread(prev => prev + 1);
    };
    socket.on('unreadUpdate', handler);
    return () => socket.off('unreadUpdate', handler);
  }, [currentUser?.email]);

  useEffect(() => {
    if (location.pathname === '/messages') {
      setTotalUnread(0);
    }
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route
          path='/'
          element={<Navigate to={currentUser ? '/home' : '/landing'} replace />}
        />
        <Route
          path='/landing'
          element={currentUser ? <Navigate to='/home' replace /> : <LandingPage onLogin={authApi.login} />}
        />
        <Route
          path='/home'
          element={currentUser ? <HomePage currentUser={currentUser} onLogout={authApi.logout} /> : <Navigate to='/landing' replace />}
        />
        <Route
          path='/friends'
          element={currentUser ? <FriendsPage currentUser={currentUser} /> : <Navigate to='/status/401' replace />}
        />
        <Route
          path='/messages'
          element={currentUser ? <MessagesPage currentUser={currentUser} /> : <Navigate to='/status/401' replace />}
        />
        <Route
          path='/chat'
          element={currentUser ? <ChatPage currentUser={currentUser} /> : <Navigate to='/status/401' replace />}
        />
        <Route
          path='/profile'
          element={currentUser ? <ProfilePage currentUser={currentUser} onUserUpdate={authApi.updateUser} /> : <Navigate to='/status/401' replace />}
        />
        <Route
          path='/user/:googleId'
          element={currentUser ? <UserProfile currentUser={currentUser} /> : <Navigate to='/status/401' replace />}
        />
        <Route
          path='/status/:code'
          element={<StatusPage currentUser={currentUser} />}
        />
        <Route
          path='*'
          element={<Navigate to='/status/404' replace />}
        />
      </Routes>
      {showNav && <BottomNav totalUnread={totalUnread}/>}
    </>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(readStoredUser);

  const authApi = useMemo(
    () => ({
      login: (user) => {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        setCurrentUser(user);
      },
      logout: () => {
        localStorage.removeItem(USER_STORAGE_KEY);
        setCurrentUser(null);
      },
      updateUser: (updatedUser) => {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      },
    }),
    []
  );

  return (
    <BrowserRouter>
        <AppRoutes currentUser={currentUser} authApi={authApi} />
    </BrowserRouter>
  );
}

export default App;