import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import DorsuLogo from '../../assets/dorsu-logo.png';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../utils/axios';
import { FaEnvelope, FaLock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({ success: false, message: '' });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      try {
        const response = await axios.post('/api/auth/admin/login', values);
        
        if (response.data.success) {
          localStorage.setItem('adminToken', response.data.token);
          localStorage.setItem('adminId', response.data.adminId);
          localStorage.setItem('userType', 'admin');
          localStorage.setItem('adminName', response.data.admin.name);
          
          setModalContent({
            success: true,
            message: 'Login successful! Redirecting to dashboard...'
          });
          setShowModal(true);

          setTimeout(() => {
            navigate('/admin/dashboard', { replace: true });
          }, 1500);
        }
      } catch (error) {
        console.error('Login error:', error);
        setModalContent({
          success: false,
          message: error.response?.data?.message || 'Login failed. Please try again.'
        });
        setShowModal(true);

        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminId');
        localStorage.removeItem('userType');
        localStorage.removeItem('adminName');
      }
    },
  });

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const userType = localStorage.getItem('userType');
    
    if (adminToken && userType === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-blue-600 text-white h-16 fixed w-full top-0 left-0 z-50 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center space-x-3 mx-auto">
          <img src={DorsuLogo} alt="DOrSU Logo" className="h-12 w-12" />
          <h1 className="text-xl font-semibold">Admin Portal - Online Voting System</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 pb-12 px-4 flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Admin Login</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to manage the voting system</p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-4 w-4 text-blue-500" />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Admin email address"
                  {...formik.getFieldProps('email')}
                  className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="mt-1 text-xs text-red-500">{formik.errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-4 w-4 text-blue-500" />
                </div>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  {...formik.getFieldProps('password')}
                  className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-xs text-red-500">{formik.errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={formik.isSubmitting}
              className={`w-full bg-blue-600 text-white p-2.5 rounded-lg font-medium 
                ${formik.isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                transition-colors text-sm shadow-sm mt-6`}
            >
              {formik.isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Back to Home Link */}
            <p className="text-center text-gray-500 text-sm">
              Not an admin?{' '}
              <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">
                Back to Home
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="text-center">
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full 
                ${modalContent.success ? 'bg-green-100' : 'bg-red-100'} mb-4`}>
                {modalContent.success ? (
                  <FaCheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <FaTimesCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <h3 className={`text-lg font-medium 
                ${modalContent.success ? 'text-green-900' : 'text-red-900'} mb-2`}>
                {modalContent.success ? 'Success!' : 'Error'}
              </h3>
              <p className="text-gray-500 text-sm">{modalContent.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;
