import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Header from './Header';
import Sidebar from './Sidebar';
import { FaUsers, FaVoteYea, FaUserTie, FaCheckCircle } from 'react-icons/fa';
import axios from '../../utils/axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Updated useEffect with proper API endpoint and error handling
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axios.get('/api/admin/dashboard');
        if (response.data.success) {
          setDashboardData(response.data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Dashboard error:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminId');
          localStorage.removeItem('userType');
          localStorage.removeItem('adminName');
          navigate('/admin/login');
        }
        setLoading(false);
      }
    };

    const checkAuth = async () => {
      const adminToken = localStorage.getItem('adminToken');
      const userType = localStorage.getItem('userType');

      if (!adminToken || userType !== 'admin') {
        navigate('/admin/login');
        return;
      }

      fetchDashboardData();
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Updated stats with votes cast and changed total positions to total candidates
  const stats = [
    { 
      icon: FaUsers, 
      label: 'Total Students', 
      value: dashboardData?.totalStudents || '0' 
    },
    { 
      icon: FaVoteYea, 
      label: 'Ongoing Elections', 
      value: dashboardData?.ongoingElections || '0' 
    },
    { 
      icon: FaUserTie, 
      label: 'Total Candidates', 
      value: dashboardData?.totalCandidates || '0' 
    },
    { 
      icon: FaCheckCircle, 
      label: 'Votes Cast', 
      value: dashboardData?.totalVotesCast || '0' 
    }
  ];

  // Dummy data for charts
  const barChartData = [
    { name: 'President', votes: 450 },
    { name: 'Vice President', votes: 380 },
    { name: 'Secretary', votes: 300 },
    { name: 'Treasurer', votes: 280 },
  ];

  const pieChartData = [
    { name: 'Voted', value: 856 },
    { name: 'Not Voted', value: 378 },
  ];

  const COLORS = ['#2563eb', '#fbbf24'];

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        username="Admin User" 
      />
      <Sidebar isOpen={sidebarOpen} />
      
      <main className="pt-16 lg:ml-64">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Dashboard Overview</h2>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <stat.icon size={24} />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-gray-500 text-sm">{stat.label}</h3>
                    <p className="text-2xl font-semibold">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Votes by Position</h3>
              <div className="w-full overflow-x-auto">
                <BarChart width={500} height={300} data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="votes" fill="#2563eb" />
                </BarChart>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Voter Turnout</h3>
              <div className="w-full flex justify-center">
                <PieChart width={400} height={300}>
                  <Pie
                    data={pieChartData}
                    cx={200}
                    cy={150}
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
            </div>
          </div>

          {/* New Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
              <div className="space-y-4">
                {[
                  { action: 'New election created', time: '2 hours ago' },
                  { action: 'Student list updated', time: '4 hours ago' },
                  { action: 'New admin added', time: '1 day ago' },
                  { action: 'Election results published', time: '2 days ago' },
                ].map((activity, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-2">
                    <span>{activity.action}</span>
                    <span className="text-sm text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Election Status Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Election Status Summary</h3>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-800 mb-2">Current Election</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-700">Student Council 2024</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">In Progress</span>
                    </div>
                    <div className="text-sm text-yellow-600">
                      Ends in: 6 hours 30 minutes
                    </div>
                    <div className="text-sm text-yellow-600">
                      Voter Turnout: 65%
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Next Election</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Department Representatives</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Scheduled</span>
                    </div>
                    <div className="text-sm text-blue-600">
                      Starts in: 5 days
                    </div>
                    <div className="text-sm text-blue-600">
                      Registered Candidates: 12
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Last Completed</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Class Officers</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">Completed</span>
                    </div>
                    <div className="text-sm text-green-600">
                      Total Votes: 789
                    </div>
                    <div className="text-sm text-green-600">
                      Final Turnout: 82%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Elections */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Upcoming Elections</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left">Election Name</th>
                    <th className="px-6 py-3 text-left">Start Date</th>
                    <th className="px-6 py-3 text-left">End Date</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-6 py-4">Student Council 2024</td>
                    <td className="px-6 py-4">Mar 15, 2024</td>
                    <td className="px-6 py-4">Mar 16, 2024</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Pending</span></td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4">Department Representatives</td>
                    <td className="px-6 py-4">Mar 20, 2024</td>
                    <td className="px-6 py-4">Mar 21, 2024</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Scheduled</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

Dashboard.propTypes = {
  toggleSidebar: PropTypes.func
};

export default Dashboard; 