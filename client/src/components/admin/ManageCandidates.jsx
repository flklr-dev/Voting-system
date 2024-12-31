import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaSearch, FaPlus, FaEye, FaTimes, FaCamera } from 'react-icons/fa';
import Header from './Header';
import Sidebar from './Sidebar';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';
import Select from 'react-select/async';

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
  input: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
  buttonGroup: "flex justify-end space-x-4 mt-8",
  cancelButton: "px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors duration-200",
  submitButton: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
};

const getImageUrl = (profilePicture) => {
  if (!profilePicture) return null;
  return `${import.meta.env.VITE_API_URL}/uploads/candidates/${profilePicture.split('/').pop()}`;
};

const ManageCandidates = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [availableElections, setAvailableElections] = useState([]);
  const [positions, setPositions] = useState([]);
  const [formData, setFormData] = useState({
    election: '',
    student: '',
    position: '',
    campaign_statement: '',
    partylist: ''
  });
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // Fetch functions
  const fetchCandidates = async () => {
    try {
      const response = await axios.get('/api/admin/candidates');
      if (response.data.success) {
        setCandidates(response.data.candidates);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError('Failed to fetch candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableElections = async () => {
    try {
      const response = await axios.get('/api/admin/candidates/available-elections');
      if (response.data.success) {
        setAvailableElections(response.data.elections);
      }
    } catch (err) {
      console.error('Error fetching available elections:', err);
    }
  };

  const fetchPositions = async () => {
    try {
      const response = await axios.get('/api/admin/positions');
      if (response.data.success) {
        setPositions(response.data.positions);
      }
    } catch (err) {
      console.error('Error fetching positions:', err);
    }
  };

  // Load students based on election type
  const handleElectionChange = async (e) => {
    const electionId = e.target.value;
    setFormData({
      ...formData,
      election: electionId,
      student: '',
      studentName: '',
      studentId: ''
    });

    if (electionId) {
      try {
        const response = await axios.get(`/api/admin/candidates/eligible-students/${electionId}`);
        if (response.data.success) {
          const students = response.data.students.map(student => ({
            value: student._id,
            label: `${student.firstName} ${student.lastName}`,
            studentId: student.studentId
          }));
          setEligibleStudents(students);
        }
      } catch (error) {
        console.error('Error loading eligible students:', error);
        setEligibleStudents([]);
      }
    } else {
      setEligibleStudents([]);
    }
  };

  const loadStudentOptions = async (inputValue) => {
    if (!formData.election) return [];
    
    if (!inputValue) {
      return eligibleStudents; // Return all eligible students when no search input
    }

    // Filter existing eligible students based on search
    return eligibleStudents.filter(student =>
      student.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      student.studentId.toLowerCase().includes(inputValue.toLowerCase())
    );
  };

  useEffect(() => {
    fetchCandidates();
    fetchAvailableElections();
    fetchPositions();
  }, []);

  useEffect(() => {
    console.log('Candidates data:', candidates);
    candidates.forEach(candidate => {
      console.log('Profile picture path:', candidate.profile_picture);
      console.log('Constructed URL:', getImageUrl(candidate.profile_picture));
    });
  }, [candidates]);

  // Filter candidates based on search term
  const filteredCandidates = candidates.filter(candidate =>
    Object.values({
      'Student Name': `${candidate.student.firstName} ${candidate.student.lastName}`,
      'Student ID': candidate.student.studentId,
      'Election': candidate.election.election_name,
      'Position': candidate.position.position_name,
      'Partylist': candidate.partylist
    }).some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredCandidates.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredCandidates.length / entriesPerPage);

  // Render modal form
  const renderModalForm = (isEdit = false) => {
    const modalTitle = isEdit ? 'Edit Candidate' : 'Add Candidate';
    const submitButtonText = isEdit ? 'Update' : 'Add';

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      try {
        const formDataToSend = new FormData();
        
        if (isEdit) {
          formDataToSend.append('election', formData.election);
          formDataToSend.append('student', formData.student);
          formDataToSend.append('position', formData.position);
          formDataToSend.append('campaign_statement', formData.campaign_statement);
          formDataToSend.append('partylist', formData.partylist || '');
          if (formData.profile_picture instanceof File) {
            formDataToSend.append('profile_picture', formData.profile_picture);
          }
          
          const response = await axios.put(
            `/api/admin/candidates/${selectedCandidate._id}`,
            formDataToSend,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          if (response.data.success) {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Candidate updated successfully',
              timer: 1500,
              showConfirmButton: false
            });
            setShowEditModal(false);
            resetFormData();
            fetchCandidates();
          }
        } else {
          // Add candidate
          formDataToSend.append('election', formData.election);
          formDataToSend.append('student', formData.student);
          formDataToSend.append('position', formData.position);
          formDataToSend.append('campaign_statement', formData.campaign_statement);
          formDataToSend.append('partylist', formData.partylist || '');
          if (formData.profile_picture instanceof File) {
            formDataToSend.append('profile_picture', formData.profile_picture);
          }

          const response = await axios.post(
            '/api/admin/candidates',
            formDataToSend,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          if (response.data.success) {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Candidate added successfully',
              timer: 1500,
              showConfirmButton: false
            });
            setShowModal(false);
            resetFormData();
            fetchCandidates();
          }
        }
      } catch (error) {
        console.error('Error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: error.response?.data?.message || 'Something went wrong!'
        });
      }
    };

    return (
      <div className={modalStyle.overlay}>
        <div className={modalStyle.content}>
          <div className={modalStyle.header}>
            <h2 className={modalStyle.title}>{modalTitle}</h2>
          </div>
          <form onSubmit={handleSubmit} className={modalStyle.form}>
            <div className={modalStyle.inputGroup}>
              <label className={modalStyle.label}>Election</label>
              <select
                className={modalStyle.input}
                value={formData.election}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    election: e.target.value,
                    student: '',
                    studentName: '',
                    studentId: ''
                  });
                  handleElectionChange(e);
                }}
                required
              >
                <option value="">Select Election</option>
                {availableElections.map((election) => (
                  <option key={election._id} value={election._id}>
                    {election.election_name}
                  </option>
                ))}
              </select>
            </div>

            <div className={modalStyle.inputGroup}>
              <label className={modalStyle.label}>Student Name</label>
              <Select
                className="mt-1"
                value={eligibleStudents.find(s => s.value === formData.student)}
                onChange={(selected) => setFormData({
                  ...formData,
                  student: selected.value,
                  studentName: selected.label,
                  studentId: selected.studentId
                })}
                options={eligibleStudents}
                isDisabled={!formData.election}
                placeholder="Select Student"
                required
              />
            </div>

            <div className={modalStyle.inputGroup}>
              <label className={modalStyle.label}>Student ID</label>
              <input
                type="text"
                className={modalStyle.input}
                value={formData.studentId || ''}
                readOnly
              />
            </div>

            <div className={modalStyle.inputGroup}>
              <label className={modalStyle.label}>Position</label>
              <select
                className={modalStyle.input}
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                required
              >
                <option value="">Select Position</option>
                {positions.map((position) => (
                  <option key={position._id} value={position._id}>
                    {position.position_name}
                  </option>
                ))}
              </select>
            </div>

            <div className={modalStyle.inputGroup}>
              <label className={modalStyle.label}>Campaign Statement</label>
              <textarea
                className={modalStyle.input}
                value={formData.campaign_statement}
                onChange={(e) => setFormData({ ...formData, campaign_statement: e.target.value })}
                required
                rows={4}
              />
            </div>

            <div className={modalStyle.inputGroup}>
              <label className={modalStyle.label}>Partylist (Optional)</label>
              <input
                type="text"
                className={modalStyle.input}
                value={formData.partylist}
                onChange={(e) => setFormData({ ...formData, partylist: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                {(formData.profile_picture instanceof File) ? (
                  <img
                    src={URL.createObjectURL(formData.profile_picture)}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : isEdit && selectedCandidate?.profile_picture ? (
                  <img
                    src={getImageUrl(selectedCandidate.profile_picture)}
                    alt="Current profile"
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                    <FaCamera className="text-gray-400 text-2xl" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setFormData(prev => ({
                        ...prev,
                        profile_picture: file
                      }));
                    }
                  }}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div className={modalStyle.buttonGroup}>
              <button
                type="button"
                onClick={() => isEdit ? setShowEditModal(false) : setShowModal(false)}
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

  // View campaign statement modal
  const renderViewModal = () => {
    if (!selectedCandidate) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex flex-col items-center mb-4">
              <img
                src={selectedCandidate.profile_picture || '/default-profile.png'}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-600 mb-4"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/default-profile.png';
                }}
              />
              <h2 className="text-xl font-semibold">
                {`${selectedCandidate.student.firstName} ${selectedCandidate.student.lastName}`}
              </h2>
              <p className="text-gray-600">{selectedCandidate.student.studentId}</p>
            </div>
            <h3 className="text-lg font-semibold mb-2">Campaign Statement</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {selectedCandidate.campaign_statement}
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add image handling functions
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        profile_picture: file
      });
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (candidateId) => {
    try {
      // Show confirmation dialog first
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
      });

      if (result.isConfirmed) {
        const response = await axios.delete(`/api/admin/candidates/${candidateId}`);
        
        if (response.data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Candidate has been deleted.',
            timer: 1500,
            showConfirmButton: false
          });
          
          // Refresh the candidates list
          fetchCandidates();
        }
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.response?.data?.message || 'Failed to delete candidate'
      });
    }
  };

  // Add this function to reset form data
  const resetFormData = () => {
    setFormData({
      election: '',
      student: '',
      position: '',
      campaign_statement: '',
      partylist: '',
      profile_picture: null
    });
    setSelectedCandidate(null);
  };

  // Update the handleAddClick function
  const handleAddClick = () => {
    resetFormData();
    setShowModal(true);
  };

  // Update the handleEditClick function
  const handleEditClick = (candidate) => {
    setSelectedCandidate(candidate);
    
    // Load eligible students for the selected election first
    handleElectionChange({ target: { value: candidate.election._id } });

    setFormData({
      election: candidate.election._id,
      student: candidate.student._id,
      studentName: `${candidate.student.firstName} ${candidate.student.lastName}`,
      studentId: candidate.student.studentId,
      position: candidate.position._id,
      campaign_statement: candidate.campaign_statement,
      partylist: candidate.partylist || '',
      profile_picture: null
    });

    setShowEditModal(true);
  };

  // Add campaign statement modal component
  const renderStatementModal = () => {
    if (!selectedCandidate) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex flex-col items-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Campaign Statement</h3>
              <p className="text-gray-600 mb-2">
                {`${selectedCandidate.student.firstName} ${selectedCandidate.student.lastName}`}
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedCandidate.campaign_statement}
              </p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <Sidebar isOpen={sidebarOpen} />
        <main className="pt-16 lg:ml-64">
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-xl">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} />
      
      <main className="pt-16 lg:ml-64">
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6">Manage Candidates</h2>
          
          {/* Controls */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={handleAddClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
            >
              <FaPlus className="mr-2" />
              Add Candidate
            </button>

            <div className="flex items-center">
              <span className="mr-2">Show</span>
              <select
                className="border rounded p-1"
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
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
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
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
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Profile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Election
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Partylist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Campaign Statement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentEntries.map((candidate, index) => (
                  <tr key={candidate._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{indexOfFirstEntry + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.profile_picture ? (
                        <img
                          src={getImageUrl(candidate.profile_picture)}
                          alt={`${candidate.student.firstName}'s profile`}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `
                              <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                <span class="text-gray-500 text-lg">
                                  ${candidate.student.firstName[0]}${candidate.student.lastName[0]}
                                </span>
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {candidate.student.firstName[0]}{candidate.student.lastName[0]}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {`${candidate.student.firstName} ${candidate.student.lastName}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.student.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.election.election_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.position.position_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.partylist || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => {
                          setSelectedCandidate(candidate);
                          setShowStatementModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditClick(candidate)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FaEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(candidate._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FaTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div>
              Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, filteredCandidates.length)} of {filteredCandidates.length} entries
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

      {showModal && renderModalForm(false)}
      {showEditModal && renderModalForm(true)}
      {showViewModal && renderViewModal()}
      {showStatementModal && renderStatementModal()}
    </div>
  );
};

export default ManageCandidates; 