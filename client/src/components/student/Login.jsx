import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import DorsuLogo from '../../assets/dorsu-logo.png';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../utils/axios';
import { FaEnvelope, FaLock, FaCheckCircle } from 'react-icons/fa';

const Login = () => {
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        console.log('Attempting login...');
        const response = await axios.post('/api/auth/student/login', values);
        console.log('Login response:', response.data);
        
        if (response.data.success) {
          // Store initial auth data
          localStorage.setItem('studentToken', response.data.token);
          localStorage.setItem('studentId', response.data.studentId);
          localStorage.setItem('userType', 'student');
          
          setShowSuccessModal(true);
          
          // Navigate to face verification instead of dashboard
          setTimeout(() => {
            setShowSuccessModal(false);
            navigate('/face-verification', {
              state: {
                token: response.data.token,
                studentId: response.data.studentId,
                redirectTo: '/student/dashboard'
              },
              replace: true
            });
          }, 1500);
        }
      } catch (error) {
        console.error('Login error:', error);
        setLoginError(error.response?.data?.message || 'An error occurred during login');
        
        // Clear any existing auth data on error
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentId');
        localStorage.removeItem('userType');
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-blue-600 text-white h-16 fixed w-full top-0 left-0 z-50 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center space-x-3 mx-auto">
          <img src={DorsuLogo} alt="DOrSU Logo" className="h-12 w-12" />
          <h1 className="text-xl font-semibold">Online Voting System</h1>
        </div>
      </header>

      {/* Updated Main Content */}
      <div className="pt-24 pb-12 px-4 flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {loginError}
              </div>
            )}

            {/* Email Field - Updated styling */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-4 w-4 text-blue-500" />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  {...formik.getFieldProps('email')}
                  className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="mt-1 text-xs text-red-500">{formik.errors.email}</p>
              )}
            </div>

            {/* Password Field - Updated styling */}
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

            {/* Submit Button - Updated styling */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2.5 rounded-lg font-medium hover:bg-blue-700 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                transition-colors text-sm shadow-sm"
            >
              Sign In
            </button>

            {/* Register Link - Updated styling */}
            <p className="text-center text-gray-500 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Success Modal - Updated styling */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <FaCheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Login Successful!</h3>
              <p className="text-gray-500 text-sm">Proceeding to face verification...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
