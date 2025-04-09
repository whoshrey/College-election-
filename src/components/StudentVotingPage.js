import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

function StudentVotingPage() {
  const { positionId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [position, setPosition] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Get email from local storage
  const email = localStorage.getItem('studentEmail');

  // Load position and candidates data
  useEffect(() => {
    const fetchData = async () => {
      if (!email || !positionId) {
        navigate('/student/dashboard');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch student data
        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          navigate('/student/profile');
          return;
        }

        const studentDoc = querySnapshot.docs[0];
        const studentData = {
          id: studentDoc.id,
          ...studentDoc.data()
        };
        setStudent(studentData);

        // Check if this position has already been voted for
        const votesRef = collection(db, 'votes');
        const votesQuery = query(
          votesRef, 
          where("studentId", "==", studentData.id),
          where("positionId", "==", positionId)
        );
        const votesSnapshot = await getDocs(votesQuery);
        
        if (!votesSnapshot.empty) {
          // User has already voted for this position
          setError('You have already voted for this position.');
          setLoading(false);
          return;
        }

        // Fetch position data
        const positionDoc = await getDoc(doc(db, 'positions', positionId));
        if (!positionDoc.exists()) {
          navigate('/student/dashboard');
          return;
        }
        
        const positionData = {
          id: positionDoc.id,
          ...positionDoc.data()
        };
        setPosition(positionData);

        // Check if election is active
        const settingsDoc = await getDoc(doc(db, 'settings', 'election'));
        if (!settingsDoc.exists() || !settingsDoc.data().active) {
          setError('Voting is currently not active.');
          setLoading(false);
          return;
        }

        // Fetch candidates for this position
        const candidatesRef = collection(db, 'candidates');
        const candidatesQuery = query(candidatesRef, where("position", "==", positionData.name));
        const candidatesSnapshot = await getDocs(candidatesQuery);
        
        const candidatesData = candidatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCandidates(candidatesData);
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading voting data:", error);
        setError('Failed to load voting data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [email, positionId, navigate]);

  // Handle candidate selection
  const handleCandidateSelection = (candidateId) => {
    setSelectedCandidateId(candidateId);
  };

  // Prepare for vote submission - show confirmation
  const prepareSubmitVote = () => {
    if (!selectedCandidateId) {
      setError('Please select a candidate to vote for.');
      return;
    }
    
    setError('');
    setShowConfirmation(true);
  };

  // Cancel vote submission
  const cancelSubmit = () => {
    setShowConfirmation(false);
  };

  // Submit vote
  const submitVote = async () => {
    if (!selectedCandidateId) {
      setError('Please select a candidate to vote for.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Generate a unique receipt ID
      const receiptId = `${Date.now().toString()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add vote to Firestore
      await addDoc(collection(db, 'votes'), {
        studentId: student.id,
        positionId: position.id,
        candidateId: selectedCandidateId,
        timestamp: serverTimestamp(),
        receiptId: receiptId
      });
      
      // Find selected candidate data
      const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);
      
      // Prepare receipt data
      const receiptInfo = {
        receiptId: receiptId,
        studentName: student.name,
        studentId: student.rollNumber,
        positionName: position.name,
        candidateName: selectedCandidate.name,
        timestamp: new Date().toLocaleString()
      };
      
      setReceiptData(receiptInfo);
      setVoteSubmitted(true);
      setShowConfirmation(false);
    } catch (error) {
      console.error("Error submitting vote:", error);
      setError('Failed to submit your vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Return to dashboard
  const returnToDashboard = () => {
    navigate('/student/dashboard');
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('studentEmail');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading voting page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">College Election System</h1>
          <div className="flex items-center space-x-4">
            <span>{student?.name || 'Student'}</span>
            <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center">
              <span className="text-white font-medium">{student?.name?.charAt(0) || 'S'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md hidden md:block">
          <nav className="mt-10 px-2">
            <Link to="/student/dashboard" className="block py-3 px-4 rounded-md hover:bg-gray-100 text-gray-700 mb-1">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                </svg>
                <span>Dashboard</span>
              </div>
            </Link>
            <Link to="/student/profile" className="block py-3 px-4 rounded-md hover:bg-gray-100 text-gray-700 mb-1">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>My Profile</span>
              </div>
            </Link>
            <Link to="/student/results" className="block py-3 px-4 rounded-md hover:bg-gray-100 text-gray-700 mb-1">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Results</span>
              </div>
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full text-left block py-3 px-4 rounded-md hover:bg-gray-100 text-gray-700"
            >
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </div>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          {/* Mobile nav */}
          <div className="md:hidden mb-4">
            <Link to="/student/dashboard" className="flex items-center text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
              <p>{error}</p>
            </div>
          )}

          {voteSubmitted ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-green-500 text-white px-6 py-4">
                <h2 className="text-xl font-semibold">Vote Submitted Successfully!</h2>
              </div>
              <div className="p-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-800">Vote Receipt</h3>
                    <span className="text-sm text-gray-500">Receipt ID: {receiptData?.receiptId}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Student Name</p>
                        <p className="font-medium">{receiptData?.studentName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Student ID</p>
                        <p className="font-medium">{receiptData?.studentId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Position</p>
                        <p className="font-medium">{receiptData?.positionName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Date & Time</p>
                        <p className="font-medium">{receiptData?.timestamp}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Vote Cast For</p>
                      <div className="mt-2">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md inline-block">
                          {receiptData?.candidateName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <button
                    onClick={returnToDashboard}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4">
                <h2 className="text-xl font-semibold">Vote for: {position?.name}</h2>
                <p className="text-blue-100 text-sm">{position?.category}</p>
              </div>
              
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    Select one candidate for this position. Your vote is confidential and secure.
                  </p>
                </div>
                
                {showConfirmation ? (
                  <div className="border rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Confirm Your Selection</h3>
                    <p className="text-gray-600 mb-4">
                      You're about to vote for:
                    </p>
                    <div className="mb-6">
                      {selectedCandidateId && (
                        <div className="flex items-center">
                          <svg 
                            className="h-5 w-5 text-green-500 mr-2"
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="2" 
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="font-medium">
                            {candidates.find(c => c.id === selectedCandidateId)?.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-600 mb-6">
                      This action cannot be undone after submission. Are you sure you want to proceed?
                    </p>
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md"
                        onClick={cancelSubmit}
                      >
                        Go Back
                      </button>
                      <button
                        type="button"
                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
                        onClick={submitVote}
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting...' : 'Confirm Vote'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {candidates.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          No candidates available for this position.
                        </div>
                      ) : (
                        candidates.map(candidate => (
                          <div 
                            key={candidate.id} 
                            className={`p-4 rounded-md border-2 cursor-pointer transition-all ${
                              selectedCandidateId === candidate.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleCandidateSelection(candidate.id)}
                          >
                            <div className="flex items-center">
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 ${
                                selectedCandidateId === candidate.id
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {selectedCandidateId === candidate.id && (
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{candidate.name}</p>
                                <div className="text-sm text-gray-500 mt-1">
                                  {candidate.year && (
                                    <span className="inline-block mr-3">{candidate.year}</span>
                                  )}
                                  {candidate.gender && (
                                    <span className="inline-block">{candidate.gender}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <Link
                        to="/student/dashboard"
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md"
                      >
                        Cancel
                      </Link>
                      <button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                        onClick={prepareSubmitVote}
                        disabled={!selectedCandidateId}
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentVotingPage;