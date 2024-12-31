import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaSearch, FaPlus, FaTimes } from 'react-icons/fa';
import Header from './Header';
import Sidebar from './Sidebar';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';

const ManageElections = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [selectedElection, setSelectedElection] = useState(null);
  const [faculties] = useState(['FaCET', 'FALS', 'FNAHS', 'FTED', 'FGCE', 'FBM', 'FHuSoCom']);
  const [programs, setPrograms] = useState([]);
  const [editingElection, setEditingElection] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoadingElections, setIsLoadingElections] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Reset form to initial state
  const initialFormState = {
    election_name: '',
    description: '',
    election_type: 'General',
    restriction: 'None',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Reset form and close modals
  const handleCloseModal = () => {
    setFormData(initialFormState);
    setShowModal(false);
  };

  const handleCloseEditModal = () => {
    setFormData(initialFormState);
    setShowEditModal(false);
    setEditingElection(null);
  };

  // Shared modal styles
  const modalStyle = {
    overlay: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50",
    content: "bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto",
    header: "bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6",
    title: "text-2xl font-bold text-white flex items-center",
    form: "p-8 space-y-6",
    section: "space-y-4",
    sectionTitle: "text-lg font-semibold text-gray-800 border-b pb-2",
    inputGroup: "space-y-2",
    label: "block text-sm font-medium text-gray-700",
    input: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200",
    buttonGroup: "flex justify-end space-x-4 mt-8",
    cancelButton: "px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors duration-200",
    submitButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
  };

  // Get today's date in YYYY-MM-DD format and current time in HH:mm format
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const fetchElections = async () => {
    try {
      const response = await axios.get('/api/admin/elections');
      if (response.data.success) {
        setElections(response.data.elections);
      }
    } catch (err) {
      console.error('Error fetching elections:', err);
      setError('Failed to fetch elections');
    } finally {
      setIsLoadingElections(false);
    }
  };

  // Function to check if any election needs immediate update
  const checkElectionEnd = () => {
    const now = new Date();
    let shouldUpdate = false;

    elections.forEach(election => {
      const endDateTime = new Date(`${election.end_date}T${election.end_time}`);
      
      // Check if the election just ended (within the last second)
      if (endDateTime <= now && endDateTime > new Date(lastUpdate)) {
        shouldUpdate = true;
      }
      
      // If election is about to end in the next 5 seconds
      if (endDateTime > now && endDateTime - now <= 5000) {
        // Set timeout for exact moment
        const timeUntilEnd = endDateTime - now;
        setTimeout(() => {
          fetchElections();
        }, timeUntilEnd);
      }
    });

    if (shouldUpdate) {
      fetchElections();
    }
  };

  // Initial fetch and polling setup
  useEffect(() => {
    fetchElections();

    // Check every second for ending elections
    const checkInterval = setInterval(checkElectionEnd, 1000);
    
    // Backup polling every minute
    const pollInterval = setInterval(fetchElections, 60000);

    return () => {
      clearInterval(checkInterval);
      clearInterval(pollInterval);
    };
  }, []);

  // Additional check when elections array changes
  useEffect(() => {
    if (elections.length > 0) {
      checkElectionEnd();
    }
  }, [elections]);

  useEffect(() => {
    fetchPrograms();
  }, [formData.election_type]);

  const getElectionStatus = (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return 'Upcoming';
    } else if (now >= start && now <= end) {
      return 'Ongoing';
    } else {
      return 'Completed';
    }
  };

  const fetchPrograms = async () => {
    if (formData.election_type === 'Program') {
      try {
        setIsLoadingPrograms(true);
        const response = await axios.get('/api/admin/programs');
        setPrograms(response.data.programs);
      } catch (err) {
        console.error('Error fetching programs:', err);
      } finally {
        setIsLoadingPrograms(false);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset restriction when election type changes
      ...(name === 'election_type' && { restriction: value === 'General' ? 'None' : '' })
    }));
  };

  const calculateStatus = (startDate, startTime, endDate, endTime) => {
    if (!startDate || !startTime || !endDate || !endTime) return '';
    
    const now = new Date();
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (now < start) return 'Upcoming';
    if (now >= start && now <= end) return 'Ongoing';
    return 'Completed';
  };

  // Get minimum date (today) for start date
  const getMinStartDate = () => {
    if (editingElection) {
      // If editing and the original start date is in the past, allow it
      const originalStartDate = new Date(editingElection.start_date).toISOString().split('T')[0];
      return originalStartDate;
    }
    return new Date().toISOString().split('T')[0];
  };

  // Get minimum date for end date based on start date
  const getMinEndDate = () => {
    return formData.start_date || new Date().toISOString().split('T')[0];
  };

  // Get minimum time based on selected dates
  const getMinTime = (dateField, timeField) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (editingElection) {
      const originalStartDate = new Date(editingElection.start_date).toISOString().split('T')[0];
      const originalStartTime = new Date(editingElection.start_date).toTimeString().slice(0, 5);
      
      // If it's the original start date, allow the original time
      if (dateField === originalStartDate) {
        return originalStartTime;
      }
    }

    if (dateField === today) {
      return new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
    return '00:00';
  };

  // Handle date changes with validation
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // If start date changes
      if (name === 'start_date') {
        const isOriginalDate = editingElection && 
          value === new Date(editingElection.start_date).toISOString().split('T')[0];

        // Only clear times if it's not the original date and time is in the past
        if (!isOriginalDate && value === getMinStartDate() && 
            prev.start_time < getMinTime(value, 'start_time')) {
          newData.start_time = '';
        }

        // Clear end date and time if start date is after them
        if (newData.end_date && newData.start_date > newData.end_date) {
          newData.end_date = '';
          newData.end_time = '';
        }
      }

      // Update status
      newData.status = calculateStatus(
        newData.start_date,
        newData.start_time,
        newData.end_date,
        newData.end_time
      );

      return newData;
    });
  };

  // Handle time changes with validation
  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };

      // If it's the original date/time combination in edit mode, allow it
      if (editingElection && name === 'start_time') {
        const originalStartDate = new Date(editingElection.start_date).toISOString().split('T')[0];
        const originalStartTime = new Date(editingElection.start_date).toTimeString().slice(0, 5);
        
        if (prev.start_date === originalStartDate && value === originalStartTime) {
          return newData;
        }
      }

      // If start time changes
      if (name === 'start_time') {
        // Clear end time if start time is after it on the same day
        if (prev.start_date === prev.end_date && value > prev.end_time) {
          newData.end_time = '';
        }
      }

      // Update status
      newData.status = calculateStatus(
        newData.start_date,
        newData.start_time,
        newData.end_date,
        newData.end_time
      );

      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if ((formData.election_type === 'Faculty' || formData.election_type === 'Program') 
        && !formData.restriction) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select a restriction for Faculty or Program election types.'
      });
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select both start and end dates.'
      });
      return;
    }

    try {
      const response = await axios.post('/api/admin/elections', {
        election_name: formData.election_name,
        description: formData.description,
        election_type: formData.election_type,
        restriction: formData.election_type === 'General' ? 'None' : formData.restriction,
        start_date: new Date(`${formData.start_date}T${formData.start_time}`),
        end_date: new Date(`${formData.end_date}T${formData.end_time}`)
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Election added successfully!',
          timer: 1500,
          showConfirmButton: false
        });
        setShowModal(false);
        fetchElections();
        resetForm();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err.response?.data?.message || 'Error adding election'
      });
    }
  };

  const handleViewDescription = (election) => {
    setSelectedElection(election);
    setShowDescriptionModal(true);
  };

  // Filter elections based on search term
  const filteredElections = elections.filter(election =>
    Object.values({
      election_id: election.election_id,
      election_name: election.election_name,
      election_type: election.election_type,
    }).some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredElections.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredElections.length / entriesPerPage);

  const handleDelete = async (electionId) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You want to delete this election?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        const response = await axios.delete(`/api/admin/elections/${electionId}`);
        
        if (response.data.success) {
          await Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Election has been deleted.',
            timer: 1500,
            showConfirmButton: false
          });
          fetchElections(); // Refresh the elections list
        } else {
          throw new Error(response.data.message);
        }
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Error deleting election'
      });
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Ongoing':
        return 'bg-yellow-100 text-yellow-800';
      case 'Scheduled':
      case 'Pending':
        return 'bg-blue-100 text-blue-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (election) => {
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);

    setEditingElection(election);
    setFormData({
      election_name: election.election_name,
      description: election.description,
      election_type: election.election_type,
      restriction: election.restriction || 'None',
      status: election.status,
      start_date: startDate.toISOString().split('T')[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_date: endDate.toISOString().split('T')[0],
      end_time: endDate.toTimeString().slice(0, 5),
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.put(`/api/admin/elections/${editingElection._id}`, {
        election_name: formData.election_name,
        description: formData.description,
        election_type: formData.election_type,
        restriction: formData.election_type === 'General' ? 'None' : formData.restriction,
        start_date: new Date(`${formData.start_date}T${formData.start_time}`),
        end_date: new Date(`${formData.end_date}T${formData.end_time}`)
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Election updated successfully!',
          timer: 1500,
          showConfirmButton: false
        });
        setShowEditModal(false);
        fetchElections();
        resetForm();
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err.response?.data?.message || 'Error updating election'
      });
    }
  };

  const renderActions = (election) => (
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
      <div className="flex space-x-2">
        <button
          onClick={() => handleEdit(election)}
          className="text-blue-600 hover:text-blue-900"
        >
          <FaEdit size={18} />
        </button>
        <button
          onClick={() => handleDelete(election._id)}
          className="text-red-600 hover:text-red-900"
        >
          <FaTrash size={18} />
        </button>
      </div>
    </td>
  );

  // Add Election Modal
  const renderAddModal = () => (
    showModal && (
      <div className={modalStyle.overlay}>
        <div className={modalStyle.content}>
          <div className={modalStyle.header}>
            <h2 className={modalStyle.title}>
              <FaPlus className="mr-3" />
              Create New Election
            </h2>
          </div>

          <form onSubmit={handleSubmit} className={modalStyle.form}>
            {/* Basic Information */}
            <div className={modalStyle.section}>
              <h3 className={modalStyle.sectionTitle}>Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={modalStyle.inputGroup}>
                  <label className={modalStyle.label}>Election Name *</label>
                  <input
                    type="text"
                    name="election_name"
                    value={formData.election_name}
                    onChange={handleInputChange}
                    className={modalStyle.input}
                    required
                  />
                </div>
                <div className={modalStyle.inputGroup}>
                  <label className={modalStyle.label}>Election Type *</label>
                  <select
                    name="election_type"
                    value={formData.election_type}
                    onChange={handleInputChange}
                    className={modalStyle.input}
                    required
                  >
                    <option value="General">General</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Program">Program</option>
                  </select>
                </div>
              </div>
              <div className={modalStyle.inputGroup}>
                <label className={modalStyle.label}>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  className={modalStyle.input}
                  required
                />
              </div>
            </div>

            {/* Restriction */}
            <div className={modalStyle.section}>
              <h3 className={modalStyle.sectionTitle}>Restriction</h3>
              <div className={modalStyle.inputGroup}>
                <label className={modalStyle.label}>Restriction *</label>
                <select
                  name="restriction"
                  value={formData.restriction}
                  onChange={handleInputChange}
                  className={modalStyle.input}
                  disabled={formData.election_type === 'General'}
                  required
                >
                  {getRestrictionOptions(formData.election_type).map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Schedule */}
            <div className={modalStyle.section}>
              <h3 className={modalStyle.sectionTitle}>Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className={modalStyle.inputGroup}>
                    <label className={modalStyle.label}>Start Date *</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleDateChange}
                      min={getMinStartDate()}
                      className={modalStyle.input}
                      required
                    />
                  </div>
                  <div className={modalStyle.inputGroup}>
                    <label className={modalStyle.label}>Start Time *</label>
                    <input
                      type="time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleTimeChange}
                      min={getMinTime(formData.start_date, 'start_time')}
                      className={modalStyle.input}
                      required
                    />
                  </div>
                </div>
                <div>
                  <div className={modalStyle.inputGroup}>
                    <label className={modalStyle.label}>End Date *</label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleDateChange}
                      min={getMinEndDate()}
                      className={modalStyle.input}
                      required
                      disabled={!formData.start_date || !formData.start_time}
                    />
                  </div>
                  <div className={modalStyle.inputGroup}>
                    <label className={modalStyle.label}>End Time *</label>
                    <input
                      type="time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleTimeChange}
                      min={formData.end_date === formData.start_date ? formData.start_time : undefined}
                      className={modalStyle.input}
                      required
                      disabled={!formData.end_date}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={modalStyle.buttonGroup}>
              <button
                type="button"
                onClick={handleCloseModal}
                className={modalStyle.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalStyle.submitButton}
              >
                Create Election
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  // Edit Election Modal (similar structure but with edit-specific handlers)
  const renderEditModal = () => (
    showEditModal && (
      <div className={modalStyle.overlay}>
        <div className={modalStyle.content}>
          <div className={modalStyle.header}>
            <h2 className={modalStyle.title}>
              <FaEdit className="mr-3" />
              Edit Election
            </h2>
          </div>

          <form onSubmit={handleUpdate} className={modalStyle.form}>
            <div className={modalStyle.buttonGroup}>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className={modalStyle.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalStyle.submitButton}
              >
                Update Election
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );

  // Add search functionality
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Add entries per page functionality
  const handleEntriesPerPageChange = (e) => {
    setEntriesPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing entries per page
  };

  // Add restriction handling
  const getRestrictionOptions = (electionType) => {
    switch (electionType) {
      case 'Faculty':
        return ['FaCET', 'FALS', 'FBM', 'FTED', 'FGCE', 'FNAHS'];
      case 'Program':
        return ['BSIT', 'BSCE', 'BSITM', 'BSM', 'BSBIO', 'BSES', 'BSBA', 'BSA'];
      case 'General':
        return ['None'];
      default:
        return [];
    }
  };

  // Reset form helper
  const resetForm = () => {
    setFormData({
      election_name: '',
      description: '',
      election_type: 'General',
      restriction: 'None',
      start_date: '',
      start_time: '',
      end_date: '',
      end_time: '',
      status: ''
    });
  };

  // Helper function to format date and time
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Shared modal form structure
  const renderModalForm = (isEdit = false) => {
    const handleSubmitForm = isEdit ? handleUpdate : handleSubmit;
    const modalTitle = isEdit ? "Edit Election" : "Create New Election";
    const submitButtonText = isEdit ? "Update Election" : "Create Election";
    const handleClose = isEdit ? handleCloseEditModal : handleCloseModal;

    return (
      <div className={modalStyle.overlay}>
        <div className={modalStyle.content}>
          <div className={modalStyle.header}>
            <div className="flex justify-between items-center">
              <h2 className={modalStyle.title}>
                {isEdit ? <FaEdit className="mr-3" /> : <FaPlus className="mr-3" />}
                {modalTitle}
              </h2>
              <button onClick={handleClose} className="text-white hover:text-gray-200">
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitForm} className="p-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={modalStyle.label}>Election Name *</label>
                  <input
                    type="text"
                    name="election_name"
                    value={formData.election_name || ''}
                    onChange={handleInputChange}
                    className={modalStyle.input}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className={modalStyle.label}>Election Type *</label>
                  <select
                    name="election_type"
                    value={formData.election_type || 'General'}
                    onChange={handleInputChange}
                    className={modalStyle.input}
                    required
                  >
                    <option value="General">General</option>
                    <option value="Faculty">Faculty</option>
                    <option value="Program">Program</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={modalStyle.label}>Restriction</label>
                  {renderRestrictionSelect()}
                </div>
                <div className="flex-1">
                  <label className={modalStyle.label}>Status</label>
                  <div className={`${modalStyle.input} bg-gray-100 flex items-center`}>
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${getStatusBadgeStyle(formData.status)}`}>
                      {formData.status || 'Set dates and times'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={modalStyle.label}>Start Date *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleDateChange}
                    min={getMinStartDate()}
                    className={modalStyle.input}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className={modalStyle.label}>Start Time *</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time || ''}
                    onChange={handleTimeChange}
                    min={getMinTime(formData.start_date, 'start_time')}
                    className={modalStyle.input}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className={modalStyle.label}>End Date *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date || ''}
                    onChange={handleDateChange}
                    min={getMinEndDate()}
                    className={modalStyle.input}
                    required
                    disabled={!formData.start_date || !formData.start_time}
                  />
                </div>
                <div className="flex-1">
                  <label className={modalStyle.label}>End Time *</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time || ''}
                    onChange={handleTimeChange}
                    min={formData.end_date === formData.start_date ? formData.start_time : undefined}
                    className={modalStyle.input}
                    required
                    disabled={!formData.end_date}
                  />
                </div>
              </div>

              <div>
                <label className={modalStyle.label}>Description *</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows="3"
                  className={modalStyle.input}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className={modalStyle.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={modalStyle.submitButton}
              >
                {submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Add toggleSidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderRestrictionSelect = () => {
    if (formData.election_type === 'General') {
      return (
        <select
          name="restriction"
          value="None"
          disabled
          className={modalStyle.input}
        >
          <option value="None">None</option>
        </select>
      );
    }

    if (formData.election_type === 'Faculty') {
      return (
        <select
          name="restriction"
          value={formData.restriction}
          onChange={handleInputChange}
          className={modalStyle.input}
          required
        >
          <option value="">Select Faculty</option>
          {faculties.map(faculty => (
            <option key={faculty} value={faculty}>{faculty}</option>
          ))}
        </select>
      );
    }

    if (formData.election_type === 'Program') {
      return (
        <select
          name="restriction"
          value={formData.restriction}
          onChange={handleInputChange}
          className={modalStyle.input}
          required
          disabled={isLoadingPrograms}
        >
          <option value="">Select Program</option>
          {programs.map(program => (
            <option key={program} value={program}>{program}</option>
          ))}
        </select>
      );
    }
  };

  // Update the table row to show real-time status
  const renderElectionRow = (election, index) => (
    <tr key={election._id}>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        {indexOfFirstEntry + index + 1}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        {election.election_name}
      </td>
      <td className="px-4 py-4 text-sm">
        {election.description}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        {election.election_type}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        {election.restriction}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <div>{formatDateTime(election.start_date).date}</div>
        <div className="text-gray-500">{formatDateTime(election.start_date).time}</div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <div>{formatDateTime(election.end_date).date}</div>
        <div className="text-gray-500">{formatDateTime(election.end_date).time}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
          getStatusBadgeStyle(getElectionStatus(election.start_date, election.end_date))
        }`}>
          {getElectionStatus(election.start_date, election.end_date)}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm">
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(election)}
            className="text-blue-600 hover:text-blue-900"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(election._id)}
            className="text-red-600 hover:text-red-900"
          >
            <FaTrash size={16} />
          </button>
        </div>
      </td>
    </tr>
  );

  if (isLoadingElections && elections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header toggleSidebar={toggleSidebar} />
        <Sidebar isOpen={sidebarOpen} />
        <main className="pt-16 lg:ml-64">
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-xl">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header toggleSidebar={toggleSidebar} />
        <Sidebar isOpen={sidebarOpen} />
        <main className="pt-16 lg:ml-64">
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-xl text-red-600">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      
      <main className="pt-16 lg:ml-64">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Manage Elections</h2>
          
          {/* Controls */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
            >
              <FaPlus className="mr-2" />
              Add Election
            </button>

            <div className="flex items-center">
              <span className="mr-2">Show</span>
              <select
                className="border rounded p-1"
                value={entriesPerPage}
                onChange={handleEntriesPerPageChange}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2">entries</span>
            </div>

            <div className="flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={handleSearch}
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full table-auto">
              <thead className="bg-blue-600">
                <tr>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    No.
                  </th>
                  <th className="w-48 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Name
                  </th>
                  <th className="w-64 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Description
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Type
                  </th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Restriction
                  </th>
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentEntries.map((election, index) => renderElectionRow(election, index))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredElections.length)} of {filteredElections.length} entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Prev
              </button>
              <div className="flex items-center space-x-1">
                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`px-3 py-1 rounded ${
                      currentPage === index + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {renderAddModal()}

      {/* Description Modal */}
      {showDescriptionModal && selectedElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
            <h2 className="text-2xl font-semibold mb-4">{selectedElection.election_name}</h2>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{selectedElection.description}</p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDescriptionModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && renderModalForm(false)}
      {showEditModal && renderModalForm(true)}
    </div>
  );
};

export default ManageElections;
