import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PostList from '@/components/PostList';
import RidesMapView from '@/components/RidesMapView';
import RouteSearchPanel from '@/components/RouteSearchPanel';
import SubmitBox from '@/components/SubmitBox';
import NotificationMenu from '@/components/NotificationMenu';
import StarredPage from '@/pages/StarredPage';
import { usePosts } from '@/hooks/usePosts';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { filterPostsByRouteRadius } from '@/lib/utils';

function HomePage({ currentUser, onLogout }) {
  const {
    posts,
    addPost,
    removePost,
    updatePost,
    refreshPosts,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
  } = usePosts(currentUser);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [routeSearch, setRouteSearch] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [submitInitialData, setSubmitInitialData] = useState(null);
  const [activeView, setActiveView] = useState('map');

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

  const myPosts = useMemo(
    () =>
      visiblePosts.filter((p) => {
        const userEmail = currentUser?.email;
        if (!userEmail) return false;

        const isOwner = p.user?.email === userEmail;
        const isAcceptedRider = Array.isArray(p.riderList)
          && p.riderList.some((r) => r?.email === userEmail);
        const isAcceptedDriver = Array.isArray(p.drivers)
          && p.drivers.some((d) => d?.email === userEmail);

        return isOwner || isAcceptedRider || isAcceptedDriver;
      }),
    [visiblePosts, currentUser]
  );

  const availablePosts = useMemo(
    () => {
      const userEmail = currentUser?.email;
      if (!userEmail) return visiblePosts;

      return visiblePosts.filter((p) => {
        const isOwner = p.user?.email === userEmail;
        const isAcceptedRider = Array.isArray(p.riderList)
          && p.riderList.some((r) => r?.email === userEmail);
        const isAcceptedDriver = Array.isArray(p.drivers)
          && p.drivers.some((d) => d?.email === userEmail);

        return !isOwner && !isAcceptedRider && !isAcceptedDriver;
      });
    },
    [visiblePosts, currentUser]
  );

  const isShowingSearchResults = routeSearch !== null;
  const dialogTitle =
    submitInitialData?.startTitle && submitInitialData?.endTitle
      ? 'Request a Ride'
      : 'Create a Ride Request';

  const { handlers, isPulling, progress } = usePullToRefresh(
    () => refreshPosts({ silent: true }),
    { enabled: true }
  );

  const userAvatar = currentUser?.picture
    || currentUser?.avatar
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=e5e7eb&color=374151&size=128`;

  return (
    <div className='min-h-screen bg-white pb-20' {...handlers}>
      <div className='bg-white'>
        <div className='relative'>
          <div className='absolute top-6 right-6 z-10'>
            <NotificationMenu currentUser={currentUser} />
          </div>

          <div className='container mx-auto px-6 py-8 max-w-6xl space-y-6'>
            <div className='flex flex-col gap-4 pr-14 lg:flex-row lg:items-end lg:justify-between sm:pr-20'>
              <div>
                <h1 className='text-3xl font-bold text-gray-900 mb-2'>HopShare</h1>
                <p className='text-gray-600'>
                  Create and find rides with fellow Hopkins students
                </p>
                <p className='mt-2 text-xs text-gray-400'>
                  {isPulling
                    ? progress >= 1
                      ? 'Release to refresh rides'
                      : 'Pull down to refresh rides'
                    : lastUpdatedAt
                      ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
                      : 'Waiting for live updates'}
                </p>
              </div>

              <div className='flex flex-col items-start gap-2 sm:items-end'>
                <div className='flex items-center gap-3 self-start sm:self-end'>
                  <img
                    src={userAvatar}
                    alt={currentUser?.name || 'User avatar'}
                    className='h-10 w-10 rounded-full border border-gray-200 object-cover'
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'User')}&background=e5e7eb&color=374151&size=128`;
                    }}
                  />
                  <div className='text-left sm:text-right'>
                    <p className='text-sm text-gray-700'>{currentUser?.name}</p>
                    <p className='max-w-[240px] truncate text-xs text-gray-500'>{currentUser?.email}</p>
                  </div>
                </div>
                <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end'>
                  <Button size='sm' onClick={openCreateRequest}>Create a Request</Button>
                  <Button size='sm' onClick={onLogout} className='bg-rose-600/70 hover:bg-rose-600/90 text-white border-0'>
                    Log out
                  </Button>
                </div>
              </div>
            </div>

            <RouteSearchPanel
              coords={coords}
              hasSearched={hasSearched}
              matchCount={activeView === 'my-rides' ? myPosts.length : availablePosts.length}
              searchRadiusKm={routeSearch?.radiusKm ?? ''}
              posts={visiblePosts}
              onClearSearch={clearRouteSearch}
              onRequestRide={requestRide}
              onSearch={routeFizzySearch}
            />

            {/* View tabs */}
            <div className='flex gap-1 border-b border-gray-200 -mb-6'>
              <button
                onClick={() => setActiveView('map')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeView === 'map'
                    ? 'border-black text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Map
              </button>
              <button
                onClick={() => setActiveView('available')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeView === 'available'
                    ? 'border-black text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Available Rides
              </button>
              <button
                onClick={() => setActiveView('my-rides')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeView === 'my-rides'
                    ? 'border-black text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Rides
              </button>
              <button
                onClick={() => setActiveView('starred')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeView === 'starred'
                    ? 'border-black text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Starred
              </button>
            </div>

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

      {activeView === 'available' && (
        <PostList
          posts={availablePosts}
          isLoading={isLoading}
          error={error}
          routeSearch={routeSearch}
          coords={coords}
          currentUser={currentUser}
          onRefresh={() => refreshPosts({ silent: true })}
          isRefreshing={isRefreshing}
          lastUpdatedAt={lastUpdatedAt}
          heading={isShowingSearchResults ? 'Matching Routes' : 'Available Rides'}
          subheading={
            isShowingSearchResults
              ? `${availablePosts.length} route${availablePosts.length === 1 ? '' : 's'} within ${routeSearch.radiusKm} km of the selected route center`
              : ''
          }
          emptyTitle={
            isShowingSearchResults
              ? `No routes found within ${routeSearch.radiusKm} km.`
              : 'No rides available yet.'
          }
        />
      )}
      {activeView === 'my-rides' && (
        <PostList
          posts={myPosts}
          isLoading={isLoading}
          error={error}
          routeSearch={routeSearch}
          onDeletePost={removePost}
          onUpdatePost={updatePost}
          coords={coords}
          currentUser={currentUser}
          showActions
          onRefresh={() => refreshPosts({ silent: true })}
          isRefreshing={isRefreshing}
          lastUpdatedAt={lastUpdatedAt}
          heading='My Rides'
          subheading={isLoading ? 'Loading rides...' : `${myPosts.length} upcoming ride${myPosts.length === 1 ? '' : 's'}`}
          emptyTitle='You have no rides yet.'
          emptyDescription='Use the "Create a Request" button above to post your first ride!'
        />
      )}
      {activeView === 'map' && (
        <RidesMapView
          posts={visiblePosts}
          isLoading={isLoading}
          currentUser={currentUser}
          coords={coords}
          routeSearch={routeSearch}
          onDeletePost={removePost}
          onUpdatePost={updatePost}
        />
      )}
      {activeView === 'starred' && (
        <StarredPage currentUser={currentUser} />
      )}
    </div>
  );
}

export default HomePage;
