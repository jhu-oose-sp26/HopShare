import PostList from './components/PostList'
import RouteSearchPanel from './components/RouteSearchPanel'
import SubmitBox from './components/SubmitBox'
import { usePosts } from './hooks/usePosts'
import { Button } from './components/ui/button'
import { useState, useEffect, useMemo } from 'react'
import { filterPostsByRouteRadius } from './lib/utils'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

function App() {
    const { posts, addPost, removePost, updatePost, isLoading, error } = usePosts()
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState(null)
    const [routeSearch, setRouteSearch] = useState(null)
    const [hasSearched, setHasSearched] = useState(false)
    const [submitInitialData, setSubmitInitialData] = useState(null)

    // get user's location on loading (to help with Google Maps autocomplete biasing)
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {} // silently ignore if denied
        );
    }, [])

    const visiblePosts = useMemo(() => {
        if (!routeSearch) {
            return posts
        }

        return filterPostsByRouteRadius(posts, routeSearch, routeSearch.radiusKm)
    }, [posts, routeSearch])

    // Handle dialog open/close changes
    const handleDialogOpenChange = (open) => {
        setIsOpen(open)
        if (!open) {
            setSubmitInitialData(null)
        }
    }

    // Open the create request dialog with no initial data
    const openCreateRequest = () => {
        setSubmitInitialData(null)
        setIsOpen(true)
    }

    // Handle route search submissions from the RouteSearchPanel
    const routeFizzySearch = (criteria) => {
        setRouteSearch(criteria)
        setHasSearched(true)
    }

    // Clear the current route search and show all posts again
    const clearRouteSearch = () => {
        setRouteSearch(null)
        setHasSearched(false)
    }

    const requestRide = (routeData) => {
        setSubmitInitialData(routeData)
        setIsOpen(true)
    }

    const isShowingSearchResults = routeSearch !== null
    const dialogTitle =
        submitInitialData?.startTitle && submitInitialData?.endTitle
            ? 'Request a Ride'
            : 'Create a Ride Request'

    return (
        <div className='min-h-screen bg-gray-50'>
            <div className='bg-white border-b border-gray-200'>
                <div className='container mx-auto px-6 py-8 max-w-6xl space-y-6'>
                    <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                        <div>
                            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                                HopShare
                            </h1>
                            <p className='text-gray-600'>
                                Create and find rides with fellow Hopkins students
                            </p>
                        </div>
                        <Button onClick={openCreateRequest}>
                            Create a Request
                        </Button>
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
                        <DialogContent className="w-[90%] max-w-[800px] sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                            {/* title changes based on initial data */}
                            <DialogTitle>{dialogTitle}</DialogTitle>
                            </DialogHeader>

                            <SubmitBox
                                onSubmit={async (data) => {
                                    await addPost(data)
                                    setIsOpen(false)
                                    setSubmitInitialData(null)
                                }}
                                coords={coords}
                                initialData={submitInitialData}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <PostList
                posts={visiblePosts}
                isLoading={isLoading}
                error={error}
                onDeletePost={removePost}
                onUpdatePost={updatePost}
                coords={coords}
                // the heads will change based on the search results
                heading={
                    isShowingSearchResults ? 'Matching Routes' : 'Available Rides'
                }
                subheading={
                    isShowingSearchResults
                        ? `${visiblePosts.length} route${
                              visiblePosts.length === 1 ? '' : 's'
                          } within ${routeSearch.radiusKm} km of the selected route center`
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

export default App;
