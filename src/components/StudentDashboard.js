// src/components/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  orderBy
} from 'firebase/firestore';

function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [electionStatus, setElectionStatus] = useState({
    active: false,
    endsAt: null,
    timeRemaining: 'Not started'
  });
  const [eligiblePositions, setEligiblePositions] = useState([]);
  const [completedVotes, setCompletedVotes] = useState([]);

  // Get email from local storage
  const email = localStorage.getItem('studentEmail');

  // Format remaining time
  const formatTimeRemaining = (endDate) => {
    if (!endDate) return 'No end date set';
    
    const now = new Date();
    const diff = endDate - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  // Update the time remaining every minute
  useEffect(() => {
    if (!electionStatus.active || !electionStatus.endsAt) return;
    
    const updateTimeRemaining = () => {
      setElectionStatus(prev => ({
        ...prev,
        timeRemaining: formatTimeRemaining(prev.endsAt)
      }));
    };
    
    const intervalId = setInterval(updateTimeRemaining, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [electionStatus.active, electionStatus.endsAt]);

  // Fetch student data, election status, and eligible positions
  useEffect(() => {
    const fetchData = async () => {
      if (!email) {
        navigate('/');
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

        // Fetch election status
        const settingsDoc = await getDoc(doc(db, 'settings', 'election'));
        if (settingsDoc.exists()) {
          const endTimeData = settingsDoc.data().endsAt;
          const endsAt = endTimeData ? new Date(endTimeData.seconds * 1000) : null;
          
          setElectionStatus({
            active: settingsDoc.data().active || false,
            endsAt: endsAt,
            timeRemaining: endsAt ? formatTimeRemaining(endsAt) : 'Not started'
          });
        }

        // Fetch positions eligible for the student
        const positionsRef = collection(db, 'positions');
        const positionsQuery = query(positionsRef, where("status", "==", "Active"));
        const positionsSnapshot = await getDocs(positionsQuery);
        
        const positions = [];
        for (const positionDoc of positionsSnapshot.docs) {
          const positionData = {
            id: positionDoc.id,
            ...positionDoc.data()
          };

          // Check if student is eligible for this position based on year
          const isEligibleByYear = positionData.category === studentData.year;
          
          // Check department eligibility (if specified)
          const isEligibleByDepartment = 
            !positionData.departmentSpecific || 
            !positionData.department || 
            positionData.department === studentData.department;
          
          // Check gender eligibility
          const isGenderEligible = 
            !positionData.gender || 
            positionData.gender === 'Any Gender' || 
            positionData.gender === studentData.gender ||
            positionData.gender === 'Gender Neutral';

          if (isEligibleByYear && isEligibleByDepartment && isGenderEligible) {
            // Fetch candidates for this position
            const candidatesRef = collection(db, 'candidates');
            const candidatesQuery = query(candidatesRef, where("position", "==", positionData.name));
            const candidatesSnapshot = await getDocs(candidatesQuery);
            
            const candidates = candidatesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            positions.push({
              ...positionData,
              candidates,
              candidateCount: candidates.length
            });
          }
        }
        
        // Fetch completed votes by this student
        const votesRef = collection(db, 'votes');
        const votesQuery = query(votesRef, where("studentId", "==", studentData.id));
        const votesSnapshot = await getDocs(votesQuery);
        
        const votedPositionIds = new Set();
        const votes = [];
        
        for (const voteDoc of votesSnapshot.docs) {
          const voteData = voteDoc.data();
          votedPositionIds.add(voteData.positionId);
          
          // Only get details for positions we haven't processed yet
          if (!votes.some(v => v.position?.id === voteData.positionId)) {
            // Get position details
            const positionDoc = await getDoc(doc(db, 'positions', voteData.positionId));
            
            // Get candidate details
            const candidateDoc = await getDoc(doc(db, 'candidates', voteData.candidateId));
            
            if (positionDoc.exists() && candidateDoc.exists()) {
              const timestamp = voteData.timestamp?.toDate ? voteData.timestamp.toDate() : new Date();
              
              votes.push({
                id: voteDoc.id,
                position: {
                  id: positionDoc.id,
                  ...positionDoc.data()
                },
                candidate: {
                  id: candidateDoc.id,
                  ...candidateDoc.data()
                },
                timestamp: timestamp,
                receiptId: voteData.receiptId || null
              });
            }
          }
        }
        
        // Sort votes by timestamp (newest first)
        votes.sort((a, b) => b.timestamp - a.timestamp);
        setCompletedVotes(votes);

        // Remove already voted positions from eligible positions
        const eligiblePositionsFiltered = positions.filter(
          position => !votedPositionIds.has(position.id)
        );
        setEligiblePositions(eligiblePositionsFiltered);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [email, navigate]);

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
          <p className="mt-4 text-gray-700">Loading dashboard...</p>
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
            <Link to="/student/dashboard" className="block py-3 px-4 rounded-md bg-blue-500 text-white mb-1">
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
          <div className="md:hidden mb-6 flex items-center justify-between bg-white p-4 rounded-lg shadow">
            <span className="font-bold">Menu</span>
            <div className="flex space-x-4">
              <Link to="/student/profile" className="text-blue-600">Profile</Link>
              <Link to="/student/results" className="text-blue-600">Results</Link>
              <button onClick={handleLogout} className="text-red-600">Logout</button>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Dashboard</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Election Status */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <h2 className="text-lg font-medium text-gray-900 mr-4">Election Status:</h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  electionStatus.active ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {electionStatus.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {electionStatus.active && electionStatus.endsAt && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-600">
                    Ends in: <span className="font-semibold">{electionStatus.timeRemaining}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {!electionStatus.active && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Elections are currently not active. Please check back later.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Eligible Positions */}
          {electionStatus.active && (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Voting Positions</h2>
              
              {eligiblePositions.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 mb-8 text-center">
                  <p className="text-gray-600">
                    You have voted for all eligible positions or there are no positions available for you.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {eligiblePositions.map(position => (
                    <div key={position.id} className="bg-white rounded-lg shadow overflow-hidden transition-transform hover:scale-105">
                      <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">
                          {position.name}
                        </h3>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {position.category}
                          </span>
                          {position.gender && position.gender !== 'Any Gender' && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {position.gender}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                          <span>
                            {position.candidateCount} Candidate{position.candidateCount !== 1 ? 's' : ''}
                          </span>
                          <span>
                            {position.vacancies || 1} Seat{(position.vacancies || 1) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {position.candidateCount > 0 ? (
                          <Link
                            to={`/student/vote/${position.id}`}
                            className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md transition-colors"
                          >
                            Vote Now
                          </Link>
                        ) : (
                          <button disabled className="block w-full bg-gray-400 text-white text-center py-2 px-4 rounded-md cursor-not-allowed">
                            No Candidates Available
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Completed Votes */}
          {completedVotes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Completed Votes</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedVotes.map(vote => (
                  <div key={vote.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{vote.position.name}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-500">Voted for:</p>
                      <p className="font-medium text-blue-600 mt-1">{vote.candidate.name}</p>
                      
                      {vote.timestamp && (
                        <p className="text-xs text-gray-500 mt-2">
                          Submitted on {vote.timestamp.toLocaleDateString()} at {vote.timestamp.toLocaleTimeString()}
                        </p>
                      )}
                      
                      {vote.receiptId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Receipt ID: {vote.receiptId}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;