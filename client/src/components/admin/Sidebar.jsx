import React from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaUsers, 
  FaVoteYea, 
  FaUserTie, 
  FaUserGraduate,
  FaCog 
} from 'react-icons/fa';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  const menuItems = [
    { icon: FaHome, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: FaUsers, label: 'Manage Students', path: '/admin/students' },
    { icon: FaVoteYea, label: 'Manage Elections', path: '/admin/elections' },
    { icon: FaUserTie, label: 'Manage Positions', path: '/admin/positions' },
    { icon: FaUserGraduate, label: 'Manage Candidates', path: '/admin/candidates' },
    { icon: FaCog, label: 'Settings', path: '/admin/settings' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className={`
      fixed top-16 left-0 z-40 h-screen w-64 bg-blue-800 transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      <nav className="h-full px-3 py-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              <Link
                to={item.path}
                className={`
                  flex items-center p-3 rounded-lg text-sm
                  ${isActive(item.path)
                    ? 'bg-blue-700 text-white'
                    : 'text-gray-100 hover:bg-blue-700 hover:text-white'}
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive(item.path) ? 'text-white' : 'text-gray-300'}`} />
                <span className="ml-3">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
};

export default Sidebar;