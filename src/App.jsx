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
  const [view, setView] = useState('grid'); // 'grid', 'admin', 'account'
  const [user, setUser] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // UI STATE
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const accountMenuRef = useRef(null);

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

  // --- NAVIGATION LOGIC ---
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView('grid');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView) => {
    setView(newView);
    setShowAccountMenu(false);
    window.history.pushState({ view: newView }, '', '');
    window.scrollTo(0, 0);
  };

  // Live klok
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return () => unsubscribe();
  }, []);

  // Click outside menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const login = async () => {
    try { await signInWithPopup(auth, provider); } catch (error) { console.error(error); }
  };

  const logout = () => {
    signOut(auth);
    navigateTo('grid');
  };

  // Real-time data
  useEffect(() => { 
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filteren
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

  // Eigen likes voor account pagina
  const likedPosts = useMemo(() => {
    if (!user) return [];
    return posts.filter(post => post.likedBy?.includes(user.uid));
  }, [posts, user]);

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
      navigateTo('grid');
    } catch (err) { console.error(err); }
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
      .filters-container { max-height: 0; overflow: hidden; transition: max-height 0.5s ease, opacity 0.3s ease; opacity: 0; }
      .filters-active { max-height: 450px; opacity: 1; }
      audio::-webkit-media-controls-panel { background-color: #fff; border-radius: 0; }
    `;
    document.head.appendChild(style);
  }, []);

  const isAdmin = user && user.email && user.email.toLowerCase() === "gielmolder@gmail.com";

  // Bepaal de titel van de header op basis van de view
  const headerTitle = useMemo(() => {
    if (view === 'admin') return 'TERMINAL_INPUT';
    if (view === 'account') return 'THE_IDENTITY';
    return 'THE ARCHIVE';
  }, [view]);

  return (
    <div className={`min-h-screen font-mono selection:bg-pink-200 selection:text-black flex flex-col transition-colors duration-500 ${darkMode ? 'bg-black text-white' : 'bg-[#f0f0f0] text-[#1a1a1a]'}`}>
      
      {/* GLOBAL HEADER (Dynamisch) */}
      <header className={`p-4 md:p-10 border-b-8 border-black sticky top-0 z-40 shadow-[0_4px_0_0_rgba(0,0,0,1)] transition-colors ${darkMode ? 'bg-[#111]' : 'bg-white'}`}>
        <div className="flex flex-row justify-between items-center gap-2">
          <div className="group cursor-pointer select-none flex-grow" onClick={() => view === 'grid' ? setShowFilters(!showFilters) : navigateTo('grid')}>
            <h1 className="text-xl md:text-6xl font-black font-mono uppercase tracking-tighter italic leading-none transition-transform active:scale-95">
              {headerTitle}
            </h1>
            <p className={`text-[7px] md:text-xs font-bold font-mono px-2 py-0.5 mt-1 inline-block uppercase tracking-widest whitespace-nowrap ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
              Exposure Therapy // {view === 'grid' ? 'Giel te Molder' : view === 'admin' ? 'SYSTEM_ADMIN' : 'USER_NODE'}
            </p>
          </div>

          <div className="flex flex-row gap-2 md:gap-4 items-stretch flex-shrink-0">
            {/* Terug naar Grid knop (alleen zichtbaar buiten de grid) */}
            {view !== 'grid' && (
              <button 
                onClick={() => navigateTo('grid')}
                className="bg-black text-white border-2 md:border-4 border-black px-2 md:px-6 py-1 md:py-3 text-[8px] md:text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:bg-yellow-300 hover:text-black transition-all flex items-center justify-center"
              >
                Back_
              </button>
            )}

            <button onClick={() => setDarkMode(!darkMode)} className={`px-3 md:px-6 py-1 md:py-3 border-2 md:border-4 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all flex items-center justify-center ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
              {darkMode ? '☼' : '☾'}
            </button>
            
            {isAdmin && view === 'grid' && (
              <button onClick={() => navigateTo('admin')} className="border-2 md:border-4 border-black px-2 md:px-6 py-1 md:py-3 text-[8px] md:text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all bg-yellow-300 text-black flex items-center justify-center">
                + NEW
              </button>
            )}

            {!user ? (
              <button onClick={login} className={`border-2 md:border-4 border-black px-2 md:px-6 py-1 md:py-3 text-[8px] md:text-xs font-black uppercase shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex items-center justify-center ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>LOGIN</button>
            ) : (
              <div className="relative" ref={accountMenuRef}>
                <button onClick={() => setShowAccountMenu(!showAccountMenu)} className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-1 md:py-3 border-2 md:border-4 border-black shadow-[2px_2px_0_0_rgba(0,0,0,1)] transition-all h-full ${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                  <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest leading-none">{user.displayName?.split(' ')[0]}</span>
                  {user.photoURL && <img src={user.photoURL} className="w-5 h-5 md:w-8 md:h-8 grayscale border border-current" alt="u" />}
                </button>
                {showAccountMenu && (
                  <div className={`absolute right-0 mt-2 w-48 md:w-64 border-4 border-black p-4 md:p-6 z-50 shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200 ${darkMode ? 'bg-[#111] text-white' : 'bg-white text-black'}`}>
                    <div className="flex flex-col border-b-2 border-black/10 pb-3">
                      <span className="text-[8px] font-black uppercase opacity-40 mb-1">Identity_</span>
                      <span className="text-[9px] md:text-[12px] font-bold truncate lowercase">{user.email}</span>
                    </div>
                    <button onClick={() => navigateTo('account')} className="w-full bg-blue-500 text-white text-[10px] md:text-xs font-black uppercase py-2 md:py-3 border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-none transition-all">My_Profile_</button>
                    <button onClick={logout} className="w-full bg-red-500 text-white text-[10px] md:text-xs font-black uppercase py-2 md:py-3 border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-none transition-all">Sign_Out_</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {view === 'grid' && (
          <div className={`filters-container ${showFilters ? 'filters-active mt-8' : ''}`}>
            <div className="flex flex-col gap-6 p-1 border-t-4 border-black pt-6 animate-in fade-in duration-500">
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
        )}
      </header>

      {/* PAGE CONTENT */}
      <div className="flex-grow flex flex-col">
        
        {/* PAGE: ADMIN TERMINAL */}
        {view === 'admin' && (
          <div className={`p-4 md:p-12 animate-in fade-in duration-500 ${darkMode ? 'bg-black text-white' : 'bg-[#f0f0f0] text-black'}`}>
            <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className={`border-4 md:border-8 border-black p-6 md:p-10 shadow-[15px_15px_0_0_rgba(0,0,0,1)] ${darkMode ? 'bg-[#111]' : 'bg-white'}`}>
                  <form onSubmit={handleSavePost} className="space-y-8 font-mono">
                    <div className="flex border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                      <button type="button" onClick={() => setFormData({...formData, type: 'blog'})} className={`flex-1 py-4 font-black uppercase ${formData.type === 'blog' ? 'bg-black text-white' : 'bg-white text-black'}`}>Text_Entry</button>
                      <button type="button" onClick={() => setFormData({...formData, type: 'art'})} className={`flex-1 py-4 font-black uppercase ${formData.type === 'art' ? 'bg-black text-white' : 'bg-white text-black'}`}>Visual_Entry</button>
                    </div>

                    <div className="space-y-6">
                      <input type="text" placeholder="ENTRY_TITLE_" className={`w-full bg-transparent border-b-4 border-black p-2 text-xl font-black outline-none ${darkMode ? 'text-white border-white' : 'text-black'}`} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                      
                      {formData.type === 'art' && (
                        <input type="text" placeholder="IMAGE_URL_ (HTTPS://...)" className={`w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none ${darkMode ? 'text-white border-white' : 'text-black'}`} value={formData.src} onChange={e => setFormData({...formData, src: e.target.value})} required />
                      )}

                      <input type="text" placeholder="AUDIO_URL_ (OPTIONAL)" className={`w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none ${darkMode ? 'text-white border-white' : 'text-black'}`} value={formData.audioSrc} onChange={e => setFormData({...formData, audioSrc: e.target.value})} />
                      <input type="text" placeholder="METADATA_TAGS_ (#RAW, #ANALOG...)" className={`w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none ${darkMode ? 'text-white border-white' : 'text-black'}`} value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} />
                      <textarea className={`w-full border-4 border-black p-4 h-64 text-xl font-bold outline-none focus:bg-yellow-50 focus:text-black resize-none ${darkMode ? 'bg-black text-white border-white' : 'bg-white text-black'}`} placeholder="BEGIN TRANSMISSION..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} required />

                      <div className="flex items-center gap-4 py-4 border-t-2 border-black/10">
                        <input type="checkbox" id="isTitle" className="w-6 h-6 border-4 border-black accent-black" checked={formData.isTitle} onChange={e => setFormData({...formData, isTitle: e.target.checked})} />
                        <label htmlFor="isTitle" className="text-xs font-black uppercase">Display as Manifesto</label>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-black text-white py-6 font-black text-3xl uppercase italic tracking-tighter hover:bg-yellow-300 hover:text-black transition-all shadow-[10px_10px_0_0_rgba(0,0,0,1)]">PUSH_TO_ARCHIVE_</button>
                  </form>
                </div>

                <div className="hidden lg:block space-y-6">
                  <span className="text-xs font-black uppercase opacity-40 italic tracking-widest">Live_Monitor_</span>
                  <div className={`border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] p-8 ${formData.type === 'blog' ? 'bg-yellow-300' : 'bg-black'} text-black`}>
                    <p className="font-black uppercase tracking-tighter text-lg leading-tight">{formData.title || 'Entry_Preview'}</p>
                    <p className="text-[10px] mt-2 opacity-50">{formData.content.substring(0, 100)}...</p>
                    {formData.audioSrc && <div className="mt-4 bg-white border border-black p-1 text-[8px] font-black uppercase italic">🔊 AUDIO_ATTACHED</div>}
                  </div>
                  <div className={`p-4 border-2 border-black text-[10px] font-black uppercase opacity-50 ${darkMode ? 'border-white' : 'border-black'}`}>
                    <p>{'>'} STATUS: SYSTEM_READY</p>
                    <p>{'>'} NODE: {appId}</p>
                    <p>{'>'} CLOCK: {currentTime.toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE: USER ACCOUNT */}
        {view === 'account' && (
          <div className={`p-4 md:p-12 animate-in fade-in duration-500 ${darkMode ? 'bg-black text-white' : 'bg-[#f0f0f0] text-black'}`}>
            <div className="max-w-[1200px] mx-auto w-full space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <div className={`p-8 border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col items-center text-center ${darkMode ? 'bg-[#111]' : 'bg-white'}`}>
                    {user?.photoURL && <img src={user.photoURL} className="w-24 h-24 md:w-32 md:h-32 grayscale border-4 border-black mb-6 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]" alt="User" />}
                    <span className="text-[10px] font-black uppercase opacity-40 block mb-1 italic">Node_Identity_</span>
                    <h3 className="text-xl font-black uppercase mb-4">{user?.displayName}</h3>
                    <div className="w-full space-y-2 border-t border-black/10 pt-4">
                       <div className="flex justify-between text-[10px] font-bold uppercase">
                          <span>Likes:</span>
                          <span className="text-pink-500">{likedPosts.length}</span>
                       </div>
                       <div className="flex justify-between text-[10px] font-bold uppercase">
                          <span>Status:</span>
                          <span className="text-green-500">Connected</span>
                       </div>
                    </div>
                 </div>

                 <div className="md:col-span-2 space-y-6">
                    <h3 className="text-2xl font-black uppercase italic underline decoration-yellow-300 decoration-8 underline-offset-4">Signal_Collection_</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                       {likedPosts.length === 0 ? (
                         <div className="col-span-full p-10 border-4 border-dashed border-black/20 text-center uppercase font-black opacity-30 italic">No signals collected yet...</div>
                       ) : likedPosts.map(post => (
                         <div key={post.id} onClick={() => setSelectedPost(post)} className="aspect-square border-2 border-black bg-white cursor-pointer group hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all overflow-hidden relative">
                           {post.type === 'art' ? (
                             <img src={post.src} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="art" />
                           ) : (
                             <div className="p-4 flex flex-col justify-center h-full bg-yellow-300">
                               <p className="text-[8px] font-black line-clamp-3 uppercase text-black">{post.content}</p>
                             </div>
                           )}
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                              <span className="text-white font-black text-[10px] uppercase tracking-widest">Open_</span>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE: GRID */}
        {view === 'grid' && (
          <main className="p-4 md:p-12 mb-10 block flex-grow animate-in fade-in duration-700">
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 md:gap-8 max-w-[1700px] mx-auto space-y-4 md:space-y-8">
              {filteredPosts.map((post) => (
                <div key={post.id} onClick={() => setSelectedPost(post)} className={`break-inside-avoid border-2 md:border-4 border-black group cursor-pointer transition-all mb-4 md:mb-8 shadow-[4px_4px_0_0_rgba(0,0,0,1)] md:shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 relative ${post.type === 'art' ? 'bg-black p-0.5' : 'p-4 md:p-8'} ${post.isTitle ? (darkMode ? 'bg-[#222] text-white border-l-[8px]' : 'bg-white border-l-[15px]') : post.type === 'blog' ? 'bg-yellow-300 text-black' : ''}`}>
                  {isAdmin && (
                    <div className="absolute -top-3 -right-3 flex gap-1 z-10">
                      <button onClick={(e) => { e.stopPropagation(); setEditingPostId(post.id); setEditContent(post.content); }} className="bg-blue-500 text-white w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-black transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]">✎</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePost(e, post.id); }} className="bg-red-500 text-white w-7 h-7 border-2 border-black flex items-center justify-center hover:bg-black transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]">✕</button>
                    </div>
                  )}
                  {post.type === 'blog' ? (
                    <div className="space-y-2 text-black">
                      <p className={`font-black uppercase tracking-tighter leading-tight ${post.isTitle ? 'text-lg md:text-3xl italic' : 'text-[9px] md:text-[12px] line-clamp-[10]'}`}>
                        {post.isTitle ? `"${post.content}"` : post.content}
                      </p>
                      <div className="flex justify-between items-end pt-2 text-black">
                         <div className="flex gap-2 items-center">
                           <button onClick={(e) => handleLike(e, post.id)} className={`flex items-center gap-1 text-[8px] md:text-[10px] font-black border border-black px-1 transition-all ${post.likedBy?.includes(user?.uid) ? 'bg-pink-300 shadow-none translate-x-0.5 translate-y-0.5' : 'bg-pink-200 hover:bg-pink-300 shadow-[2px_2px_0_0_rgba(0,0,0,1)]'}`}>
                             <svg className={`w-2 h-2 ${post.likedBy?.includes(user?.uid) ? 'text-red-600' : 'text-red-500'} fill-current`} viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                             {post.likes || 0}
                           </button>
                           {post.audioSrc && <span className="text-[10px]">🔊</span>}
                        </div>
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
      <footer className="w-full px-6 py-8 border-t border-black/10 text-[9px] md:text-[10px] font-mono opacity-40 hover:opacity-100 transition-opacity flex flex-col md:flex-row justify-between items-center gap-4 text-black">
        <div className="flex gap-6 uppercase font-bold tracking-widest">
          <a href="https://instagram.com/gieltemolder" target="_blank" className="hover:underline">Instagram</a>
          <a href="mailto:gielmolder@gmail.com" className="hover:underline">Contact</a>
          <span>Exposure Therapy Archive</span>
        </div>
        <div className="flex items-center gap-6 tabular-nums">
          <div>{currentTime.toLocaleTimeString('nl-NL', { hour12: false })}</div>
          <div className="bg-black text-white px-2 py-1 border border-white/20 flex items-center gap-2">
            <span className="animate-pulse w-1 h-1 bg-yellow-300 rounded-full"></span>
            <span className="font-black uppercase">NODE_01</span>
          </div>
        </div>
      </footer>

      {/* MODAL VIEW */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/98 z-50 flex items-center justify-center p-2 md:p-12 backdrop-blur-2xl animate-in fade-in duration-300" onClick={() => setSelectedPost(null)}>
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 md:border-[10px] border-black p-6 md:p-12 relative shadow-[20px_20px_0_0_rgba(0,0,0,1)] ${darkMode ? 'bg-[#111] text-white shadow-white/5' : 'bg-white text-black'}`} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 border-b-4 md:border-b-8 border-black pb-8 text-black">
              <div className="flex-grow">
                <h2 className={`text-3xl md:text-6xl font-black uppercase italic tracking-tighter underline underline-offset-4 decoration-yellow-300 leading-none mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>{selectedPost.title || 'Entry'}</h2>
                <div className="flex flex-wrap gap-2">
                  {selectedPost.tags?.split(',').map(tag => (
                    <span key={tag} className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5">{tag.trim()}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setSelectedPost(null)} className="bg-black text-white px-6 py-2 font-black border-2 border-black hover:bg-yellow-300 hover:text-black uppercase shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all">Close_</button>
            </div>

            <div className="space-y-12 text-black">
              {selectedPost.type === 'art' && <img src={selectedPost.src} className="w-full h-auto grayscale border-4 border-black" alt="Art" />}
              {selectedPost.audioSrc && (
                <div className="p-4 border-4 border-black bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] space-y-2">
                  <p className="text-[10px] font-black uppercase italic tracking-widest text-black">// ATTACHED_AUDIO_STREAM_</p>
                  <audio controls className="w-full" src={selectedPost.audioSrc}></audio>
                </div>
              )}
              <div className={`text-xl md:text-3xl font-black whitespace-pre-wrap uppercase ${darkMode ? 'text-white' : 'text-black'}`}>{selectedPost.content}</div>

              <div className="mt-20 border-t-8 border-black pt-12 text-black">
                <h3 className={`text-2xl md:text-4xl font-black uppercase italic mb-10 underline decoration-pink-300 underline-offset-8 ${darkMode ? 'text-white' : 'text-black'}`}>Responses_</h3>
                <div className="space-y-6 mb-12">
                  {comments.length === 0 ? <p className="text-xs font-bold opacity-30 italic text-black">No signals yet...</p> : 
                    comments.map(c => (
                      <div key={c.id} className={`p-4 border-4 border-black flex gap-4 ${c.isAdmin ? 'bg-yellow-300 text-black' : (darkMode ? 'bg-[#222]' : 'bg-white text-black')} shadow-[6px_6px_0_0_rgba(0,0,0,1)]`}>
                        {c.userPhoto && <img src={c.userPhoto} className="w-10 h-10 border-2 border-black grayscale" alt="av" />}
                        <div className="flex-grow text-black">
                          <span className="text-[10px] font-black uppercase opacity-50 block mb-1">{c.userName}</span>
                          <p className={`text-sm md:text-xl font-bold uppercase ${darkMode ? 'text-white' : 'text-black'}`}>{c.text}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
                {user && (
                  <form onSubmit={handleAddComment} className="flex flex-col gap-4">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="ENTER RESPONSE..." className="w-full border-4 border-black p-4 text-lg md:text-2xl font-bold focus:bg-pink-50 outline-none shadow-[8px_8px_0_0_rgba(0,0,0,1)] text-black" />
                    <button type="submit" className="bg-black text-white py-6 font-black uppercase text-xl md:text-3xl italic tracking-tighter hover:bg-pink-300 hover:text-black transition-all shadow-[10px_10px_0_0_rgba(0,0,0,1)]">Push_Response_</button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}