// src/components/StudentProfile.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';

function StudentProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    year: '',
    department: '',
    gender: '',
    profileCompleted: false
  });

  // Get email from local storage
  const email = localStorage.getItem('studentEmail');

  // Fetch student data if available
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!email) {
        navigate('/'); // Redirect to login if no email
        return;
      }

      try {
        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const studentDoc = querySnapshot.docs[0];
          setStudentData({
            id: studentDoc.id,
            ...studentDoc.data(),
            email // Ensure email is set
          });
        } else {
          // If no student record exists (unlikely, but possible)
          setStudentData({
            name: '',
            rollNumber: '',
            email,
            year: '',
            department: '',
            gender: '',
            profileCompleted: false
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching student data:", error);
        setError('Failed to load profile data. Please try again later.');
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [email, navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Save profile data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validate required fields
      const requiredFields = ['name', 'rollNumber', 'year', 'department', 'gender'];
      const missingFields = requiredFields.filter(field => !studentData[field]);
      
      if (missingFields.length > 0) {
        setError('Please fill in all required fields.');
        setSaving(false);
        return;
      }

      if (studentData.id) {
        // Update existing student record
        await updateDoc(doc(db, 'students', studentData.id), {
          name: studentData.name,
          rollNumber: studentData.rollNumber,
          year: studentData.year,
          department: studentData.department,
          gender: studentData.gender,
          profileCompleted: true
        });
      } else {
        // Create new student record (unlikely scenario)
        const newStudentRef = doc(collection(db, 'students'));
        await setDoc(newStudentRef, {
          name: studentData.name,
          rollNumber: studentData.rollNumber,
          email: studentData.email,
          year: studentData.year,
          department: studentData.department,
          gender: studentData.gender,
          profileCompleted: true
        });
      }

      // Redirect to dashboard after successful save
      navigate('/student/dashboard');
    } catch (error) {
      console.error("Error saving profile:", error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-900 text-white px-6 py-4">
          <h1 className="text-2xl font-bold">Student Profile</h1>
          <p className="text-blue-200">Complete your profile to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Profile Image */}
            <div className="col-span-1 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition mb-4"
                disabled={true} // Disabled for now as photo upload is not implemented
              >
                Upload Photo
              </button>
              <p className="text-xs text-gray-500 text-center">Optional: Upload a profile photo</p>
            </div>

            {/* Right Column - Form Fields */}
            <div className="col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={studentData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Roll Number */}
                <div>
                  <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Roll Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="rollNumber"
                    name="rollNumber"
                    value={studentData.rollNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={studentData.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  readOnly
                />
              </div>

              <h2 className="text-lg font-medium text-gray-900 mb-4 mt-6">Academic Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Year */}
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={studentData.year}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={studentData.department}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Gender */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={studentData.gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-red-500 text-center">
              {error}
            </div>
          )}

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StudentProfile;