import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, BookOpen, Calendar, MapPin, Edit3, Save, X, Camera, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime, formatDate } from '@/lib/utils';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const inputBase = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function normalizeUSPhoneDigits(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

function isValidUSPhoneNumber(phone) {
  return normalizeUSPhoneDigits(phone).length === 10;
}

function isValidUsername(username) {
  return username.length >= 3 && username.length <= 20;
}

function formatUSPhoneNumber(phone) {
  const digits = normalizeUSPhoneDigits(phone);
  if (digits.length !== 10) {
    return String(phone || '').trim();
  }

  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

async function parseApiResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const bodyText = await response.text();
    const looksLikeHtml = bodyText.trim().startsWith('<!DOCTYPE') || bodyText.trim().startsWith('<html');
    if (looksLikeHtml) {
      throw new Error('Server returned HTML instead of JSON. Check that backend API is running and API base URL/proxy is configured.');
    }
    throw new Error('Server returned an unexpected response format.');
  }

  return response.json();
}

function ProfilePage({ currentUser, onUserUpdate }) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [phoneWarning, setPhoneWarning] = useState('');
  const fileInputRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [expandedPostId, setExpandedPostId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    bio: currentUser?.bio || '',
    major: currentUser?.major || '',
    graduationYear: currentUser?.graduationYear || '',
    avatar: currentUser?.avatar || '',
  });

  // Avatar preview state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [archivedPosts, setArchivedPosts] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(true);

  // Reset form when currentUser changes or edit mode is cancelled
  useEffect(() => {
    setFormData({
      name: currentUser?.name || '',
      phone: currentUser?.phone || '',
      bio: currentUser?.bio || '',
      major: currentUser?.major || '',
      graduationYear: currentUser?.graduationYear || '',
      avatar: currentUser?.avatar || '',
    });
    setAvatarPreview(null);
    setPhoneWarning('');
  }, [currentUser, isEditing]);

  useEffect(() => {
    const fetchArchived = async () => {
      try {
        const res = await fetch(`${API_ROOT}/posts/archived`);
        const data = await res.json();
        const mine = data.filter(p => p.user?.email === currentUser?.email);
        setArchivedPosts(mine);
      } catch (err) {
        console.error('Failed to load archived posts', err);
      } finally {
        setArchivedLoading(false);
      }
    };
    fetchArchived();
  }, [currentUser?.email]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (value) => {
    setFormData(prev => ({ ...prev, name: value }));

    const trimmed = value.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
    } else if (!isValidUsername(trimmed)) {
      setError('Name must be between 3 and 20 characters.');
    } else {
      setError('');
    }
  };

  const handlePhoneChange = (value) => {
    setFormData(prev => ({ ...prev, phone: value }));

    const trimmed = value.trim();
    if (!trimmed) {
      setPhoneWarning('');
      return;
    }

    if (isValidUSPhoneNumber(trimmed)) {
      setPhoneWarning('');
    } else {
      setPhoneWarning('Enter a valid US phone number (10 digits).');
    }
  };

  const handlePhoneBlur = () => {
    const trimmed = formData.phone.trim();
    if (!trimmed) {
      setPhoneWarning('');
      return;
    }

    if (isValidUSPhoneNumber(trimmed)) {
      const formattedPhone = formatUSPhoneNumber(trimmed);
      setFormData(prev => ({ ...prev, phone: formattedPhone }));
      setPhoneWarning('');
      return;
    }

    setPhoneWarning('Enter a valid US phone number (10 digits).');
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      setError('Image size must be less than 1MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setFormData(prev => ({ ...prev, avatar: base64 }));
      setAvatarPreview(base64);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const removeAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!currentUser?._id) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Name cannot be empty.');
      return;
    }
    if (!isValidUsername(trimmedName)) {
      setError('Name must be between 3 and 20 characters.');
      return;
    }

    const trimmedPhone = formData.phone.trim();
    if (trimmedPhone && !isValidUSPhoneNumber(trimmedPhone)) {
      setPhoneWarning('Enter a valid US phone number (10 digits).');
      setError('Please enter a valid US phone number.');
      return;
    }
    const formattedPhone = trimmedPhone ? formatUSPhoneNumber(trimmedPhone) : '';

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_ROOT}/profile/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formattedPhone,
          bio: formData.bio.trim(),
          major: formData.major.trim(),
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : undefined,
          avatar: formData.avatar,
        }),
      });

      const payload = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update profile');
      }

      const { user } = payload;

      // Update the user in app state and localStorage
      onUserUpdate(user);

      setIsEditing(false);
      setSuccess('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setAvatarPreview(null);
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
              <div className="flex items-start gap-4">
                {/* Avatar Section */}
                <div className="relative">
                  <img
                    src={avatarPreview || formData.avatar || currentUser?.picture || '/default-avatar.svg'}
                    alt={currentUser?.name || 'User'}
                    className="w-20 h-20 rounded-full border-2 border-gray-200 object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=e5e7eb&color=374151&size=128`;
                    }}
                  />
                  {isEditing && (
                    <button
                      type="button"
                      onClick={triggerAvatarUpload}
                      className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {isEditing ? 'Edit Profile' : 'My Profile'}
                    </h1>
                    {/* Edit Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEditing}
                        onChange={(e) => setIsEditing(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-2 text-sm font-medium text-gray-700">Edit</span>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Joined {formatJoinDate(currentUser?.createdAt)}
                  </p>
                  {isEditing && (
                    <div className="flex gap-2 mt-3">
                      {(avatarPreview || formData.avatar) && (
                        <button
                          type="button"
                          onClick={removeAvatar}
                          className="text-xs px-3 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
                        >
                          Remove Avatar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 sm:flex-col sm:items-end">
                {isEditing && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {/* Profile Information */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4" />
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className={inputBase}
                      placeholder="Your full name"
                    />
                  ) : (
                    <p className="text-gray-900">{currentUser?.name || '—'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-500 text-sm">
                    {currentUser?.email || '—'}
                    <span className="ml-2 text-xs">(from Google account)</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4" />
                    Google ID
                  </label>
                  <p className="text-gray-500 text-sm font-mono break-all">
                    {currentUser?.googleId || '—'}
                    <span className="ml-2 text-xs">(for user navigation)</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={handlePhoneBlur}
                      className={`${inputBase} ${phoneWarning ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      placeholder="(123) 456-7890"
                      title="Enter a valid US phone number in the format (xxx)-xxx-xxxx"
                    />
                  ) : (
                    <p className="text-gray-900">{currentUser?.phone || '—'}</p>
                  )}
                  {isEditing && phoneWarning && (
                    <p className="text-xs text-red-600">{phoneWarning}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <BookOpen className="w-4 h-4" />
                    Major
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.major}
                      onChange={(e) => handleInputChange('major', e.target.value)}
                      className={inputBase}
                      placeholder="Computer Science, Biology, etc."
                    />
                  ) : (
                    <p className="text-gray-900">{currentUser?.major || '—'}</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4" />
                    Expected Graduation
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.graduationYear}
                      onChange={(e) => handleInputChange('graduationYear', e.target.value)}
                      className={inputBase}
                    >
                      <option value="">Select year</option>
                      {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{currentUser?.graduationYear || '—'}</p>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" />
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    rows={3}
                    className={inputBase}
                    placeholder="Tell others about yourself, your interests, preferred ride times, etc."
                  />
                ) : (
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {currentUser?.bio || 'No bio added yet.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Past Trips */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="px-6 py-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Trips</h2>
            {archivedLoading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : archivedPosts.length === 0 ? (
              <p className="text-gray-500 text-sm">No past trips yet.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {archivedPosts.slice(0, visibleCount).map(post => (
                    <div key={post._id} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          post.type === 'offer'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {post.type === 'offer' ? 'Offered Ride' : 'Requested Ride'}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(post.trip?.date)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">
                        {post.title || 'Unknown route'}
                      </p>
                      {post.trip?.time && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatTime(post.trip?.time)}
                        </p>
                      )}
                      {post.description && (
                        <>
                          {expandedPostId === post._id && (
                            <p className="text-sm text-gray-600 mt-2 border-t border-gray-200 pt-2">
                              {post.description}
                            </p>
                          )}
                          <button
                            onClick={() => setExpandedPostId(
                              expandedPostId === post._id ? null : post._id
                            )}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {expandedPostId === post._id ? 'Show less' : 'View details'}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {visibleCount < archivedPosts.length && (
                  <button
                    onClick={() => setVisibleCount(archivedPosts.length)}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    See all ({archivedPosts.length} trips)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;