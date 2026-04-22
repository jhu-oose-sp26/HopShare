import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_META = {
  400: {
    title: '400 Bad Request',
    description: 'The request format is invalid. Please check the input and try again.',
  },
  401: {
    title: '401 Unauthorized',
    description: 'You must sign in to view this page.',
  },
  403: {
    title: '403 Forbidden',
    description: 'You do not have permission to access this resource.',
  },
  404: {
    title: '404 Not Found',
    description: 'The page you requested does not exist.',
  },
  405: {
    title: '405 Method Not Allowed',
    description: 'This action is not supported for the requested endpoint.',
  },
  500: {
    title: '500 Server Error',
    description: 'Something went wrong on the server. Please try again later.',
  },
};

function StatusPage({ currentUser }) {
  const { code } = useParams();
  const navigate = useNavigate();

  const statusCode = useMemo(() => {
    const parsed = Number(code);
    return Number.isInteger(parsed) ? parsed : 404;
  }, [code]);

  const meta = STATUS_META[statusCode] || {
    title: `${statusCode} Error`,
    description: 'An unexpected error occurred.',
  };

  return (
    <div className='min-h-screen bg-white flex items-center justify-center px-6'>
      <div className='w-full max-w-xl rounded-2xl border border-gray-200 p-8 shadow-sm'>
        <p className='text-xs font-semibold tracking-wide text-gray-500 uppercase'>Status</p>
        <h1 className='mt-2 text-3xl font-bold text-gray-900'>{meta.title}</h1>
        <p className='mt-3 text-sm text-gray-600'>{meta.description}</p>

        <div className='mt-8 flex flex-wrap gap-3'>
          <Button onClick={() => navigate(currentUser ? '/home' : '/landing')}>
            {currentUser ? 'Go to Home' : 'Go to Login'}
          </Button>
          <Button variant='outline' onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StatusPage;
