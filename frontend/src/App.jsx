import PostList from './components/PostList'
import SubmitBox from './components/SubmitBox'
import { usePosts } from './hooks/usePosts'
import { Button } from './components/ui/button'
import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';

function App() {
    const { posts, addPost, isLoading, error } = usePosts()
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState(null)

    // get user's location on loading (to help with Google Maps autocomplete biasing)
    useEffect(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {} // silently ignore if denied
        );
    }, [])

    return (
        <div className='min-h-screen bg-gray-50'>
            {/* Submit Box Section */}
            <div className='bg-white border-b border-gray-200'>
                <div className='container mx-auto px-6 py-8 max-w-4xl'>
                    <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                        HopShare
                    </h1>
                    <p className='text-gray-600 mb-6'>
                        Create and find rides with fellow Hopkins students
                    </p>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button>Create a Request</Button>
                        </DialogTrigger>

                        <DialogContent className="w-[90%] max-w-[800px] sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                            <DialogTitle>Create a Ride Request</DialogTitle>
                            </DialogHeader>

                            <SubmitBox
                                onSubmit={async (data) => {
                                    await addPost(data)
                                    setIsOpen(false)
                                }}
                                coords={coords}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Post List Section */}
            <PostList posts={posts} isLoading={isLoading} error={error} />
        </div>
    );
}

export default App;
