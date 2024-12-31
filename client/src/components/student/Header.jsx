import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FaBars } from 'react-icons/fa';
import DorsuLogo from '../../assets/dorsu-logo.png';
import axios from '../../utils/axios';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [firstInitial, setFirstInitial] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      try {
        // Update this to use studentToken instead of token
        const studentToken = localStorage.getItem('studentToken');
        if (!studentToken) {
          navigate('/student/login');
          return;
        }

        // Update the endpoint and remove /api prefix since it's in axios config
        const response = await axios.get('/api/auth/student/profile');

        if (response.data.success) {
          const { firstName, lastName } = response.data.student;
          setStudentName(`${firstName} ${lastName}`);
          setFirstInitial(firstName.charAt(0).toUpperCase());
        }
      } catch (error) {
        console.error('Error fetching student profile:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('studentToken');
          localStorage.removeItem('studentId');
          localStorage.removeItem('userType');
          navigate('/student/login');
        }
      }
    };

    fetchStudentProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentId');
    localStorage.removeItem('userType');
    navigate('/student/login');
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
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          className="flex items-center space-x-2 focus:outline-none group"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center 
            border-2 border-blue-300 shadow-md cursor-pointer 
            hover:bg-blue-50 transition-colors duration-200">
            <span className="text-lg font-bold text-blue-600">
              {firstInitial}
            </span>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 
            transform transition-all duration-200 ease-out">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{studentName}</p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 
                transition-colors duration-200"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 
                transition-colors duration-200"
            >
              Log out
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