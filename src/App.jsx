import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove 
} from "firebase/firestore";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from "firebase/auth";

// --- CONFIGURATIE ---
const firebaseConfig = {
  apiKey: "AIzaSyCQyGS486-RohBd3FHBQENIhH0PSkInwBs",
  authDomain: "expothearchive.firebaseapp.com",
  projectId: "expothearchive",
  storageBucket: "expothearchive.firebasestorage.app",
  messagingSenderId: "18895439101",
  appId: "1:18895439101:web:c17f8c3e565147f7396a94"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

export default function App() {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [view, setView] = useState('grid'); 
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // FEATURES STATE
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const [formData, setFormData] = useState({
    type: 'blog',
    content: '',
    title: '',
    src: '',
    audioSrc: '',
    tags: '',
    isTitle: false,
    date: new Date().toLocaleDateString('nl-NL'),
  });

  // Live klok update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try { await signInWithPopup(auth, provider); } catch (error) { console.error(error); }
  };

  const logout = () => {
    signOut(auth);
    setView('grid');
  };

  // Real-time posts ophalen
  useEffect(() => { 
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const opgehaaldeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(opgehaaldeData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filteren en Zoeken
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesFilter = activeFilter === 'all' || post.type === activeFilter;
      const matchesSearch = 
        post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [posts, activeFilter, searchQuery]);

  // Navigatie Logica
  const navigatePost = (direction) => {
    if (!selectedPost) return;
    const currentIndex = filteredPosts.findIndex(p => p.id === selectedPost.id);
    if (currentIndex === -1) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = filteredPosts.length - 1;
    if (nextIndex >= filteredPosts.length) nextIndex = 0;
    setSelectedPost(filteredPosts[nextIndex]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedPost) return;
      if (e.key === 'ArrowRight') navigatePost(1);
      if (e.key === 'ArrowLeft') navigatePost(-1);
      if (e.key === 'Escape') setSelectedPost(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPost, filteredPosts]);

  // Swipe navigatie
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) navigatePost(1);
    if (isRightSwipe) navigatePost(-1);

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Comments ophalen
  useEffect(() => {
    if (!selectedPost) return;
    const q = query(collection(db, "posts", selectedPost.id, "comments"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(data);
    });
    return () => unsubscribe();
  }, [selectedPost]);

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "posts"), { 
        ...formData, 
        timestamp: serverTimestamp(),
        authorEmail: user.email,
        likes: 0,
        likedBy: [] 
      });
      setFormData({ type: 'blog', content: '', title: '', src: '', audioSrc: '', tags: '', isTitle: false, date: new Date().toLocaleDateString('nl-NL') });
      setView('grid');
    } catch (err) { console.error(err); }
  };

  const handleQuickEdit = async (e, id, newContent) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "posts", id), { content: newContent });
      setEditingPostId(null);
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Permanent verwijderen uit het archief?")) return;
    try { await deleteDoc(doc(db, "posts", id)); } catch (err) { console.error(err); }
  };

  const handleLike = async (e, id) => {
    if (e) e.stopPropagation();
    if (!user) { alert("Log in om te waarderen."); return; }
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const isLiked = post.likedBy && post.likedBy.includes(user.uid);
    try {
      const postRef = doc(db, "posts", id);
      await updateDoc(postRef, { 
        likes: increment(isLiked ? -1 : 1),
        likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) { console.error(err); }
  };

  const handleCommentLike = async (commentId) => {
    if (!user || !selectedPost) return;
    try {
      const commentRef = doc(db, "posts", selectedPost.id, "comments", commentId);
      await updateDoc(commentRef, { likes: increment(1) });
    } catch (err) { console.error(err); }
  };

  const handleShare = async (post) => {
    try {
      if (post.type === 'blog') {
        await navigator.clipboard.writeText(post.content);
        alert("Tekst gekopieerd!");
      } else {
        try {
          const response = await fetch(post.src);
          const blob = await response.blob();
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          alert("Beeld gekopieerd!");
        } catch {
          await navigator.clipboard.writeText(post.src);
          alert("Link gekopieerd!");
        }
      }
    } catch (err) { console.error(err); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !selectedPost) return;
    try {
      await addDoc(collection(db, "posts", selectedPost.id, "comments"), {
        text: newComment,
        userName: user.displayName,
        userPhoto: user.photoURL,
        timestamp: serverTimestamp(),
        likes: 0,
        isAdmin: user.email.toLowerCase() === "gielmolder@gmail.com"
      });
      setNewComment("");
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      ::-webkit-scrollbar { display: none; }
      body { -ms-overflow-style: none; scrollbar-width: none; overflow-y: scroll; margin: 0; transition: background-color 0.5s ease; }
      .fade-in-entry { animation: fadeIn 0.8s ease-out forwards; opacity: 0; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .filters-container { max-height: 0; overflow: hidden; transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease; opacity: 0; }
      .filters-active { max-height: 450px; opacity: 1; }
    `;
    document.head.appendChild(style);
  }, []);

  const isAdmin = user && user.email && user.email.toLowerCase() === "gielmolder@gmail.com";

  return (
    <div className={`min-h-screen font-mono selection:bg-pink-200 selection:text-black flex flex-col transition-colors duration-500 ${darkMode ? 'bg-black text-white' : 'bg-[#f0f0f0] text-[#1a1a1a]'}`}>
      
      {/* HEADER */}
      {view === 'grid' && (
        <header className={`p-4 md:p-10 border-b-8 border-black sticky top-0 z-40 shadow-[0_4px_0_0_rgba(0,0,0,1)] transition-colors ${darkMode ? 'bg-[#111]' : 'bg-white'}`}>
          <div className="flex flex-row justify-between items-center gap-2">
            <div className="group cursor-pointer select-none flex-grow" onClick={() => setShowFilters(!showFilters)}>
              <h1 className="text-xl md:text-6xl font-bold font-mono uppercase tracking-tighter italic leading-none transition-transform active:scale-95">
                The Archive
              </h1>
              <p className={`text-[7px] md:text-xs font-bold font-mono px-2 py-0.5 mt-1 inline-block uppercase tracking-widest whitespace-nowrap ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                Exposure Therapy // Giel te Molder
              </p>
            </div>

            {/* BUTTON GROUP WITH EQUAL HEIGHT */}
            <div className="flex flex-row gap-2 md:gap-4 items-stretch flex-shrink-0">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className={`px-3 md:px-6 py-1 md:py-3 border-2 md:border-4 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
              >
                {darkMode ? '☼' : '☾'}
              </button>
              
              {isAdmin && (
                <button 
                  onClick={() => setView('admin')} 
                  className="bg-yellow-300 border-2 md:border-4 border-black px-2 md:px-6 py-1 md:py-3 text-[8px] md:text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] text-black transition-all hover:shadow-none flex items-center justify-center"
                >
                  + NEW
                </button>
              )}

              {!user ? (
                <button 
                  onClick={login} 
                  className={`border-2 md:border-4 border-black px-2 md:px-6 py-1 md:py-3 text-[8px] md:text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex items-center justify-center ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
                >
                  LOGIN
                </button>
              ) : (
                <div className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-1 md:py-3 border-2 md:border-4 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest leading-none">{user.displayName?.split(' ')[0] || 'Member'}</span>
                    <button onClick={logout} className="text-[6px] md:text-[8px] font-black underline uppercase opacity-50 hover:opacity-100 transition-all">Out_</button>
                  </div>
                  {user.photoURL && <img src={user.photoURL} className="w-5 h-5 md:w-8 md:h-8 grayscale border border-white" alt="u" />}
                </div>
              )}
            </div>
          </div>

          <div className={`filters-container ${showFilters ? 'filters-active mt-8' : ''}`}>
            <div className={`flex flex-col gap-6 p-1 border-t-4 border-black pt-6 animate-in fade-in duration-500`}>
              <div className={`flex border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] max-w-xl ${darkMode ? 'bg-black border-white' : 'bg-white'}`}>
                <input type="text" placeholder="SEARCH / #TAGS..." className="bg-transparent p-3 text-sm font-bold outline-none flex-grow uppercase font-mono placeholder:opacity-30" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-[12px] font-black uppercase">
                {['all', 'blog', 'art'].map(f => (
                  <button key={f} onClick={() => setActiveFilter(f)} className={`border-2 md:border-4 border-black px-3 py-1 md:px-4 md:py-2 transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${activeFilter === f ? (darkMode ? 'bg-white text-black' : 'bg-black text-white') : (darkMode ? 'bg-[#222] text-white' : 'bg-white text-black')}`}>
                    {f === 'all' ? 'Everything' : f === 'blog' ? 'Text' : 'Visual'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-grow flex flex-col">
        {view === 'admin' ? (
          <div className="bg-[#f0f0f0] min-h-screen flex flex-col p-4 md:p-20 items-center text-black">
            <div className="max-w-4xl w-full space-y-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border-4 border-black p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)] flex flex-col justify-between h-32">
                  <span className="text-[10px] font-black uppercase opacity-40">ENTRIES_</span>
                  <span className="text-4xl font-black italic tracking-tighter">{posts.length}</span>
                </div>
                <div className="bg-white border-4 border-black p-4 shadow-[5px_5px_0_0_rgba(0,0,0,1)] flex flex-col justify-between h-32">
                  <span className="text-[10px] font-black uppercase opacity-40">IMPACT_</span>
                  <span className="text-4xl font-black italic tracking-tighter text-pink-400">
                    {posts.reduce((acc, curr) => acc + (curr.likes || 0), 0)}
                  </span>
                </div>
              </div>

              <div className="bg-white border-4 md:border-[10px] border-black p-6 md:p-10 shadow-[20px_20px_0_0_rgba(0,0,0,1)]">
                <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-8">
                  <h2 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase underline decoration-yellow-300 underline-offset-4 font-mono">Input_Terminal</h2>
                  <button onClick={() => setView('grid')} className="text-[10px] font-black bg-black text-white px-4 py-2 border-2 border-black">X</button>
                </div>
                <form onSubmit={handleSavePost} className="space-y-8 font-mono text-black">
                  <div className="flex border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                    <button type="button" onClick={() => setFormData({...formData, type: 'blog'})} className={`flex-1 py-4 font-black uppercase ${formData.type === 'blog' ? 'bg-black text-white' : 'bg-white'}`}>Text</button>
                    <button type="button" onClick={() => setFormData({...formData, type: 'art'})} className={`flex-1 py-4 font-black uppercase ${formData.type === 'art' ? 'bg-black text-white' : 'bg-white'}`}>Visual</button>
                  </div>
                  <div className="space-y-4">
                    <input type="text" placeholder="TITLE" className="w-full bg-transparent border-b-4 border-black p-2 text-xl font-black outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    {formData.type === 'art' && <input type="text" placeholder="IMAGE_URL" className="w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none" value={formData.src} onChange={e => setFormData({...formData, src: e.target.value})} />}
                    <input type="text" placeholder="TAGS (comma separated, e.g. #raw, #analog)" className="w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                    <textarea className="w-full bg-white border-4 border-black p-4 h-64 text-xl font-bold outline-none focus:bg-yellow-50 resize-none" placeholder="CONTENT..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                  </div>
                  <button type="submit" className="w-full bg-black text-white py-6 font-black text-3xl uppercase italic tracking-tighter hover:bg-yellow-300 transition-all shadow-[10px_10px_0_0_rgba(0,0,0,1)]">PUSH_</button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <main className="p-4 md:p-12 mb-10 block flex-grow">
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 md:gap-8 max-w-[1700px] mx-auto space-y-4 md:space-y-8">
              {filteredPosts.map((post) => (
                <div key={post.id} onClick={() => setSelectedPost(post)} className={`break-inside-avoid border-2 md:border-4 border-black group cursor-pointer transition-all mb-4 md:mb-8 fade-in-entry shadow-[4px_4px_0_0_rgba(0,0,0,1)] md:shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 relative ${post.type === 'art' ? 'bg-black p-0.5' : 'p-4 md:p-8'} ${post.isTitle ? (darkMode ? 'bg-[#222] text-white border-l-[8px]' : 'bg-white border-l-[15px]') : post.type === 'blog' ? 'bg-yellow-300 text-black' : ''}`}>
                  {isAdmin && (
                    <div className="absolute -top-3 -right-3 flex gap-1 z-10">
                      <button onClick={(e) => { e.stopPropagation(); setEditingPostId(post.id); setEditContent(post.content); }} className="bg-blue-500 text-white w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-black transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]">✎</button>
                      <button onClick={(e) => handleDeletePost(e, post.id)} className="bg-red-500 text-white w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-black transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]">✕</button>
                    </div>
                  )}
                  {post.type === 'blog' ? (
                    <div className="space-y-2 text-black">
                      {editingPostId === post.id ? (
                        <div onClick={e => e.stopPropagation()} className="space-y-2">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full p-2 text-xs font-bold border-2 border-black bg-white text-black min-h-[100px]" />
                          <button onClick={(e) => handleQuickEdit(e, post.id, editContent)} className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase">Save</button>
                        </div>
                      ) : (
                        <p className={`font-black uppercase tracking-tighter leading-tight ${post.isTitle ? 'text-lg md:text-3xl italic' : 'text-[9px] md:text-[12px] line-clamp-[10]'} ${post.isTitle && darkMode ? 'text-white' : ''}`}>
                          {post.isTitle ? `"${post.content}"` : post.content}
                        </p>
                      )}
                      <div className="flex justify-between items-end pt-2">
                        <button onClick={(e) => handleLike(e, post.id)} className={`flex items-center gap-1 text-[8px] md:text-[10px] font-black border border-black px-1 transition-all ${post.likedBy?.includes(user?.uid) ? 'bg-pink-300 text-black shadow-none translate-x-0.5 translate-y-0.5' : 'bg-pink-200 hover:bg-pink-300 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]'}`}>
                          <svg className={`w-2 h-2 ${post.likedBy?.includes(user?.uid) ? 'text-red-600' : 'text-red-500'} fill-current`} viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                          {post.likes || 0}
                        </button>
                        <span className="text-[7px] md:text-[9px] font-black opacity-30 italic">{post.date}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative overflow-hidden">
                      <img src={post.src} alt={post.title} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700 block" />
                      <div className="absolute top-2 left-2 bg-white text-black border-2 border-black px-2 py-0.5 text-[7px] md:text-[9px] font-black uppercase italic shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                        {post.title}
                      </div>
                      <button onClick={(e) => handleLike(e, post.id)} className={`absolute bottom-2 right-2 border-2 border-black px-1 flex items-center gap-1 text-[8px] font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${post.likedBy?.includes(user?.uid) ? 'bg-pink-300 text-black shadow-none' : 'bg-pink-200 text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]'}`}>
                        <svg className={`w-2 h-2 ${post.likedBy?.includes(user?.uid) ? 'text-red-600' : 'text-red-500'} fill-current`} viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                        {post.likes || 0}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </main>
        )}
      </div>

      {/* FOOTER */}
      {view === 'grid' && (
        <footer className={`w-full px-6 py-4 flex flex-col md:flex-row justify-between items-center opacity-40 hover:opacity-100 transition-opacity duration-500 border-t border-black/10 text-[9px] md:text-[10px] gap-4 font-mono text-black`}>
          <div className="flex gap-6 uppercase font-bold tracking-widest text-black">
            <a href="https://instagram.com/gieltemolder" target="_blank" className="hover:underline text-black">Instagram</a>
            <a href="mailto:gielmolder@gmail.com" className="hover:underline text-black">Contact</a>
            <span className="text-black">Exposure Therapy Archive</span>
          </div>
          <div className="flex items-center gap-6 tabular-nums tracking-tighter text-black">
            <div>{currentTime.toLocaleTimeString('nl-NL', { hour12: false })}</div>
            <div className="bg-black text-white px-2 py-1 flex items-center gap-2 border border-white/20">
              <span className="animate-pulse w-1 h-1 bg-yellow-300 rounded-full"></span>
              <span className="font-black uppercase tracking-tighter text-white">NODE_01</span>
            </div>
          </div>
        </footer>
      )}

      {/* MODAL EXHIBITION VIEW */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/98 z-50 flex items-center justify-center p-2 md:p-12 backdrop-blur-2xl animate-in fade-in duration-300" 
          onClick={() => setSelectedPost(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 md:border-[10px] border-black p-6 md:p-12 relative shadow-[20px_20px_0_0_rgba(0,0,0,1)] font-mono ${darkMode ? 'bg-[#111] text-white shadow-white/5' : 'bg-white text-black'}`} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 border-b-4 md:border-b-8 border-black pb-8">
              <div className="flex-grow pr-10 text-black">
                <h2 className={`text-3xl md:text-6xl font-black uppercase italic tracking-tighter underline underline-offset-4 decoration-yellow-300 leading-none mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>
                  {String(selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Entry'))}
                </h2>
                <div className="flex flex-wrap gap-2 text-white">
                  {selectedPost.tags?.split(',').map(tag => (
                    <span key={tag} className="text-[10px] font-black uppercase bg-black px-2 py-0.5 text-white">{tag.trim()}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <button onClick={() => handleShare(selectedPost)} className="bg-sky-200 text-black px-4 py-2 font-black text-xs border-2 border-black hover:bg-sky-300 transition-all shadow-[3px_3px_0_0_rgba(0,0,0,1)]">SHARE</button>
                <button onClick={() => handleLike(null, selectedPost.id)} className={`px-4 py-2 border-2 border-black font-black flex items-center gap-2 transition-all ${selectedPost.likedBy?.includes(user?.uid) ? 'bg-pink-300 text-black shadow-none' : 'bg-pink-200 text-black hover:bg-pink-300 shadow-[3px_3px_0_0_rgba(0,0,0,1)]'}`}>
                  <svg className={`w-4 h-4 ${selectedPost.likedBy?.includes(user?.uid) ? 'text-red-600' : 'text-red-500'} fill-current`} viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                  {selectedPost.likes || 0}
                </button>
                <button 
                  onClick={() => setSelectedPost(null)} 
                  className="bg-black text-white px-6 py-2 font-black text-xs border-2 border-black hover:bg-yellow-300 hover:text-black uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all"
                >
                  Close_
                </button>
              </div>
            </div>

            <div className="space-y-12 text-black">
              {selectedPost.type === 'art' && (
                <div className="border-4 md:border-8 border-black p-1 bg-black shadow-[15px_15px_0_0_rgba(0,0,0,0.2)]">
                  <img src={selectedPost.src} className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000 border-2 border-white" alt="Art Large" />
                </div>
              )}
              <div className={`text-xl md:text-3xl leading-snug font-black text-justify whitespace-pre-wrap tracking-tighter uppercase selection:bg-yellow-300 ${darkMode ? 'text-white' : 'text-black'}`}>
                {selectedPost.content}
              </div>

              {/* RESPONSES SECTION */}
              <div className="mt-20 border-t-8 border-black pt-12 text-black">
                <h3 className={`text-2xl md:text-4xl font-black uppercase italic mb-10 underline decoration-pink-300 underline-offset-8 ${darkMode ? 'text-white' : 'text-black'}`}>Responses_</h3>
                <div className="space-y-6 mb-12">
                  {comments.length === 0 ? <p className="text-xs font-bold opacity-30 italic text-black">No signals yet...</p> : 
                    comments.map(c => (
                      <div key={c.id} className={`p-4 border-4 border-black flex gap-4 ${c.isAdmin ? 'bg-yellow-300 text-black' : (darkMode ? 'bg-[#222]' : 'bg-white text-black')} shadow-[6px_6px_0_0_rgba(0,0,0,1)]`}>
                        {c.userPhoto && <img src={c.userPhoto} className="w-10 h-10 border-2 border-black grayscale" alt="av" />}
                        <div className="flex-grow">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black uppercase opacity-50">{c.userName} // {c.isAdmin ? 'ADMIN' : 'USER'}</span>
                            <button onClick={() => handleCommentLike(c.id)} className="text-[10px] font-black border border-black/20 px-2 flex items-center gap-1 hover:bg-pink-100 transition-colors">
                              <svg className="w-2 h-2 text-red-500 fill-current" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                              {c.likes || 0}
                            </button>
                          </div>
                          <p className={`text-sm md:text-xl font-bold tracking-tight leading-tight uppercase ${darkMode ? 'text-white' : 'text-black'}`}>{c.text}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
                {user ? (
                  <form onSubmit={handleAddComment} className="flex flex-col gap-4">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="ENTER RESPONSE..." className={`w-full border-4 border-black p-4 text-lg md:text-2xl font-bold focus:bg-pink-50 focus:text-black outline-none shadow-[8px_8px_0_0_rgba(0,0,0,1)] ${darkMode ? 'bg-[#222] text-white' : 'bg-white text-black'}`} />
                    <button type="submit" className="bg-black text-white py-4 md:py-6 font-black uppercase text-xl md:text-3xl italic tracking-tighter hover:bg-pink-300 hover:text-black transition-all shadow-[10px_10px_0_0_rgba(0,0,0,1)]">Push_Response_</button>
                  </form>
                ) : (
                  <button onClick={login} className="w-full border-4 border-dashed border-black p-10 text-xl font-black uppercase hover:bg-yellow-300 transition-colors text-black">LOGIN_TO_SIGNAL_</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}