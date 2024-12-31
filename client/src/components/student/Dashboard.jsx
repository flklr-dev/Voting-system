import React, { useState, useEffect } from 'react';
import { FaVoteYea, FaChartBar, FaCalendarAlt, FaClock } from 'react-icons/fa';
import DorsuLogo from '../../assets/dorsu-logo.png';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import Header from './Header';
import Sidebar from './Sidebar';
import axios from '../../utils/axios';
import { useNavigate } from 'react-router-dom';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    activeElections: 2,
    completedVotes: 3,
    nextElection: 'Student Council Election 2024',
    timeRemaining: '2 days 5 hours',
    upcomingElections: [
      {
        election_name: 'Student Council Election 2024',
        start_date: '2024-03-15',
        status: 'Upcoming'
      },
      {
        election_name: 'Department Representatives',
        start_date: '2024-03-20',
        status: 'Upcoming'
      },
      {
        election_name: 'Campus Organization Leaders',
        start_date: '2024-03-25',
        status: 'Upcoming'
      }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Voter turnout trend data (last 6 months)
  const voterTurnoutData = {
    labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    datasets: [{
      label: 'Voter Turnout %',
      data: [75, 82, 78, 85, 90, 88],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  // Election participation data
  const participationData = {
    labels: ['Participated', 'Active', 'Upcoming'],
    datasets: [{
      data: [3, 2, 3],
      backgroundColor: [
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)',
        'rgb(234, 179, 8)'
      ],
      borderWidth: 1
    }]
  };

  useEffect(() => {
    const studentToken = localStorage.getItem('studentToken');
    const userType = localStorage.getItem('userType');
    const faceVerified = localStorage.getItem('faceVerified');

    if (!studentToken || userType !== 'student' || !faceVerified) {
      localStorage.clear();
      navigate('/login');
      return;
    }

    // Simulate API call with dummy data
    setLoading(false);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} />
      
      {/* Main Content */}
      <main className="pt-20 px-6 pb-8 lg:ml-64">
        {/* Page Title and Description */}
        <div className="mt-4 mb-6 border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h2>
          <p className="text-gray-600 text-base">Overview of your election activities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <FaVoteYea className="text-blue-500 text-3xl" />
              <div>
                <p className="text-gray-500 text-sm">Active Elections</p>
                <h3 className="text-2xl font-bold text-gray-800">{dashboardData.activeElections}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <FaChartBar className="text-green-500 text-3xl" />
              <div>
                <p className="text-gray-500 text-sm">Completed Votes</p>
                <h3 className="text-2xl font-bold text-gray-800">{dashboardData.completedVotes}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <FaCalendarAlt className="text-yellow-500 text-3xl" />
              <div>
                <p className="text-gray-500 text-sm">Next Election</p>
                <h3 className="text-lg font-bold text-gray-800">{dashboardData.nextElection}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center space-x-3">
              <FaClock className="text-red-500 text-3xl" />
              <div>
                <p className="text-gray-500 text-sm">Time Remaining</p>
                <h3 className="text-lg font-bold text-gray-800">{dashboardData.timeRemaining}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voter Turnout Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Voter Turnout Trend</h3>
            <Line data={voterTurnoutData} options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: value => value + '%'
                  }
                }
              }
            }} />
          </div>

          {/* Election Participation Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Election Participation</h3>
            <div className="h-[300px] flex items-center justify-center">
              <Doughnut data={participationData} options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Upcoming Elections Table */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Elections</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Election Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dashboardData.upcomingElections.map((election, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">{election.election_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{election.start_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {election.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 