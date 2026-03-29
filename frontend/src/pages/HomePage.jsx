import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PostList from '@/components/PostList';
import RouteSearchPanel from '@/components/RouteSearchPanel';
import SubmitBox from '@/components/SubmitBox';
import NotificationMenu from '@/components/NotificationMenu';
import { usePosts } from '@/hooks/usePosts';
import { filterPostsByRouteRadius } from '@/lib/utils';
import { Bell } from 'lucide-react';

function HomePage({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const { posts, addPost, removePost, updatePost, isLoading, error } = usePosts();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [routeSearch, setRouteSearch] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [submitInitialData, setSubmitInitialData] = useState(null);

  // Get user's location on load to bias autocomplete results.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const visiblePosts = useMemo(() => {
    if (!routeSearch) return posts;
    return filterPostsByRouteRadius(posts, routeSearch, routeSearch.radiusKm);
  }, [posts, routeSearch]);

  const handleDialogOpenChange = (open) => {
    setIsOpen(open);
    if (!open) setSubmitInitialData(null);
  };

  const openCreateRequest = () => {
    setSubmitInitialData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
    });
    setIsOpen(true);
  };

  const routeFizzySearch = (criteria) => {
    setRouteSearch(criteria);
    setHasSearched(true);
  };

  const clearRouteSearch = () => {
    setRouteSearch(null);
    setHasSearched(false);
  };

  const requestRide = (routeData) => {
    setSubmitInitialData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      ...routeData,
    });
    setIsOpen(true);
  };

  const isShowingSearchResults = routeSearch !== null;
  const dialogTitle =
    submitInitialData?.startTitle && submitInitialData?.endTitle
      ? 'Request a Ride'
      : 'Create a Ride Request';

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white border-b border-gray-200'>
        <div className="relative">
            <div className="absolute top-6 right-6">
              <NotificationMenu currentUser={currentUser}/>
            </div>
            <div className='container mx-auto px-6 py-8 max-w-6xl space-y-6'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                <div>
                  <h1 className='text-3xl font-bold text-gray-900 mb-2'>HopShare</h1>
                  <p className='text-gray-600'>
                    Create and find rides with fellow Hopkins students
                  </p>
                </div>

                <div className='flex flex-col items-end gap-2'>
                  <div className='text-right'>
                    <p className='text-sm text-gray-700'>{currentUser?.name}</p>
                    <p className='text-xs text-gray-500'>{currentUser?.email}</p>
                  </div>
                  <div className='flex gap-2'>
                    <Button variant='outline' size='sm' onClick={() => navigate('/profile')}>
                      My Profile
                    </Button>
                    <Button variant='outline' size='sm' onClick={onLogout}>
                      Log out
                    </Button>
                    <Button onClick={openCreateRequest}>Create a Request</Button>
                  </div>
                </div>
              </div>

              <RouteSearchPanel
                coords={coords}
                hasSearched={hasSearched}
                matchCount={visiblePosts.length}
                searchRadiusKm={routeSearch?.radiusKm ?? ''}
                onClearSearch={clearRouteSearch}
                onRequestRide={requestRide}
                onSearch={routeFizzySearch}
              />

              <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
                <DialogContent className='w-[90%] max-w-[800px] sm:max-w-[800px] max-h-[80vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                  </DialogHeader>

                  <SubmitBox
                    onSubmit={async (data) => {
                      await addPost(data);
                      setIsOpen(false);
                      setSubmitInitialData(null);
                    }}
                    coords={coords}
                    initialData={submitInitialData}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
      </div>

      <PostList
        posts={visiblePosts}
        isLoading={isLoading}
        error={error}
        onDeletePost={removePost}
        onUpdatePost={updatePost}
        coords={coords}
        currentUser={currentUser}
        heading={isShowingSearchResults ? 'Matching Routes' : 'Available Rides'}
        subheading={
          isShowingSearchResults
            ? `${visiblePosts.length} route${visiblePosts.length === 1 ? '' : 's'} within ${routeSearch.radiusKm} km of the selected route center`
            : ''
        }
        emptyTitle={
          isShowingSearchResults
            ? `No routes found within ${routeSearch.radiusKm} km.`
            : 'No rides available yet.'
        }
      />
    </div>
  );
}

export default HomePage;
