import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import LandingPage from '@/pages/LandingPage';
import ProfilePage from '@/pages/ProfilePage';
import UserProfile from '@/pages/UserProfile';
import FriendsPage from '@/pages/FriendsPage';
import ChatPage from '@/pages/ChatPage';
import MessagesPage from '@/pages/MessagesPage';
import BottomNav from '@/components/BottomNav';

const USER_STORAGE_KEY = 'hopshare.user';

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
  const showNav = currentUser && location.pathname !== '/landing';

  return (
    <>
      <Routes>
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
          element={currentUser ? <FriendsPage currentUser={currentUser} /> : <Navigate to='/landing' replace />}
        />
        <Route
          path='/messages'
          element={currentUser ? <MessagesPage currentUser={currentUser} /> : <Navigate to='/landing' replace />}
        />
        <Route
          path='/chat'
          element={currentUser ? <ChatPage currentUser={currentUser} /> : <Navigate to='/landing' replace />}
        />
        <Route
          path='/profile'
          element={currentUser ? <ProfilePage currentUser={currentUser} onUserUpdate={authApi.updateUser} /> : <Navigate to='/landing' replace />}
        />
        <Route
          path='/user/:googleId'
          element={currentUser ? <UserProfile currentUser={currentUser} /> : <Navigate to='/landing' replace />}
        />
        <Route
          path='*'
          element={<Navigate to={currentUser ? '/home' : '/landing'} replace />}
        />
      </Routes>
      {showNav && <BottomNav />}
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