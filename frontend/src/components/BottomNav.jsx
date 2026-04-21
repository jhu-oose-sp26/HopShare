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
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={() => 'flex flex-col items-center justify-center w-full h-full'}
          >
            {({ isActive }) => (
              <div className={`flex flex-col items-center justify-center w-full py-2.5 transition-colors ${
                isActive ? 'bg-gray-400 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}>
                <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-xs font-semibold w-14 text-center">{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;