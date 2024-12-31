import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import DorsuLogo from '../../assets/dorsu-logo.png';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../utils/axios';
import { FaUser, FaEnvelope, FaLock, FaCheckCircle } from 'react-icons/fa';

const AdminRegister = () => {
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [adminName, setAdminName] = useState('');

  const formik = useFormik({
    initialValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      firstName: Yup.string()
        .required('First name is required'),
      lastName: Yup.string()
        .required('Last name is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm password is required'),
    }),
    onSubmit: async (values) => {
      try {
        const response = await axios.post('/api/admin/register', {
          firstName: values.firstName,
          middleName: values.middleName,
          lastName: values.lastName,
          email: values.email,
          password: values.password
        });
        
        if (response.data.success) {
          setAdminName(values.firstName);
          setShowSuccessModal(true);
          setTimeout(() => {
            navigate('/admin/login');
          }, 2000);
        }
      } catch (error) {
        console.error('Registration error:', error.response?.data?.message || error.message);
        alert(error.response?.data?.message || 'Registration failed. Please try again.');
      }
    },
  });

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
        <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Admin Registration</h2>
            <p className="text-gray-500 text-sm mt-1">Create your administrator account</p>
          </div>

          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name Fields */}
              {['firstName', 'middleName', 'lastName'].map((field) => (
                <div key={field}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaUser className="h-4 w-4 text-blue-500" />
                    </div>
                    <input
                      type="text"
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1).replace('Name', ' Name')}
                      {...formik.getFieldProps(field)}
                      className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  {formik.touched[field] && formik.errors[field] && (
                    <p className="mt-1 text-xs text-red-500">{formik.errors[field]}</p>
                  )}
                </div>
              ))}

              {/* Email */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="h-4 w-4 text-blue-500" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email address"
                    {...formik.getFieldProps('email')}
                    className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                {formik.touched.email && formik.errors.email && (
                  <p className="mt-1 text-xs text-red-500">{formik.errors.email}</p>
                )}
              </div>

              {/* Password Fields */}
              {['password', 'confirmPassword'].map((field) => (
                <div key={field}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaLock className="h-4 w-4 text-blue-500" />
                    </div>
                    <input
                      type="password"
                      placeholder={field === 'password' ? 'Password' : 'Confirm Password'}
                      {...formik.getFieldProps(field)}
                      className="pl-10 w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  {formik.touched[field] && formik.errors[field] && (
                    <p className="mt-1 text-xs text-red-500">{formik.errors[field]}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2.5 rounded-lg font-medium hover:bg-blue-700 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                transition-colors text-sm shadow-sm mt-6"
            >
              Create Admin Account
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-500 text-sm">
              Already have an admin account?{' '}
              <Link to="/admin/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <FaCheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Registration Successful!</h3>
              <p className="text-gray-500 text-sm">Welcome, {adminName}! Redirecting to login page...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRegister;
