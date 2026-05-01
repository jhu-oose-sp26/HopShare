import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Search, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useFriends, useFriendPosts } from '@/hooks/useFriends';
import PostCard from '@/components/PostCard';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function FriendsPage({ currentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState(null); // { id, name }

  const {
    friends,
    incomingRequests,
    isLoading: friendsLoading,
    addFriend,
    removeFriend,
    acceptRequest,
    rejectRequest,
    isFriend,
    hasSentRequest,
    hasIncomingRequest,
    refreshFriends,
  } = useFriends(currentUser?._id);

  const { posts, isLoading: postsLoading } = useFriendPosts(currentUser?._id);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');

    try {
      const response = await fetch(`${API_ROOT}/profile/search?q=${encodeURIComponent(searchQuery.trim())}`);

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      const filtered = (data.users || []).filter(u => u._id !== currentUser?._id);
      setSearchResults(filtered);
    } catch (err) {
      setSearchError('Failed to search users');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (userId) => {
    try {
      await addFriend(userId);
      // Optimistically mark in search results
      setSearchResults(prev => prev.map(u =>
        u._id === userId ? { ...u, _requestSent: true } : u
      ));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveFriend = (friendId, friendName) => {
    setRemoveConfirm({ id: friendId, name: friendName });
  };

  const confirmRemoveFriend = async () => {
    if (!removeConfirm) return;
    try {
      await removeFriend(removeConfirm.id);
      refreshFriends();
    } catch (err) {
      alert(err.message);
    } finally {
      setRemoveConfirm(null);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await acceptRequest(requestId);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectRequest(requestId);
    } catch (err) {
      alert(err.message);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
  };

  const getSearchResultStatus = (user) => {
    if (isFriend(user._id)) return 'friend';
    if (user._requestSent || hasSentRequest(user._id)) return 'sent';
    const incoming = hasIncomingRequest(user._id);
    if (incoming) return { type: 'incoming', request: incoming };
    return 'none';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto px-6 py-6 max-w-6xl">
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
                placeholder="Search by name or email to add friends..."
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
              {searchResults.map(user => {
                const status = getSearchResultStatus(user);
                return (
                  <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                      onClick={() => user.googleId && navigate(`/user/${user.googleId}`)}
                    >
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
                    {status === 'friend' ? (
                      <span className="text-sm text-green-600 font-medium">Already friends</span>
                    ) : status === 'sent' ? (
                      <span className="text-sm text-gray-400 font-medium">Request sent</span>
                    ) : status?.type === 'incoming' ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAccept(status.request._id)}>
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(status.request._id)}>
                          Decline
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => handleAddFriend(user._id)}>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {searchError && (
            <p className="mt-2 text-sm text-red-600">{searchError}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'posts'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Friends&apos; Posts
            {posts.length > 0 && (
              <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {posts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Requests
            {incomingRequests.length > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'requests' ? 'bg-white/20' : 'bg-blue-500 text-white'
              }`}>
                {incomingRequests.length}
              </span>
            )}
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
            {friends.length > 0 && (
              <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                {friends.length}
              </span>
            )}
          </button>
        </div>

        {/* Friends' Posts */}
        {activeTab === 'posts' && (
          <div>
            {postsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-800 animate-spin" />
                <p className="text-sm text-gray-400 animate-pulse">Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No posts from friends yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  {friends.length === 0
                    ? 'Add some friends to see their ride posts here!'
                    : "Your friends haven't posted any rides yet."}
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  {posts.length} ride{posts.length === 1 ? '' : 's'} from your friends
                </p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {posts.map(post => (
                    <PostCard key={post._id} post={post} currentUser={currentUser} showActions={false} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Incoming Requests */}
        {activeTab === 'requests' && (
          <div>
            {friendsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-800 animate-spin" />
                <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
              </div>
            ) : incomingRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No pending friend requests</p>
                <p className="text-sm text-gray-500 mt-1">
                  When someone sends you a friend request, it will appear here.
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  {incomingRequests.length} pending request{incomingRequests.length === 1 ? '' : 's'}
                </p>
                <div className="space-y-3">
                  {incomingRequests.map(req => (
                    <div key={req._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-3">
                      <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80 min-w-0 flex-1"
                        onClick={() => req.sender?.googleId && navigate(`/user/${req.sender.googleId}`)}
                      >
                        <img
                          src={req.sender?.avatar || req.sender?.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.sender?.name || '?')}`}
                          alt={req.sender?.name}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{req.sender?.name}</p>
                          <p className="text-sm text-gray-500 truncate">{req.sender?.email}</p>
                          {req.sender?.major && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">{req.sender.major}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleAccept(req._id)}>
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(req._id)}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* My Friends */}
        {activeTab === 'friends' && (
          <div>
            {friendsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-gray-800 animate-spin" />
                <p className="text-sm text-gray-400 animate-pulse">Loading friends...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No friends yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Search for users by name or email to add them as friends!
                </p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  {friends.length} friend{friends.length === 1 ? '' : 's'}
                </p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {friends.map(friend => (
                    <div
                      key={friend._id}
                      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className="flex items-center gap-3 cursor-pointer hover:opacity-80 min-w-0 flex-1"
                          onClick={() => navigate(`/user/${friend.googleId}`)}
                        >
                          <img
                            src={friend.avatar || friend.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name)}`}
                            alt={friend.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{friend.name}</p>
                            <p className="text-sm text-gray-500 truncate">{friend.email}</p>
                            {friend.major && (
                              <p className="text-xs text-gray-400 truncate mt-1">{friend.major}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFriend(friend._id, friend.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => navigate(`/user/${friend.googleId}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Remove friend confirmation dialog */}
      <Dialog open={!!removeConfirm} onOpenChange={(open) => { if (!open) setRemoveConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Friend</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium text-gray-900">{removeConfirm?.name}</span>{' '}
              from your friends?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRemoveConfirm(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRemoveFriend}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FriendsPage;
