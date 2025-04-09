// src/components/StudentResults.js - Updated with consistent styling
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from 'firebase/firestore';

function StudentResults() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [student, setStudent] = useState(null);
  const [publishedResults, setPublishedResults] = useState([]);
  const [resultsPublished, setResultsPublished] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Get email from local storage
  const email = localStorage.getItem('studentEmail');

  // Fetch student data and published results
  useEffect(() => {
    const fetchData = async () => {
      if (!email) {
        navigate('/');
        return;
      }

      try {
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

        // Check if results are published
        const settingsDoc = await getDoc(doc(db, 'settings', 'election'));
        if (settingsDoc.exists()) {
          setResultsPublished(settingsDoc.data().resultsPublished || false);
        }

        // If results are published, fetch them
        if (settingsDoc.exists() && settingsDoc.data().resultsPublished) {
          const resultsRef = collection(db, 'results');
          const resultsSnapshot = await getDocs(resultsRef);
          
          const results = resultsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setPublishedResults(results);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError('Failed to load results. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [email, navigate]);

  // Filter results by category
  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
  };

  // Filter the displayed results
  const filteredResults = categoryFilter
    ? publishedResults.filter(result => result.category === categoryFilter)
    : publishedResults;

  // Get unique categories for filter
  const categories = [...new Set(publishedResults.map(result => result.category))];

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
          <p className="mt-4 text-gray-700">Loading results...</p>
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
            <Link to="/student/results" className="block py-3 px-4 rounded-md bg-blue-500 text-white mb-1">
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
              <Link to="/student/dashboard" className="text-blue-600">Dashboard</Link>
              <Link to="/student/profile" className="text-blue-600">Profile</Link>
              <button onClick={handleLogout} className="text-red-600">Logout</button>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">Election Results</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {!resultsPublished ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Election results have not been published yet. Please check back later.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Filter Controls */}
              {categories.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <label htmlFor="category-filter" className="mr-3 mb-2 sm:mb-0 font-medium text-gray-700">
                      Filter by Category:
                    </label>
                    <select
                      id="category-filter"
                      className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      value={categoryFilter}
                      onChange={handleCategoryChange}
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Results Display */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredResults.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-6 text-center col-span-full">
                    <p className="text-gray-600">No results available to display.</p>
                  </div>
                ) : (
                  filteredResults.map((result) => (
                    <div key={result.id} className="bg-white rounded-lg shadow overflow-hidden">
                      <div className="bg-blue-600 text-white p-4">
                        <h2 className="text-lg font-semibold">{result.positionName}</h2>
                        <p className="text-sm text-blue-100">
                          {result.category} • Total Votes: {result.totalVotes}
                        </p>
                      </div>
                      <div className="p-4">
                        {result.candidates && result.candidates
                          .sort((a, b) => b.votes - a.votes)
                          .map((candidate, index) => (
                            <div key={candidate.candidateId} className={`p-4 ${index !== 0 ? 'border-t border-gray-200' : ''}`}>
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                    candidate.isWinner ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {candidate.isWinner ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    ) : (
                                      <span>{index + 1}</span>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {candidate.name}
                                      {candidate.gender && <span className="text-gray-500 text-sm ml-1">({candidate.gender})</span>}
                                    </div>
                                    <div className="text-sm text-gray-500">{candidate.votes} votes</div>
                                  </div>
                                </div>
                                {candidate.isWinner && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Winner
                                  </span>
                                )}
                              </div>
                              
                              {/* Progress bar */}
                              <div className="mt-2">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                                  <div 
                                    className={`h-2.5 rounded-full ${candidate.isWinner ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${candidate.percentage}%` }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>{candidate.percentage}%</span>
                                  <span>{candidate.votes} of {result.totalVotes} votes</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentResults;