import { useState, useEffect } from 'react'
import { app, db } from './firebase'; 
import { 
  getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy 
} from "firebase/firestore";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from "firebase/auth";

const auth = getAuth(app);
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

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const haalPostsOp = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      let opgehaaldeData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (opgehaaldeData.length === 0) {
        const simpleSnapshot = await getDocs(collection(db, "posts"));
        opgehaaldeData = simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      setPosts(opgehaaldeData);
    } catch (err) {
      console.error("Database error:", err);
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
      await addDoc(collection(db, "posts"), { ...formData, timestamp: serverTimestamp() });
      setFormData({ type: 'blog', content: '', title: '', src: '', isTitle: false, sourceInfo: '', date: new Date().toLocaleDateString('nl-NL') });
      setView('grid');
    } catch (err) {
      alert("Fout bij opslaan: " + err.message);
    }
  };

  // CSS Injectie om scrollbars te verstoppen
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      ::-webkit-scrollbar { display: none; }
      body { 
        -ms-overflow-style: none; 
        scrollbar-width: none; 
        overflow-y: scroll; 
        background-color: #f0f0f0;
      }
    `;
    document.head.appendChild(style);
  }, []);

  // Check of de huidige user de admin is
  const isAdmin = user && user.email === "gieltemolder@gmail.com";

  return (
    <div className="min-h-screen text-[#1a1a1a] font-mono selection:bg-black selection:text-white pb-20">
      
      {/* HEADER: Alleen tonen in Grid view */}
      {view === 'grid' && (
        <header className="p-4 md:p-8 border-b-4 border-black flex justify-between items-center bg-white sticky top-0 z-40 shadow-[0_4px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter italic leading-none hover:tracking-normal transition-all cursor-default">
                The Archive
              </h1>
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Exposure Therapy // Connected</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className="bg-yellow-400 border-4 border-black px-6 py-2 text-xs font-black uppercase shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                + ADD_ENTRY
              </button>
            )}
            {!user ? (
              <button 
                onClick={login} 
                className="border-4 border-black px-6 py-2 text-xs font-black uppercase bg-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                LOGIN_
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-black text-white p-2 pr-4 border-4 border-black shadow-[6px_6px_0_0_rgba(255,235,59,1)]">
                <img src={user.photoURL} className="w-8 h-8 grayscale border-2 border-white" alt="user" />
                <button onClick={logout} className="text-[10px] font-black underline uppercase hover:text-yellow-400">Logout_</button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* ADMIN VIEW: Geen header, pure focus */}
      {view === 'admin' && (
        <div className="min-h-screen bg-[#f0f0f0] flex flex-col p-6 md:p-20 animate-in slide-in-from-bottom duration-500 items-center justify-center">
          <div className="max-w-2xl mx-auto w-full space-y-12 bg-white border-8 border-black p-10 shadow-[20px_20px_0_0_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center border-b-4 border-black pb-6">
              <h2 className="text-4xl font-black italic tracking-tighter uppercase underline decoration-yellow-400 underline-offset-8">Terminal_Input</h2>
              <button 
                onClick={() => setView('grid')} 
                className="text-xs font-black bg-black text-white px-6 py-2 hover:bg-yellow-400 hover:text-black transition-all border-2 border-black"
              >
                ABORT_
              </button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-10">
              {/* Type Toggle */}
              <div className="flex border-4 border-black overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'blog'})}
                  className={`flex-1 py-4 font-black uppercase text-xs transition-colors ${formData.type === 'blog' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-100'}`}
                >
                  Log_Text
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'art'})}
                  className={`flex-1 py-4 font-black uppercase text-xs transition-colors ${formData.type === 'art' ? 'bg-black text-white' : 'bg-white hover:bg-yellow-100'}`}
                >
                  Log_Visual
                </button>
              </div>

              <div className="space-y-6">
                {formData.type === 'art' ? (
                  <div className="grid grid-cols-1 gap-6">
                    <input 
                      type="text" 
                      placeholder="RECORD_NAME" 
                      className="w-full bg-transparent border-b-4 border-black p-4 text-xl font-black outline-none placeholder:opacity-20 uppercase focus:border-yellow-400"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="FILE_PATH (/art/...) " 
                      className="w-full bg-transparent border-b-4 border-black p-4 text-xl font-black outline-none placeholder:opacity-20 focus:border-yellow-400"
                      value={formData.src}
                      onChange={e => setFormData({...formData, src: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <label className="flex items-center gap-4 cursor-pointer p-4 border-4 border-black font-black uppercase text-xs bg-gray-50 hover:bg-yellow-400 transition-colors shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-none">
                      <input 
                        type="checkbox" 
                        checked={formData.isTitle} 
                        onChange={e => setFormData({...formData, isTitle: e.target.checked})}
                        className="w-6 h-6 accent-black"
                      />
                      <span>Manifesto Mode (Quote Style)</span>
                    </label>
                    {formData.isTitle && (
                      <input 
                        type="text" 
                        placeholder="SOURCE_REFERENCE (bijv. Nietzsche, 1882)" 
                        className="w-full bg-transparent border-b-2 border-black p-2 text-xs font-bold outline-none italic"
                        value={formData.sourceInfo}
                        onChange={e => setFormData({...formData, sourceInfo: e.target.value})}
                      />
                    )}
                  </div>
                )}
                
                <textarea 
                  className="w-full bg-white border-4 border-black p-6 h-80 text-lg font-bold shadow-[10px_10px_0_0_rgba(0,0,0,1)] outline-none transition-all placeholder:opacity-20 focus:bg-yellow-50"
                  placeholder="START_RAW_DATA_ENTRY..."
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white py-6 font-black text-3xl uppercase italic tracking-tighter hover:bg-yellow-400 hover:text-black transition-all shadow-[15px_15px_0_0_rgba(255,235,59,1)] active:translate-y-2 active:shadow-none"
              >
                PUSH_TO_ARCHIVE_
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GRID VIEW: Masonry / Fluid Puzzel */}
      {view === 'grid' && (
        <main className="p-4 md:p-10 mt-4">
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 max-w-[1600px] mx-auto space-y-6">
            {posts.map((post) => (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className={`
                  break-inside-avoid border-4 border-black group cursor-pointer transition-all mb-6
                  shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1
                  ${post.type === 'art' ? 'bg-black' : 'p-6'}
                  ${post.isTitle ? 'bg-white italic border-l-[12px]' : post.type === 'blog' ? 'bg-yellow-400 hover:bg-yellow-500' : ''}
                `}
              >
                {post.type === 'blog' && (
                  <div className="space-y-4">
                    {!post.isTitle && (
                      <div className="flex justify-between items-center mb-2 border-b-2 border-black/10 pb-2">
                        <span className="text-[8px] font-black uppercase tracking-widest">{post.date}</span>
                        <div className="w-2 h-2 bg-black rounded-full"></div>
                      </div>
                    )}
                    <p className={`font-black tracking-tighter leading-tight uppercase ${post.isTitle ? 'text-xl md:text-2xl py-2' : 'text-[11px] line-clamp-[15]'}`}>
                      {post.isTitle ? `"${post.content}"` : post.content}
                    </p>
                    {!post.isTitle && <div className="text-[8px] font-black mt-4 opacity-40 text-right uppercase italic">Entry_ID_{post.id.slice(0,4)}</div>}
                  </div>
                )}

                {post.type === 'art' && (
                  <div className="relative overflow-hidden p-1">
                    <img 
                      src={post.src} 
                      alt={post.title} 
                      className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-1000 block border-2 border-black" 
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=DATA_MISSING'; }}
                    />
                    <div className="absolute top-4 left-4 bg-white border-2 border-black px-2 py-1 text-[8px] font-black uppercase italic shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                      {post.title}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* MODAL: Het Leesvenster */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 md:p-12 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-8 border-black p-8 md:p-16 relative shadow-[25px_25px_0_0_rgba(255,235,59,1)]"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPost(null)} 
              className="absolute top-6 right-6 font-black text-xs bg-black text-white px-5 py-2 hover:bg-yellow-400 hover:text-black transition-colors border-2 border-black"
            >
              EXIT_LOG_
            </button>
            
            <header className="mb-12 border-b-8 border-black pb-8">
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter underline underline-offset-[12px] decoration-yellow-400">
                {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Archive_Entry')}
              </h2>
              <div className="flex justify-between items-center mt-10">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">{selectedPost.date} // ID_{selectedPost.id}</p>
                {selectedPost.sourceInfo && <span className="text-[10px] font-black bg-black text-white px-3 py-1 italic tracking-widest">SOURCE: {selectedPost.sourceInfo}</span>}
              </div>
            </header>

            <div className="space-y-16">
              {selectedPost.type === 'art' && (
                <div className="border-8 border-black p-2 bg-black shadow-[15px_15px_0_0_rgba(0,0,0,1)]">
                  <img src={selectedPost.src} className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000" alt="Art Detail" />
                </div>
              )}
              <div className="text-2xl md:text-4xl leading-[1.1] font-black text-black text-justify whitespace-pre-wrap tracking-tighter uppercase selection:bg-yellow-400">
                {selectedPost.content}
              </div>
            </div>

            <footer className="mt-24 pt-8 border-t-4 border-black flex justify-between items-center text-[9px] font-black uppercase opacity-40 italic">
              <span>Verified_Database_Entry_Archive_Node</span>
              <span>Exposure Therapy // Giel te Molder // 2026</span>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}