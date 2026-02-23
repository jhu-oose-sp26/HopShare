import { useState } from 'react';

// Initial mock data
const initialPosts = [
    {
        _id: '507f1f77bcf86cd799439011',
        title: 'Airport Ride to BWI',
        content:
            'Looking for 2 people to split Uber to BWI airport tomorrow morning. Leaving at 8 AM from Homewood campus. Will split cost 3 ways!',
        creatorId: 123,
        trip: {
            startLocation: 'Hopkins Homewood Campus',
            endLocation: 'BWI Airport',
            date: '2024-02-24',
            time: '08:00 AM',
        },
    },
    {
        _id: '507f1f77bcf86cd799439012',
        title: 'Shopping Trip - Towson Mall',
        content:
            'Going to Towson Town Center this Saturday afternoon. Can take 3 passengers, just split gas money.',
        creatorId: 456,
        trip: {
            startLocation: 'Charles Village',
            endLocation: 'Towson Town Center',
            date: '2024-02-25',
            time: '2:00 PM',
        },
    },
    {
        _id: '507f1f77bcf86cd799439013',
        title: "Grocery Run - Target & Trader Joe's",
        content:
            "Weekly grocery trip to Target and Trader Joe's. Looking for people to split gas costs. Planning to leave Sunday morning.",
        creatorId: 789,
        trip: {
            startLocation: 'Hopkins Campus',
            endLocation: "Target/Trader Joe's",
            date: '2024-02-26',
            time: '10:00 AM',
        },
    },
    {
        _id: '507f1f77bcf86cd799439014',
        title: 'Late Night Food Run',
        content:
            "Anyone want to grab late night food? Thinking McDonald's or 24hr diner. Can drive if we split gas.",
        creatorId: 321,
        trip: null,
    },
];

export const usePosts = () => {
    const [posts, setPosts] = useState(initialPosts);

    const addPost = (formData) => {
        const newPost = {
            _id: Date.now().toString(),
            title:
                formData.title ||
                `${formData.startLocation} to ${formData.endLocation}` ||
                'New Ride Request',
            content: formData.description,
            creatorId: Date.now(),
            trip:
                formData.startLocation || formData.endLocation
                    ? {
                          startLocation: formData.startLocation,
                          endLocation: formData.endLocation,
                          date: formData.date,
                          time: formData.time,
                      }
                    : null,
        };

        setPosts((prevPosts) => [newPost, ...prevPosts]);
    };

    const removePost = (postId) => {
        setPosts((prevPosts) =>
            prevPosts.filter((post) => post._id !== postId)
        );
    };

    return {
        posts,
        addPost,
        removePost,
        postCount: posts.length,
    };
};
