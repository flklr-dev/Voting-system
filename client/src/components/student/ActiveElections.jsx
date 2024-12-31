import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaVoteYea, FaClock, FaCalendarAlt, FaUsers, FaInfoCircle } from 'react-icons/fa';
import axios from '../../utils/axios';
import Sidebar from './Sidebar';
import Header from './Header';
import DorsuLogo from '../../assets/dorsu-logo.png';

const ActiveElections = () => {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const studentToken = localStorage.getItem('studentToken');
      const userType = localStorage.getItem('userType');

      if (!studentToken || userType !== 'student') {
        navigate('/student/login');
        return;
      }

      fetchActiveElections();
    };

    checkAuth();
  }, [navigate]);

  const fetchActiveElections = async () => {
    try {
      const response = await axios.get('/api/student/active-elections');
      
      if (response.data.success) {
        setElections(response.data.elections);
      } else {
        setError('Failed to fetch active elections');
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching elections:', error);
      setError(error.response?.data?.message || 'Failed to fetch active elections');
      setLoading(false);

      if (error.response?.status === 401) {
        navigate('/student/login');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (endDate) => {
    const total = Date.parse(endDate) - Date.parse(new Date());
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const minutes = Math.floor((total / 1000 / 60) % 60);

    return {
      total,
      days,
      hours,
      minutes
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} />

      {/* Main Content */}
      <main className="pt-20 pb-8 lg:ml-64 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Title and Description */}
          <div className="mt-4 mb-6 border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Active Elections</h2>
            <p className="text-gray-600 text-base">View and participate in ongoing elections</p>
          </div>

          {/* Loading, Error, and Elections content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              <span className="block sm:inline">{error}</span>
            </div>
          ) : elections.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <FaVoteYea className="mx-auto text-gray-400 text-5xl mb-4" />
              <h3 className="text-xl font-medium text-gray-700">No Active Elections</h3>
              <p className="text-gray-500 mt-2">There are currently no ongoing elections.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {elections.map((election) => {
                const timeRemaining = getTimeRemaining(election.end_date);
                return (
                  <div key={election._id} className="bg-white rounded-lg shadow-sm overflow-hidden transform transition-transform hover:scale-102 hover:shadow-md">
                    {/* Election Header */}
                    <div className="bg-blue-600 text-white p-4">
                      <h3 className="text-lg font-semibold truncate">{election.election_name}</h3>
                      <p className="text-sm text-blue-100">{election.election_type} Election</p>
                    </div>

                    {/* Election Body */}
                    <div className="p-4 space-y-4">
                      <div className="text-sm text-gray-600">
                        <FaInfoCircle className="inline-block mr-2" />
                        {election.description}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <FaUsers className="mr-2" />
                        <span>Restriction: {election.restriction}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FaCalendarAlt className="mr-2" />
                          <span>Starts: {formatDate(election.start_date)}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FaClock className="mr-2" />
                          <span>Ends: {formatDate(election.end_date)}</span>
                        </div>
                      </div>

                      {/* Time Remaining */}
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">Time Remaining:</p>
                        <div className="flex justify-around mt-2">
                          <div className="text-center">
                            <span className="block text-lg font-bold text-blue-600">{timeRemaining.days}</span>
                            <span className="text-xs text-blue-500">Days</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-lg font-bold text-blue-600">{timeRemaining.hours}</span>
                            <span className="text-xs text-blue-500">Hours</span>
                          </div>
                          <div className="text-center">
                            <span className="block text-lg font-bold text-blue-600">{timeRemaining.minutes}</span>
                            <span className="text-xs text-blue-500">Minutes</span>
                          </div>
                        </div>
                      </div>

                      {/* Vote Button */}
                      <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                        <FaVoteYea className="mr-2" />
                        Cast Your Vote
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ActiveElections; 