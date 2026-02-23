import PostList from './components/PostList';
import SubmitBox from './components/SubmitBox';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Submit Box Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">HopShare</h1>
          <p className="text-gray-600 mb-6">Create and find rides with fellow Hopkins students</p>
          <SubmitBox />
        </div>
      </div>

      {/* Post List Section */}
      <PostList />
    </div>
  );
}

export default App;
