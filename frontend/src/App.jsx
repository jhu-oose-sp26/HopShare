import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import LandingPage from '@/pages/LandingPage';
import ProfilePage from '@/pages/ProfilePage';
import UserProfile from '@/pages/UserProfile';

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
      <Routes>
        <Route
          path='/landing'
          element={currentUser ? <Navigate to='/' replace /> : <LandingPage onLogin={authApi.login} />}
        />
        <Route
          path='/'
          element={
            currentUser ? (
              <HomePage currentUser={currentUser} onLogout={authApi.logout} />
            ) : (
              <Navigate to='/landing' replace />
            )
          }
        />
        <Route
          path='/profile'
          element={
            currentUser ? (
              <ProfilePage currentUser={currentUser} onUserUpdate={authApi.updateUser} />
            ) : (
              <Navigate to='/landing' replace />
            )
          }
        />
        <Route
          path='/user/:userId'
          element={
            currentUser ? (
              <UserProfile currentUser={currentUser} />
            ) : (
              <Navigate to='/landing' replace />
            )
          }
        />
        <Route
          path='*'
          element={<Navigate to={currentUser ? '/' : '/landing'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
