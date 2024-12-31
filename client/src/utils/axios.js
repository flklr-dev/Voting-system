import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor
instance.interceptors.request.use(
  (config) => {
    const userType = localStorage.getItem('userType');
    let token;
    
    if (userType === 'student') {
      token = localStorage.getItem('studentToken');
    } else if (userType === 'admin') {
      token = localStorage.getItem('adminToken');
    }

    if (token) {
      // Remove 'Bearer ' if it's already included in the token
      const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      config.headers['Authorization'] = tokenValue;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear only relevant tokens based on user type
      const userType = localStorage.getItem('userType');
      if (userType === 'student') {
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentId');
        window.location.href = '/login';
      } else if (userType === 'admin') {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminId');
        window.location.href = '/admin/login';
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default instance;