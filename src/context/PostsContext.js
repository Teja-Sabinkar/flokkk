// src/context/PostsContext.js
import React, { createContext, useContext, useState } from 'react';
import { fetchPosts, createPost } from '@/lib/posts';

const PostsContext = createContext();

export function PostsProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Functions to get and update posts
  // ...
  
  return (
    <PostsContext.Provider value={{ posts, loading, fetchPosts, createPost }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  return useContext(PostsContext);
}