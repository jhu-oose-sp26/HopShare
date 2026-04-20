import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, UserMinus, MapPin, Clock, Car, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFriends, useFriendPosts } from '@/hooks/useFriends';
import { formatTime, formatDate } from '@/lib/utils';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function FriendsPage({ currentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'friends'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const { 
    friends, 
    isLoading: friendsLoading, 
    addFriend, 
    removeFriend,
    isFriend,
    refreshFriends 
  } = useFriends(currentUser?._id);

  const { 
    posts, 
    isLoading: postsLoading,
    refreshPosts 
  } = useFriendPosts(currentUser?._id);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');

    try {
      // Search by email (you could expand this to search by name too)
      const response = await fetch(`${API_ROOT}/profile/search?q=${encodeURIComponent(searchQuery.trim())}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      // Filter out current user from results
      const filtered = (data.users || []).filter(u => u._id !== currentUser?._id);
      setSearchResults(filtered);
    } catch (err) {
      setSearchError('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await addFriend(friendId);
      // Update search results to reflect new friendship
      setSearchResults(prev => prev.map(u => 
        u._id === friendId ? { ...u, isFriend: true } : u
      ));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await removeFriend(friendId);
      refreshFriends();
    } catch (err) {
      alert(err.message);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Friends
          </h1>
          <span className="text-sm text-gray-500">
            {friends.length} friend{friends.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by email to add friends..."
                className="w-full h-10 pl-10 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">{searchResults.length} user(s) found</p>
              {searchResults.map(user => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar || user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  {isFriend(user._id) ? (
                    <span className="text-sm text-green-600 font-medium">Already friends</span>
                  ) : (
                    <Button size="sm" onClick={() => handleAddFriend(user._id)}>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {searchError && (
            <p className="mt-2 text-sm text-red-600">{searchError}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'posts'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Friends' Posts
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'friends'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            My Friends
          </button>
        </div>

        {/* Content */}
        {activeTab === 'posts' ? (
          <div className="space-y-4">
            {postsLoading ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-500">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No posts from friends yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Add some friends to see their ride posts here!
                </p>
              </div>
            ) : (
              posts.map(post => (
                <div
                  key={post._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                      onClick={() => {
                        const postUser = friends.find(f => f.email === post.user?.email);
                        if (postUser?.googleId) {
                          navigate(`/user/${postUser.googleId}`);
                        }
                      }}
                    >
                      <img
                        src={post.user?.avatar || post.user?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user?.name || 'User')}`}
                        alt={post.user?.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{post.user?.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      post.type === 'offer'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {post.type === 'offer' ? 'Offering Ride' : 'Requesting Ride'}
                    </span>
                  </div>

                  {/* Post Content */}
                  <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
                  
                  {post.description && (
                    <p className="text-sm text-gray-600 mb-3">{post.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {post.trip?.date && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(post.trip.date)}
                        {post.trip.time && ` at ${formatTime(post.trip.time)}`}
                      </div>
                    )}
                    {post.suggestedPrice && (
                      <div className="flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        ${post.suggestedPrice}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {friendsLoading ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-500">Loading friends...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No friends yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Search for users by email to add them as friends!
                </p>
              </div>
            ) : (
              friends.map(friend => (
                <div
                  key={friend._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between"
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                    onClick={() => navigate(`/user/${friend.googleId}`)}
                  >
                    <img
                      src={friend.avatar || friend.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}`}
                      alt={friend.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{friend.name}</p>
                      <p className="text-sm text-gray-500">{friend.email}</p>
                      {friend.major && (
                        <p className="text-xs text-gray-400">{friend.major}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveFriend(friend._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FriendsPage;