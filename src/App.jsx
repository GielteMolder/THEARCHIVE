import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy 
} from "firebase/firestore";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from "firebase/auth";

// --- FIREBASE CONFIGURATIE ---
// Alles op één plek zodat we geen import-fouten meer krijgen
const firebaseConfig = {
  apiKey: "AIzaSyCQyGS486-RohBd3FHBQENIhH0PSkInwBs",
  authDomain: "expothearchive.firebaseapp.com",
  projectId: "expothearchive",
  storageBucket: "expothearchive.firebasestorage.app",
  messagingSenderId: "18895439101",
  appId: "1:18895439101:web:c17f8c3e565147f7396a94"
};

// Initialisatie
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [view, setView] = useState('grid'); 
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    type: 'blog',
    content: '',
    title: '',
    src: '',
    isTitle: false,
    sourceInfo: '',
    date: new Date().toLocaleDateString('nl-NL'),
  });

  // Authenticatie listener: kijkt of Giel (of iemand anders) is ingelogd
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Inloggen mislukt:", error);
    }
  };

  const logout = () => signOut(auth);

  const haalPostsOp = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      let opgehaaldeData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fallback als er geen timestamps zijn (voor handmatige entries)
      if (opgehaaldeData.length === 0) {
        const simpleSnapshot = await getDocs(collection(db, "posts"));
        opgehaaldeData = simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      setPosts(opgehaaldeData);
    } catch (err) {
      console.error("Database fout:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    haalPostsOp(); 
  }, [view]);

  const handleSavePost = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "posts"), { 
        ...formData, 
        timestamp: serverTimestamp() 
      });
      setFormData({ 
        type: 'blog', 
        content: '', 
        title: '', 
        src: '', 
        isTitle: false, 
        sourceInfo: '', 
        date: new Date().toLocaleDateString('nl-NL') 
      });
      setView('grid');
    } catch (err) {
      console.error("Opslaan mislukt:", err);
    }
  };

  // Verberg scrollbars en zet de brute basisstijl
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      ::-webkit-scrollbar { display: none; }
      body { 
        -ms-overflow-style: none; 
        scrollbar-width: none; 
        overflow-y: scroll; 
        background-color: #f0f0f0;
        margin: 0;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Admin check (zorg dat je ingelogd bent met dit mailadres)
  const isAdmin = user && user.email === "gieltemolder@gmail.com";

  return (
    <div className="min-h-screen text-[#1a1a1a] font-mono selection:bg-black selection:text-white pb-20">
      
      {/* HEADER: Verdwijnt in Admin-invoer voor maximale focus */}
      {view === 'grid' && (
        <header className="p-4 md:p-10 border-b-8 border-black flex justify-between items-center bg-white sticky top-0 z-40 shadow-[0_8px_0_0_rgba(0,0,0,1)]">
          <div className="group cursor-default">
            <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter italic leading-none group-hover:tracking-normal transition-all">
              The Archive
            </h1>
            <p className="text-[10px] md:text-xs font-bold bg-black text-white px-2 py-1 mt-2 inline-block uppercase tracking-widest">
              Exposure Therapy // Giel te Molder
            </p>
          </div>
          
          <div className="flex gap-4">
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className="bg-yellow-400 border-4 border-black px-6 py-3 text-xs font-black uppercase shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                + NEW_ENTRY
              </button>
            )}
            {!user ? (
              <button 
                onClick={login} 
                className="border-4 border-black px-6 py-3 text-xs font-black uppercase bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                LOGIN_
              </button>
            ) : (
              <div className="flex items-center gap-4 bg-black text-white p-2 pr-6 border-4 border-black shadow-[8px_8px_0_0_rgba(255,235,59,1)]">
                {user.photoURL && <img src={user.photoURL} className="w-10 h-10 grayscale border-2 border-white" alt="user" />}
                <div className="text-left">
                  <p className="text-[8px] font-black opacity-50 uppercase">Session_Active</p>
                  <button onClick={logout} className="text-[10px] font-black underline uppercase hover:text-yellow-400 block">Logout_</button>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* ADMIN VIEW: Pure terminal-modus voor invoer */}
      {view === 'admin' && (
        <div className="min-h-screen bg-[#f0f0f0] flex flex-col p-6 md:p-20 items-center justify-center animate-in fade-in slide-in-from-bottom duration-700">
          <div className="max-w-3xl mx-auto w-full space-y-12 bg-white border-[10px] border-black p-10 shadow-[25px_25px_0_0_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center border-b-8 border-black pb-8">
              <h2 className="text-5xl font-black italic tracking-tighter uppercase underline decoration-yellow-400 underline-offset-[12px]">System_Input</h2>
              <button 
                onClick={() => setView('grid')} 
                className="text-xs font-black bg-black text-white px-8 py-4 hover:bg-yellow-400 hover:text-black transition-all border-4 border-black"
              >
                ABORT_MISSION
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-12">
              {/* Type Switcher */}
              <div className="flex border-4 border-black overflow-hidden shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'blog'})}
                  className={`flex-1 py-6 font-black uppercase text-sm transition-colors ${formData.type === 'blog' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-100'}`}
                >
                  TEXT_DATA
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'art'})}
                  className={`flex-1 py-6 font-black uppercase text-sm transition-colors ${formData.type === 'art' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-100'}`}
                >
                  VISUAL_DATA
                </button>
              </div>

              <div className="space-y-8">
                {formData.type === 'art' ? (
                  <div className="grid grid-cols-1 gap-8">
                    <input 
                      type="text" 
                      placeholder="FILE_IDENTIFIER (Bijv. DISTORTION_001)" 
                      className="w-full bg-transparent border-b-4 border-black p-4 text-2xl font-black outline-none placeholder:opacity-20 uppercase focus:border-yellow-400"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="LOCAL_PATH (/art/bestandsnaam.jpg)" 
                      className="w-full bg-transparent border-b-4 border-black p-4 text-2xl font-black outline-none placeholder:opacity-20 focus:border-yellow-400"
                      value={formData.src}
                      onChange={e => setFormData({...formData, src: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <label className="flex items-center gap-6 cursor-pointer p-6 border-4 border-black font-black uppercase text-sm bg-gray-50 hover:bg-yellow-400 transition-colors shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none">
                      <input 
                        type="checkbox" 
                        checked={formData.isTitle} 
                        onChange={e => setFormData({...formData, isTitle: e.target.checked})}
                        className="w-8 h-8 accent-black"
                      />
                      <span>Structural Manifesto Mode (Grote Quotes)</span>
                    </label>
                    {formData.isTitle && (
                      <input 
                        type="text" 
                        placeholder="REFERENCE_SOURCE (Wie of wat is de bron?)" 
                        className="w-full bg-transparent border-b-4 border-black p-4 text-xl font-black outline-none italic uppercase placeholder:opacity-20"
                        value={formData.sourceInfo}
                        onChange={e => setFormData({...formData, sourceInfo: e.target.value})}
                      />
                    )}
                  </div>
                )}
                
                <textarea 
                  className="w-full bg-white border-4 border-black p-8 h-96 text-xl font-bold shadow-[12px_12px_0_0_rgba(0,0,0,1)] outline-none transition-all placeholder:opacity-20 focus:bg-yellow-50 resize-none"
                  placeholder="INPUT_RAW_DATA_HERE..."
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white py-8 font-black text-4xl uppercase italic tracking-tighter hover:bg-yellow-400 hover:text-black transition-all shadow-[20px_20px_0_0_rgba(255,235,59,1)] active:translate-y-2 active:shadow-none"
              >
                PUSH_TO_CLOUD_
              </button>
            </form>
          </div>
        </div>
      )}

      {/* HET GRID: Masonry / Puzzel Layout */}
      {view === 'grid' && (
        <main className="p-4 md:p-12 mt-8">
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-8 max-w-[1700px] mx-auto space-y-8">
            {posts.map((post) => (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className={`
                  break-inside-avoid border-4 border-black group cursor-pointer transition-all mb-8
                  shadow-[10px_10px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1
                  ${post.type === 'art' ? 'bg-black p-1' : 'p-8'}
                  ${post.isTitle ? 'bg-white italic border-l-[15px]' : post.type === 'blog' ? 'bg-yellow-400 hover:bg-yellow-500' : ''}
                `}
              >
                {post.type === 'blog' && (
                  <div className="space-y-4">
                    {!post.isTitle && (
                      <div className="flex justify-between items-center mb-4 border-b-4 border-black/10 pb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest">{post.date}</span>
                        <div className="w-3 h-3 bg-black rounded-full animate-pulse"></div>
                      </div>
                    )}
                    <p className={`font-black tracking-tighter leading-tight uppercase ${post.isTitle ? 'text-2xl md:text-3xl py-4' : 'text-[12px] line-clamp-[12]'}`}>
                      {post.isTitle ? `"${post.content}"` : post.content}
                    </p>
                    {!post.isTitle && <div className="text-[10px] font-black mt-6 opacity-40 text-right uppercase italic underline underline-offset-4">READ_LOG_</div>}
                  </div>
                )}

                {post.type === 'art' && (
                  <div className="relative overflow-hidden">
                    <img 
                      src={post.src} 
                      alt={post.title} 
                      className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700 block border-2 border-black" 
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=DATA_MISSING'; }}
                    />
                    <div className="absolute top-4 left-4 bg-white border-4 border-black px-3 py-1 text-[10px] font-black uppercase italic shadow-[6px_6px_0_0_rgba(0,0,0,1)]">
                      {post.title}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* DETAIL VENSTER (MODAL) */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-12 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-[10px] border-black p-10 md:p-20 relative shadow-[35px_35px_0_0_rgba(255,235,59,1)]"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPost(null)} 
              className="absolute top-8 right-8 font-black text-xs bg-black text-white px-8 py-4 hover:bg-yellow-400 hover:text-black transition-colors border-4 border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:shadow-none"
            >
              EXIT_ARCHIVE_
            </button>
            
            <header className="mb-16 border-b-[12px] border-black pb-12">
              <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter underline underline-offset-[20px] decoration-yellow-400 leading-none">
                {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Archive_Entry')}
              </h2>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-12 gap-6">
                <p className="text-xs font-black opacity-40 uppercase tracking-[0.4em]">{selectedPost.date} // NODE_ID_{selectedPost.id.slice(0,8)}</p>
                {selectedPost.sourceInfo && <span className="text-xs font-black bg-black text-white px-6 py-2 italic tracking-[0.2em] shadow-[8px_8px_0_0_rgba(255,235,59,1)] uppercase">SRC: {selectedPost.sourceInfo}</span>}
              </div>
            </header>

            <div className="space-y-20">
              {selectedPost.type === 'art' && (
                <div className="border-[12px] border-black p-3 bg-black shadow-[20px_20px_0_0_rgba(0,0,0,1)]">
                  <img src={selectedPost.src} className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000 border-4 border-white" alt="Art Detail" />
                </div>
              )}
              <div className="text-3xl md:text-5xl leading-[1.1] font-black text-black text-justify whitespace-pre-wrap tracking-tighter uppercase selection:bg-yellow-400">
                {selectedPost.content}
              </div>
            </div>

            <footer className="mt-32 pt-12 border-t-8 border-black flex flex-col md:flex-row justify-between items-center text-[11px] font-black uppercase opacity-40 italic gap-4">
              <span>Verified_Database_Node_Access</span>
              <span>Exposure Therapy // Giel te Molder // 2026</span>
              <span>Status: Synchronized</span>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}