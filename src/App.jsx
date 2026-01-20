import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, increment 
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

  // NIEUWE STATE VOOR FUNCTIONALITEIT
  const [activeFilter, setActiveFilter] = useState('all'); // all, blog, art
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    type: 'blog',
    content: '',
    title: '',
    src: '',
    isTitle: false,
    sourceInfo: '',
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

  const logout = () => signOut(auth);

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

  // Filteren en Zoeken (in-memory voor snelheid)
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesFilter = activeFilter === 'all' || post.type === activeFilter;
      const matchesSearch = 
        post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.sourceInfo?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [posts, activeFilter, searchQuery]);

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
        likes: 0
      });
      setFormData({ type: 'blog', content: '', title: '', src: '', isTitle: false, sourceInfo: '', date: new Date().toLocaleDateString('nl-NL') });
      setView('grid');
    } catch (err) { console.error(err); }
  };

  const handleDeletePost = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Archiefstuk definitief vernietigen?")) return;
    try { await deleteDoc(doc(db, "posts", id)); } catch (err) { console.error(err); }
  };

  const handleLike = async (e, id) => {
    e.stopPropagation();
    try {
      const postRef = doc(db, "posts", id);
      await updateDoc(postRef, { likes: increment(1) });
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
        isAdmin: user.email.toLowerCase() === "gielmolder@gmail.com"
      });
      setNewComment("");
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      ::-webkit-scrollbar { display: none; }
      body { 
        -ms-overflow-style: none; scrollbar-width: none; 
        overflow-y: scroll; background-color: #f0f0f0; margin: 0;
      }
      .fade-in-entry {
        animation: fadeIn 0.8s ease-out forwards;
        opacity: 0;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const isAdmin = user && user.email && user.email.toLowerCase() === "gielmolder@gmail.com";

  return (
    <div className="min-h-screen text-[#1a1a1a] font-mono selection:bg-black selection:text-white flex flex-col">
      
      {/* HEADER */}
      {view === 'grid' && (
        <header className="p-4 md:p-10 border-b-8 border-black flex flex-col md:flex-row justify-between items-start md:items-center bg-white sticky top-0 z-40 shadow-[0_4px_0_0_rgba(0,0,0,1)] gap-6">
          <div className="group cursor-default pr-4">
            <h1 className="text-3xl md:text-6xl font-bold font-mono uppercase tracking-tighter italic leading-none break-words max-w-[200px] md:max-w-none">
              The Archive
            </h1>
            <p className="text-[8px] md:text-xs font-bold font-mono bg-black text-white px-2 py-1 mt-2 inline-block uppercase tracking-widest">
              Exposure Therapy // Giel te Molder
            </p>
          </div>

          {/* FILTERS & SEARCH */}
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex border-4 border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <input 
                type="text" 
                placeholder="SEARCH_ARCHIVE..." 
                className="bg-transparent p-2 text-xs font-bold outline-none flex-grow md:w-64 uppercase"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="bg-black text-white p-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>
            
            <div className="flex gap-2 text-[10px] font-black uppercase">
              {['all', 'blog', 'art'].map(f => (
                <button 
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`border-2 border-black px-3 py-1 transition-colors ${activeFilter === f ? 'bg-black text-white' : 'bg-white hover:bg-yellow-300'}`}
                >
                  {f === 'all' ? 'Everything' : f === 'blog' ? 'Text' : 'Visual'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-end md:items-center self-end md:self-auto">
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className="bg-yellow-300 border-2 md:border-4 border-black px-3 md:px-6 py-1 md:py-3 text-[10px] md:text-xs font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                + ADD_ENTRY
              </button>
            )}
            {!user ? (
              <button onClick={login} className="border-2 md:border-4 border-black px-3 md:px-6 py-1 md:py-3 text-[10px] md:text-xs font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-yellow-300 transition-colors">LOGIN_</button>
            ) : (
              <div className="flex items-center gap-2 md:gap-4 bg-black text-white p-1 md:p-2 pr-3 md:pr-6 border-2 md:border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]">
                {user.photoURL && <img src={user.photoURL} className="w-6 h-6 md:w-10 md:h-10 grayscale border border-white" alt="u" />}
                <button onClick={logout} className="text-[8px] md:text-[10px] font-black underline uppercase hover:text-yellow-300">Out_</button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-grow">
        {view === 'admin' && (
          <div className="min-h-[80vh] bg-[#f0f0f0] flex flex-col p-4 md:p-20 items-center justify-center animate-in fade-in slide-in-from-bottom duration-500">
            <div className="max-w-3xl mx-auto w-full space-y-8 bg-white border-4 md:border-[10px] border-black p-6 md:p-10 shadow-[10px_10px_0_0_rgba(0,0,0,1)] md:shadow-[25px_25px_0_0_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center border-b-4 border-black pb-4">
                <h2 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase underline decoration-yellow-300 underline-offset-4 font-mono">Input_Terminal</h2>
                <button onClick={() => setView('grid')} className="text-[10px] font-black bg-black text-white px-4 py-2 hover:bg-yellow-300 hover:text-black transition-all border-2 border-black">X</button>
              </div>

              <form onSubmit={handleSavePost} className="space-y-6 md:space-y-12">
                <div className="flex border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                  <button type="button" onClick={() => setFormData({...formData, type: 'blog'})} className={`flex-1 py-3 md:py-6 font-black uppercase text-[10px] md:text-sm ${formData.type === 'blog' ? 'bg-black text-white' : 'bg-white'}`}>Tekst</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'art'})} className={`flex-1 py-3 md:py-6 font-black uppercase text-[10px] md:text-sm ${formData.type === 'art' ? 'bg-black text-white' : 'bg-white'}`}>Beeld</button>
                </div>
                <div className="space-y-4">
                  {formData.type === 'art' ? (
                    <div className="grid grid-cols-1 gap-4">
                      <input type="text" placeholder="NAAM_VAN_WERK" className="w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none font-mono" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                      <input type="text" placeholder="PAD (/art/filename.jpg)" className="w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none font-mono" value={formData.src} onChange={e => setFormData({...formData, src: e.target.value})} />
                    </div>
                  ) : (
                    <label className="flex items-center gap-4 cursor-pointer p-4 border-4 border-black font-black uppercase text-[10px] bg-gray-50 shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono">
                      <input type="checkbox" checked={formData.isTitle} onChange={e => setFormData({...formData, isTitle: e.target.checked})} className="w-6 h-6 accent-black" />
                      <span>Manifesto Modus</span>
                    </label>
                  )}
                  <textarea className="w-full bg-white border-4 border-black p-4 h-64 md:h-96 text-lg font-bold outline-none focus:bg-yellow-50 resize-none font-mono" placeholder="RAW_DATA_ENTRY..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-black text-white py-6 font-black text-2xl md:text-4xl uppercase italic tracking-tighter hover:bg-yellow-300 hover:text-black transition-all shadow-[10px_10px_0_0_rgba(0,0,0,1)] font-mono">PUSH_TO_CLOUD_</button>
              </form>
            </div>
          </div>
        )}

        {view === 'grid' && (
          <main className="p-4 md:p-12 mb-10">
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 md:gap-8 max-w-[1700px] mx-auto space-y-4 md:space-y-8">
              {filteredPosts.map((post) => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className={`
                    break-inside-avoid border-2 md:border-4 border-black group cursor-pointer transition-all mb-4 md:mb-8 fade-in-entry
                    shadow-[4px_4px_0_0_rgba(0,0,0,1)] md:shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 relative
                    ${post.type === 'art' ? 'bg-black p-0.5' : 'p-4 md:p-8'}
                    ${post.isTitle ? 'bg-white italic border-l-[8px] md:border-l-[15px]' : post.type === 'blog' ? 'bg-yellow-300' : ''}
                  `}
                >
                  {/* ADMIN DELETE BUTTON */}
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleDeletePost(e, post.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 border-2 border-black z-10 flex items-center justify-center hover:bg-black transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  )}

                  {post.type === 'blog' && (
                    <div className="space-y-2 md:space-y-4">
                      <p className={`font-black tracking-tighter leading-tight uppercase ${post.isTitle ? 'text-lg md:text-3xl' : 'text-[9px] md:text-[12px] line-clamp-[10]'} font-mono`}>
                        {post.isTitle ? `"${post.content}"` : post.content}
                      </p>
                      <div className="flex justify-between items-end">
                        <button 
                          onClick={(e) => handleLike(e, post.id)}
                          className="flex items-center gap-1 text-[8px] md:text-[10px] font-black border border-black/20 px-1 hover:bg-white transition-colors"
                        >
                          <svg className="w-2 h-2 text-red-500 fill-current" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                          {post.likes || 0}
                        </button>
                        <div className="text-[7px] md:text-[10px] font-black opacity-40 text-right uppercase italic underline underline-offset-4 font-mono">{post.date}</div>
                      </div>
                    </div>
                  )}

                  {post.type === 'art' && (
                    <div className="relative">
                      <img src={post.src} alt={post.title} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700 block" onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=DATA_MISSING'; }} />
                      <div className="absolute top-2 left-2 bg-white border-2 border-black px-2 py-0.5 text-[7px] md:text-[10px] font-black uppercase italic shadow-[3px_3px_0_0_rgba(0,0,0,1)] font-mono">
                        {post.title}
                      </div>
                      <button 
                        onClick={(e) => handleLike(e, post.id)}
                        className="absolute bottom-2 right-2 bg-white border-2 border-black px-1 flex items-center gap-1 text-[8px] font-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                      >
                        <svg className="w-2 h-2 text-red-500 fill-current" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
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
        <footer className="w-full px-6 py-4 flex flex-col md:flex-row justify-between items-center opacity-40 hover:opacity-100 transition-opacity duration-500 border-t border-black/10 text-[9px] md:text-[10px] gap-4 font-mono">
          <div className="flex gap-6 uppercase font-bold tracking-widest">
            <a href="https://instagram.com/gieltemolder" target="_blank" className="hover:underline">Instagram</a>
            <a href="mailto:gielmolder@gmail.com" className="hover:underline">Contact</a>
            <span>Exposure Therapy Archive</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="font-mono tabular-nums tracking-tighter">
              {currentTime.toLocaleTimeString('nl-NL', { hour12: false })}
            </div>
            <div className="bg-black text-white px-2 py-1 flex items-center gap-2">
              <span className="animate-pulse w-1 h-1 bg-yellow-300 rounded-full"></span>
              <span className="font-black uppercase tracking-tighter">NODE_01</span>
            </div>
          </div>
        </footer>
      )}

      {/* MODAL */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 md:p-12 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedPost(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-4 md:border-[8px] border-black p-5 md:p-10 relative shadow-[10px_10px_0_0_rgba(0,0,0,1)] md:shadow-[20px_20px_0_0_rgba(20,20,20,1)] font-mono" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-3 mb-6 md:mb-10 border-b-4 md:border-b-8 border-black pb-4 md:pb-8">
              <h2 className="text-2xl md:text-5xl font-black uppercase italic tracking-tighter underline underline-offset-4 decoration-yellow-300 leading-tight font-mono">
                {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Entry')}
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleLike(null, selectedPost.id)}
                  className="bg-white text-black px-4 py-2 border-2 md:border-4 border-black font-black hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                  {selectedPost.likes || 0}
                </button>
                <button onClick={() => setSelectedPost(null)} className="bg-black text-white px-5 py-2 md:px-8 md:py-3 font-black text-xs border-2 md:border-4 border-black hover:bg-yellow-300 hover:text-black transition-colors font-mono">EXIT_</button>
              </div>
            </div>
            <div className="space-y-8 md:space-y-12">
              {selectedPost.type === 'art' && (
                <div className="border-4 md:border-8 border-black p-1 bg-black">
                  <img src={selectedPost.src} className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000 border-2 md:border-4 border-white" alt="Art" />
                </div>
              )}
              <div className="text-lg md:text-2xl leading-snug font-black text-black text-justify whitespace-pre-wrap tracking-tighter uppercase selection:bg-yellow-300 font-mono">
                {selectedPost.content}
              </div>
              <div className="mt-12 md:mt-20 border-t-4 md:border-t-8 border-black pt-6 md:pt-10">
                <h3 className="text-lg md:text-3xl font-black uppercase italic mb-6 underline font-mono">Responses_</h3>
                <div className="space-y-3 md:space-y-6 mb-8 font-mono">
                  {comments.length === 0 ? <p className="text-[10px] md:text-xs font-bold opacity-30 italic">Nog geen reacties...</p> : 
                    comments.map(c => (
                      <div key={c.id} className={`p-3 border-2 border-black flex gap-3 ${c.isAdmin ? 'bg-yellow-300' : 'bg-white'} shadow-[3px_3px_0_0_rgba(0,0,0,1)]`}>
                        {c.userPhoto && <img src={c.userPhoto} className="w-7 h-7 md:w-10 md:h-10 border-2 border-black grayscale" alt="av" />}
                        <div>
                          <p className="text-[7px] md:text-[9px] font-black uppercase opacity-50 mb-1">{c.userName} // {c.isAdmin ? 'ADMIN' : 'GEBRUIKER'}</p>
                          <p className="text-xs md:text-lg font-bold tracking-tight leading-tight">{c.text}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
                {user ? (
                  <form onSubmit={handleAddComment} className="flex flex-col gap-3">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Schrijf je reactie..." className="w-full border-4 border-black p-3 text-xs md:text-lg font-bold focus:bg-yellow-50 outline-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] font-mono" />
                    <button type="submit" className="bg-black text-white py-3 md:py-4 font-black uppercase text-xs md:text-lg hover:bg-yellow-300 hover:text-black transition-all shadow-[6px_6px_0_0_rgba(0,0,0,1)] font-mono">SEND_ENTRY</button>
                  </form>
                ) : (
                  <button onClick={login} className="w-full border-4 border-dashed border-black p-4 md:p-8 text-[10px] md:text-lg font-black uppercase hover:bg-yellow-300 transition-colors font-mono">LOGIN_OM_TE_REAGEREN_</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}