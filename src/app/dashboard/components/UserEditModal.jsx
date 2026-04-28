'use client';
import { useState, useEffect, useRef } from 'react';
import { sanitizePhoneNumber, isValidPhoneNumber, getPhoneValidationMessage } from '../../components/auth/authService';

export default function UserEditModal({ isOpen, user, onClose, onSave, isAdminMode = false, isDarkMode = false, availableSchools = [] }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    password: '',
    profilePhoto: '',
    role: '',
    schoolName: '',
    schoolArea: '',
    board: '',
    schoolType: '',
    className: '',
    section: '',
    subject: '',
    qualification: '',
    address: '',
    academicYear: '',
    parentName: '',
    childName: '',
    childClass: '',
    childSection: '',
    relationWithChild: '',
    designation: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        number: user.number || '',
        password: '',
        profilePhoto: user.profilePhoto || '',
        role: user.role || '',
        schoolName: user.schoolName || '',
        schoolArea: user.schoolArea || '',
        board: user.board || '',
        schoolType: user.schoolType || '',
        className: user.className || '',
        section: user.section || '',
        subject: user.subject || '',
        qualification: user.qualification || '',
        address: user.address || '',
        academicYear: user.academicYear || '',
        parentName: user.parentName || '',
        childName: user.childName || '',
        childClass: user.childClass || '',
        childSection: user.childSection || '',
        relationWithChild: user.relationWithChild || '',
        designation: user.designation || ''
      });
      setSchoolSearch(user.schoolName || '');
    }
  }, [user]);

  useEffect(() => {
    setSchoolSearch(formData.schoolName || '');
  }, [formData.schoolName]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSchoolDropdown(false);
        if (availableSchools.length > 0 && !availableSchools.includes(schoolSearch)) {
          setSchoolSearch(formData.schoolName || '');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [schoolSearch, availableSchools, formData.schoolName]);

  const handleChange = (field, value) => {
    if (field === 'number') {
      setFormData(prev => ({ ...prev, [field]: sanitizePhoneNumber(value) }));
      if (error) setError('');
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleChange('profilePhoto', typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidPhoneNumber(formData.number)) {
      setError(getPhoneValidationMessage());
      return;
    }
    setError('');
    const payload = { ...user, ...formData };
    if (!formData.password) delete payload.password;
    onSave(payload);
  };

  if (!isOpen) return null;

  const getRoleLabel = (role) => {
    const roleMap = {
      'admin': 'Admin',
      'teacher': 'Teacher',
      'student': 'Student',
      'parents': 'Parent',
      'staff': 'Non Teaching Staff'
    };
    return roleMap[role] || role;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className={`rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`sticky top-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} border-b px-6 py-4 flex justify-between items-center`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-blue-900'}`}>
            Edit {isAdminMode ? 'Admin' : getRoleLabel(formData.role)}: {formData.name}
          </h2>
          <button 
            onClick={onClose} 
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-slate-500 hover:text-slate-700'} text-2xl font-bold`}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* COMMON FIELDS */}
            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Phone Number *</label>
              <input
                type="tel"
                value={formData.number}
                onChange={(e) => handleChange('number', e.target.value)}
                inputMode="numeric"
                maxLength={10}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                required
              />
            </div>
            {error && (
              <div className="md:col-span-2">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Role</label>
              <input
                type="text"
                value={getRoleLabel(formData.role)}
                disabled
                className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-600 border-gray-500 text-gray-300' : 'bg-slate-50 text-slate-500 border-slate-300'}`}
              />
              <p className="text-xs text-gray-400 mt-1">Role cannot be changed</p>
            </div>

            <div ref={availableSchools.length > 0 ? dropdownRef : null}>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>School Name</label>
              {availableSchools.length > 0 ? (
                <>
                  <input
                    type="text"
                    value={schoolSearch}
                    onChange={(e) => {
                      setSchoolSearch(e.target.value);
                      setShowSchoolDropdown(true);
                    }}
                    onFocus={() => setShowSchoolDropdown(true)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  />
                  {showSchoolDropdown && (
                    <div className={`absolute z-10 w-full mt-1 max-h-40 overflow-y-auto border rounded-md shadow-lg ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
                      {availableSchools
                        .filter(school => school.toLowerCase().includes(schoolSearch.toLowerCase()))
                        .map(school => (
                          <div
                            key={school}
                            onClick={() => {
                              setSchoolSearch(school);
                              handleChange('schoolName', school);
                              setShowSchoolDropdown(false);
                            }}
                            className={`px-3 py-2 cursor-pointer text-sm ${isDarkMode ? 'text-white hover:bg-gray-600' : 'text-gray-800 hover:bg-gray-100'}`}
                          >
                            {school}
                          </div>
                        ))}
                      {availableSchools.filter(school => school.toLowerCase().includes(schoolSearch.toLowerCase())).length === 0 && (
                        <div className={`px-3 py-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No schools found</div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Profile Photo</label>
              <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} alt="Profile" className="h-20 w-20 rounded-full object-cover border" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
                    No Photo
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                  {formData.profilePhoto && (
                    <button type="button" onClick={() => handleChange('profilePhoto', '')} className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Reset Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  placeholder="Leave blank to keep current password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-500">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* ADMIN SPECIFIC FIELDS */}
            {isAdminMode && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>School Area</label>
                  <input
                    type="text"
                    value={formData.schoolArea}
                    onChange={(e) => handleChange('schoolArea', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Board</label>
                  <input
                    type="text"
                    value={formData.board}
                    onChange={(e) => handleChange('board', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>School Type</label>
                  <select
                    value={formData.schoolType}
                    onChange={(e) => handleChange('schoolType', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  >
                    <option value="">Select School Type</option>
                    <option value="Govt">Govt</option>
                    <option value="Private">Private</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Assigned Classes</label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={(e) => handleChange('className', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Assigned Sections</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => handleChange('section', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Assigned Academic Years</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => handleChange('academicYear', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`}
                  />
                </div>
              </>
            )}

            {/* TEACHER FIELDS */}
            {!isAdminMode && formData.role === 'teacher' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Class</label>
                  <input type="text" value={formData.className} onChange={(e) => handleChange('className', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Section</label>
                  <input type="text" value={formData.section} onChange={(e) => handleChange('section', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Subject</label>
                  <input type="text" value={formData.subject} onChange={(e) => handleChange('subject', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Qualification</label>
                  <input type="text" value={formData.qualification} onChange={(e) => handleChange('qualification', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
              </>
            )}

            {/* STUDENT FIELDS */}
            {!isAdminMode && formData.role === 'student' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Class</label>
                  <input type="text" value={formData.className} onChange={(e) => handleChange('className', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Section</label>
                  <input type="text" value={formData.section} onChange={(e) => handleChange('section', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Academic Year</label>
                  <input type="text" value={formData.academicYear} onChange={(e) => handleChange('academicYear', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Address</label>
                  <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Parent Name</label>
                  <input type="text" value={formData.parentName} onChange={(e) => handleChange('parentName', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
              </>
            )}

            {/* PARENT FIELDS */}
            {!isAdminMode && formData.role === 'parents' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Child Name</label>
                  <input type="text" value={formData.childName} onChange={(e) => handleChange('childName', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Child Class</label>
                  <input type="text" value={formData.childClass} onChange={(e) => handleChange('childClass', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Child Section</label>
                  <input type="text" value={formData.childSection} onChange={(e) => handleChange('childSection', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Relation with Child</label>
                  <input type="text" value={formData.relationWithChild} onChange={(e) => handleChange('relationWithChild', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Address</label>
                  <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
              </>
            )}

            {/* STAFF FIELDS */}
            {!isAdminMode && formData.role === 'staff' && (
              <>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Qualification</label>
                  <input type="text" value={formData.qualification} onChange={(e) => handleChange('qualification', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Designation</label>
                  <input type="text" value={formData.designation} onChange={(e) => handleChange('designation', e.target.value)} className={`w-full px-3 py-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-slate-300'}`} />
                </div>
              </>
            )}

          </div>

          {/* Action Buttons */}
          <div className={`sticky bottom-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} border-t mt-6 pt-4 flex justify-end gap-3`}>
            <button type="button" onClick={onClose} className={`px-4 py-2 border rounded-md font-medium transition ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition shadow-sm">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
