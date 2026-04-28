'use client';
import { Home, Users, BookOpen, UserCheck, Folder, Bell, DollarSign } from 'lucide-react';

export default function Navbar({ role, activeModule, setActiveModule }) {
  // Define available modules based on role
  const getNavItems = () => {
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: Home }
    ];

    switch (role) {
      case 'superadmin':
        items.push({ id: 'admins', label: 'Admins', icon: Users });
        break;
      case 'admin':
        items.push({ id: 'users', label: 'Users', icon: Users });
        break;
      case 'teacher':
        items.push(
          { id: 'homework', label: 'Homework', icon: BookOpen },
          { id: 'attendance', label: 'Attendance', icon: UserCheck },
          { id: 'material', label: 'Materials', icon: Folder }
        );
        break;
      case 'student':
        items.push(
          { id: 'homework', label: 'Homework', icon: BookOpen },
          { id: 'attendance', label: 'Attendance', icon: UserCheck },
          { id: 'material', label: 'Materials', icon: Folder }
        );
        break;
      case 'parents':
        items.push(
          { id: 'homework', label: 'Homework', icon: BookOpen },
          { id: 'attendance', label: 'Attendance', icon: UserCheck },
          { id: 'fees', label: 'Fees', icon: DollarSign },
          { id: 'notifications', label: 'Notices', icon: Bell }
        );
        break;
      case 'staff':
        items.push(
          { id: 'fees', label: 'Fees', icon: DollarSign },
          { id: 'notifications', label: 'Notices', icon: Bell }
        );
        break;
      default:
        break;
    }
    return items;
  };

  const navItems = getNavItems();

  return (
    <nav className="sticky top-[80px] z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-xl mt-1">
      <div className="max-w-7xl mx-auto px-6">
        <ul className="flex items-center gap-1.5 overflow-x-auto py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveModule(item.id)}
                  className={`group relative flex items-center gap-2.5 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 whitespace-nowrap shadow-lg hover:shadow-2xl active:scale-95 active:shadow-lg
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/25 border-2 border-blue-400/50 ring-2 ring-blue-500/30' 
                      : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border border-slate-200/50 hover:border-blue-300 hover:from-blue-50 hover:to-slate-50 hover:text-blue-800 hover:shadow-blue-100/50'
                    }`}
                >
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white drop-shadow-lg' : 'text-slate-500 group-hover:text-blue-600 drop-shadow-sm'}`} />
                  <span className="tracking-wide">{item.label}</span>
                  {isActive && (
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-500 blur opacity-30 animate-ping rounded-3xl -z-10" />
                  )}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/70 to-transparent transition-all duration-300 ${isActive ? 'opacity-0' : 'group-hover:opacity-100'}`} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
