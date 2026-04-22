import { useState, useEffect } from 'react';
import { User, Mail, Phone, BookOpen, Calendar, MapPin, ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useFriends } from '@/hooks/useFriends';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function UserProfile({ currentUser }) {
  const { googleId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isFriend, addFriend, removeFriend, hasSentRequest } = useFriends(currentUser?._id);
  const [friendLoading, setFriendLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const handleToggleFriend = async () => {
    if (!profile?._id) return;
    if (isFriend(profile._id)) {
      setRemoveConfirmOpen(true);
      return;
    }
    if (!hasSentRequest(profile._id) && !requestSent) {
      setFriendLoading(true);
      try {
        await addFriend(profile._id);
        setRequestSent(true);
      } catch (err) {
        alert(err.message);
      } finally {
        setFriendLoading(false);
      }
    }
  };

  const confirmRemoveFriend = async () => {
    setRemoveConfirmOpen(false);
    setFriendLoading(true);
    try {
      await removeFriend(profile._id);
    } catch (err) {
      alert(err.message);
    } finally {
      setFriendLoading(false);
    }
  };

  useEffect(() => {
    if (googleId === currentUser?.googleId) {
      navigate('/profile', { replace: true });
      return;
    }
  }, [googleId, currentUser?.googleId, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!googleId || googleId === currentUser?.googleId) return;
      
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_ROOT}/profile/google/${googleId}`, {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load profile');
        }

        const { user } = await response.json();
        setProfile(user);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [googleId, currentUser?.googleId]);

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-red-600 mb-4">
              <User className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

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
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <img
                  src={profile.avatar || profile.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=e5e7eb&color=374151&size=128`}
                  alt={profile.name}
                  className="w-16 h-16 rounded-full border-2 border-gray-200 object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=e5e7eb&color=374151&size=128`;
                  }}
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                  <p className="text-sm text-gray-600">
                    Member since {formatJoinDate(profile.createdAt)}
                  </p>
                </div>
              </div>

              {(() => {
                const isAlreadyFriend = isFriend(profile._id);
                const isPending = requestSent || hasSentRequest(profile._id);
                return (
                  <Button
                    onClick={handleToggleFriend}
                    disabled={friendLoading || isPending}
                    variant={isAlreadyFriend ? 'outline' : 'default'}
                    className={isAlreadyFriend ? 'text-red-600 hover:bg-red-50' : ''}
                  >
                    {friendLoading ? (
                      'Loading...'
                    ) : isAlreadyFriend ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        Remove Friend
                      </>
                    ) : isPending ? (
                      'Request Sent'
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Friend
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>

            {/* Profile Information */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4" />
                    Name
                  </label>
                  <p className="text-gray-900">{profile.name || '—'}</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="w-4 h-4" />
                    Email
                  </label>
                  <p className="text-gray-900">{profile.email || '—'}</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <BookOpen className="w-4 h-4" />
                    Major
                  </label>
                  <p className="text-gray-900">{profile.major || 'Not specified'}</p>
                </div>

                {profile.graduationYear && (
                  <div className="space-y-2 md:col-span-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Calendar className="w-4 h-4" />
                      Expected Graduation
                    </label>
                    <p className="text-gray-900">{profile.graduationYear}</p>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MapPin className="w-4 h-4" />
                    Bio
                  </label>
                  <p className="text-gray-900 whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}
              
              {!profile.bio && !profile.phone && !profile.major && !profile.graduationYear && (
                <div className="text-center py-8">
                  <p className="text-gray-500">This user hasn't filled out their profile yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Friend</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium text-gray-900">{profile?.name}</span>{' '}
              from your friends?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRemoveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRemoveFriend} className="bg-red-600 hover:bg-red-700 text-white border-0">
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserProfile;