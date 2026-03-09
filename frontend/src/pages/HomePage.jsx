import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PostList from '@/components/PostList';
import SubmitBox from '@/components/SubmitBox';
import { usePosts } from '@/hooks/usePosts';

function HomePage({ currentUser, onLogout }) {
  const { posts, addPost, removePost, updatePost, isLoading, error } = usePosts();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);

  // Get user's location on load to bias autocomplete results.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white border-b border-gray-200'>
        <div className='container mx-auto px-6 py-8 max-w-4xl'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>HopShare</h1>
              <p className='text-gray-600'>
                Create and find rides with fellow Hopkins students
              </p>
            </div>

            <div className='text-right'>
              <p className='text-sm text-gray-700'>{currentUser?.name}</p>
              <p className='text-xs text-gray-500'>{currentUser?.email}</p>
              <Button className='mt-2' variant='outline' size='sm' onClick={onLogout}>
                Log out
              </Button>
            </div>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className='mt-6'>Create a Request</Button>
            </DialogTrigger>

            <DialogContent className='w-[90%] max-w-[800px] sm:max-w-[800px] max-h-[80vh] overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>Create a Ride Request</DialogTitle>
              </DialogHeader>

              <SubmitBox
                onSubmit={async (data) => {
                  await addPost(data);
                  setIsOpen(false);
                }}
                coords={coords}
                initialData={{
                  name: currentUser?.name || '',
                  email: currentUser?.email || '',
                  phone: currentUser?.phone || '',
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <PostList
        posts={posts}
        isLoading={isLoading}
        error={error}
        onDeletePost={removePost}
        onUpdatePost={updatePost}
        coords={coords}
      />
    </div>
  );
}

export default HomePage;
