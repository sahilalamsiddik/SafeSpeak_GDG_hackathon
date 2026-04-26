import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, MessageSquare, AlertTriangle, Plus, X } from 'lucide-react';
import axios from 'axios';

const ResolveSpace = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('Active'); // 'Active' or 'History'
  const [newPost, setNewPost] = useState({ title: '', description: '', address: '', state: '', district: '', city: '' });
  const [activeReply, setActiveReply] = useState(null);
  const [replyText, setReplyText] = useState('');

  const fetchPosts = async () => {
    try {
      const endpoint = viewMode === 'History' ? '/api/resolve-space/history' : '/api/resolve-space/posts';
      const res = await axios.get(endpoint);
      setPosts(res.data.posts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [viewMode]);

  const handleLike = async (postId) => {
    try {
      const res = await axios.post(`/api/resolve-space/posts/${postId}/like`);
      if (res.data.success) {
        setPosts(posts.map(p => p.postId === postId ? { ...p, likeCount: res.data.likeCount } : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplySubmit = async (postId) => {
    if (!replyText.trim()) return;
    try {
      await axios.post(`/api/resolve-space/posts/${postId}/reply`, { content: replyText });
      setReplyText('');
      setActiveReply(null);
      fetchPosts(); // Refresh to get replies count (or could just increment locally)
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/resolve-space/posts', newPost);
      setShowModal(false);
      setNewPost({ title: '', description: '', address: '', state: '', district: '', city: '' });
      fetchPosts();
    } catch (err) {
      console.error(err);
      alert('Failed to submit post');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Resolve<span className="text-primary">Space</span></h1>
            <p className="text-gray-400">Community discussion forum for local issues.</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-darkBg p-1 rounded-lg border border-gray-700 flex">
              <button 
                onClick={() => setViewMode('Active')}
                className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${viewMode === 'Active' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setViewMode('History')}
                className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${viewMode === 'History' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
              >
                History
              </button>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-glow"
            >
              <Plus className="w-5 h-5" /> Raise Issue
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500 glass-panel">No community posts yet. Be the first to raise an issue.</div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={post.postId || post._id} 
                className="glass-panel p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{post.title}</h3>
                    <p className="text-sm text-gray-400 mt-1 flex flex-col">
                      <span>{post.location?.address || [post.location?.city, post.location?.district, post.location?.state].filter(Boolean).join(', ') || 'Unknown Location'}</span>
                    </p>
                  </div>
                  
                  {/* Tolerance Badge */}
                  {(post.toleranceCount || 0) >= 2 ? (
                    <span className="flex items-center gap-1 bg-danger/20 text-danger border border-danger/50 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                      <AlertTriangle className="w-4 h-4" /> Reported {(post.toleranceCount || 0) + 1}/3 times
                      {post.escalatedToHigherAuthority && " (Escalated)"}
                    </span>
                  ) : (post.toleranceCount || 0) > 0 ? (
                    <span className="flex items-center gap-1 bg-warning/20 text-warning border border-warning/50 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                      🔁 Reported {(post.toleranceCount || 0) + 1}/3 times
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-gray-700/50 text-gray-400 border border-gray-600 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                      Reported 1/3 times
                    </span>
                  )}
                </div>
                
                <p className="text-gray-300 mb-4">{post.description}</p>
                
                {post.media && post.media.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
                    {post.media.map((file, idx) => (
                      <div key={idx} className="flex-shrink-0">
                        {file.type === 'image' ? (
                          <img src={file.url} alt="attachment" className="h-32 rounded object-cover border border-gray-700" />
                        ) : file.type === 'video' ? (
                          <video src={file.url} className="h-32 rounded object-cover border border-gray-700" controls />
                        ) : (
                          <audio src={file.url} controls className="h-12 w-64" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-6 border-t border-gray-700/50 pt-4">
                  <button 
                    onClick={() => handleLike(post.postId || post._id)}
                    className="flex items-center gap-2 text-gray-400 hover:text-primary transition-colors"
                  >
                    <ThumbsUp className="w-5 h-5" /> <span>{post.likeCount || 0}</span>
                  </button>
                  <button 
                    onClick={() => setActiveReply(activeReply === post._id ? null : post._id)}
                    className="flex items-center gap-2 text-gray-400 hover:text-accent transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" /> <span>{post.replyCount || 0}</span>
                  </button>
                  <span className="text-xs text-gray-500 ml-auto text-right">
                    {new Date(post.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} <br/>
                    {new Date(post.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {activeReply === post._id && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 flex gap-2"
                  >
                    <input 
                      type="text" 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Add an anonymous reply..." 
                      className="flex-grow bg-darkBg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-accent focus:outline-none"
                    />
                    <button 
                      onClick={() => handleReplySubmit(post.postId || post._id)}
                      className="bg-accent text-darkBg px-4 py-2 rounded-lg font-bold hover:bg-accent/80"
                    >
                      Post
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* New Post Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-panel p-6 sm:p-8 w-full max-w-lg relative"
            >
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-bold text-white mb-6">Raise an Issue</h2>
              <form onSubmit={handlePostSubmit} className="space-y-4">
                <input 
                  type="text" required placeholder="Issue Title"
                  value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})}
                  className="w-full bg-darkBg border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none"
                />
                <textarea 
                  required placeholder="Description" rows="3"
                  value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})}
                  className="w-full bg-darkBg border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none"
                ></textarea>
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" placeholder="State" required
                    value={newPost.state} onChange={e => setNewPost({...newPost, state: e.target.value})}
                    className="w-full bg-darkBg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-primary"
                  />
                  <input 
                    type="text" placeholder="District" required
                    value={newPost.district} onChange={e => setNewPost({...newPost, district: e.target.value})}
                    className="w-full bg-darkBg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-primary"
                  />
                </div>
                <input 
                  type="text" placeholder="City" required
                  value={newPost.city} onChange={e => setNewPost({...newPost, city: e.target.value})}
                  className="w-full bg-darkBg border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-primary"
                />
                <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-600 shadow-glow">
                  Post to Community
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResolveSpace;
