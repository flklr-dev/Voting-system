import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FaBars, FaUserCircle } from 'react-icons/fa';
import DorsuLogo from '../../assets/dorsu-logo.png';
import axios from '../../utils/axios';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState('Admin');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) {
          navigate('/admin/login');
          return;
        }

        const response = await axios.get('/api/auth/admin/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          const { firstName, lastName } = response.data.admin;
          setAdminName(`${firstName} ${lastName}`);
        }
      } catch (error) {
        console.error('Error fetching admin profile:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminId');
          navigate('/admin/login');
        }
      }
    };

    fetchAdminProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminId');
    navigate('/admin/login');
  };

  return (
    <header className="bg-blue-600 text-white h-16 fixed w-full top-0 left-0 z-50 flex items-center justify-between px-4 shadow-md">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="text-white hover:text-gray-200 lg:hidden"
        >
          <FaBars size={24} />
        </button>
        <img src={DorsuLogo} alt="DOrSU Logo" className="h-12 w-12 ml-4" />
        <h1 className="text-xl font-semibold ml-2">DOrSU Online Voting System</h1>
      </div>

      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 text-white hover:text-gray-200 focus:outline-none"
        >
          <FaUserCircle size={24} />
          <span className="hidden md:block">{adminName}</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

Header.propTypes = {
  toggleSidebar: PropTypes.func.isRequired
};

export default Header;