import { NavLink } from 'react-router-dom';
import { Home, Users, MessageCircle, User } from 'lucide-react';

const BottomNav = () => {
  const navItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <Icon className="w-6 h-6 mb-1" strokeWidth={1.5} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;