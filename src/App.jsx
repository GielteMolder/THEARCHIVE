import { useState, useEffect } from 'react'
import { db } from './firebase'; 
import { 
  getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy 
} from "firebase/firestore";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from "firebase/auth";

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
    sourceInfo: '', // Nieuw veld voor bronvermelding bij manifestos
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
      setPosts(opgehaaldeData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { haalPostsOp(); }, [view]);

  const handleSavePost = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "posts"), { ...formData, timestamp: serverTimestamp() });
      setFormData({ type: 'blog', content: '', title: '', src: '', isTitle: false, sourceInfo: '', date: new Date().toLocaleDateString('nl-NL') });
      setView('grid');
    } catch (err) {
      alert(err.message);
    }
  };

  // CSS Injectie om scrollbars te verstoppen
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      ::-webkit-scrollbar { display: none; }
      body { -ms-overflow-style: none; scrollbar-width: none; overflow-y: scroll; }
    `;
    document.head.appendChild(style);
  }, []);

  // Check of de huidige user de admin is (jouw email)
  const isAdmin = user && user.email === "gieltemolder@gmail.com"; // VERVANG DIT DOOR JOUW EMAIL

  return (
    <div className="min-h-screen bg-[#f0f0f0] text-[#1a1a1a] font-mono selection:bg-black selection:text-white pb-20">
      
      {/* HEADER: Alleen in Grid view */}
      {view === 'grid' && (
        <header className="p-4 md:p-6 border-b-4 border-black flex justify-between items-center bg-white sticky top-0 z-40 shadow-[0_4px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic leading-none">The Archive</h1>
              <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest mt-1">Exposure Therapy // DB_V3</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className="bg-yellow-300 border-2 border-black px-3 py-1 text-[10px] font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                + Add
              </button>
            )}
            {!user ? (
              <button onClick={login} className="border-2 border-black px-3 py-1 text-[10px] font-black uppercase hover:bg-black hover:text-white transition-all">Login</button>
            ) : (
              <div className="flex items-center gap-2">
                <img src={user.photoURL} className="w-6 h-6 border border-black grayscale" alt="user" />
                <button onClick={logout} className="text-[8px] font-black underline uppercase">Out_</button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* ADMIN VIEW */}
      {view === 'admin' && (
        <div className="min-h-screen bg-white flex flex-col p-6 md:p-10 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-2xl mx-auto w-full space-y-12 mt-10">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-black italic underline tracking-tighter uppercase">Entry_Terminal</h2>
              <button onClick={() => setView('grid')} className="text-xs font-black bg-black text-white px-4 py-2 hover:bg-yellow-300 hover:text-black transition-colors">X CLOSE</button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-10">
              <div className="flex border-4 border-black">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'blog'})}
                  className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-colors ${formData.type === 'blog' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                >
                  Text_Log
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'art'})}
                  className={`flex-1 py-4 font-black uppercase tracking-widest text-xs transition-colors ${formData.type === 'art' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                >
                  Visual_Data
                </button>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {formData.type === 'art' ? (
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="NAME_OF_WORK" 
                      className="w-full bg-transparent border-b-4 border-black p-4 text-xl font-black outline-none placeholder:opacity-20 uppercase"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="FS_PATH (/art/...) " 
                      className="w-full bg-transparent border-b-4 border-black p-4 text-xl font-black outline-none placeholder:opacity-20"
                      value={formData.src}
                      onChange={e => setFormData({...formData, src: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer p-4 border-2 border-black font-black uppercase text-[10px] hover:bg-yellow-300 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.isTitle} 
                        onChange={e => setFormData({...formData, isTitle: e.target.checked})}
                        className="w-5 h-5 accent-black"
                      />
                      <span>Manifesto / Large Quote Mode</span>
                    </label>
                    {formData.isTitle && (
                      <input 
                        type="text" 
                        placeholder="SOURCE_INFO (waar komt deze quote vandaan?)" 
                        className="w-full bg-transparent border-b-2 border-black p-2 text-xs font-bold outline-none"
                        value={formData.sourceInfo}
                        onChange={e => setFormData({...formData, sourceInfo: e.target.value})}
                      />
                    )}
                  </div>
                )}
                
                <textarea 
                  className="w-full bg-[#f9f9f9] border-4 border-black p-6 h-96 text-xl font-bold focus:shadow-[12px_12px_0_0_rgba(255,235,59,1)] outline-none transition-all placeholder:opacity-20"
                  placeholder="START_RAW_INPUT..."
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white py-8 font-black text-3xl uppercase italic tracking-tighter hover:bg-yellow-300 hover:text-black transition-all shadow-[12px_12px_0_0_rgba(0,0,0,1)] hover:shadow-none active:translate-y-2"
              >
                Push_To_Archive_
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GRID VIEW: Puzzel-achtig Masonry */}
      {view === 'grid' && (
        <main className="p-2 md:p-4">
          <div className="columns-2 md:columns-4 lg:columns-5 xl:columns-6 gap-2 max-w-[1800px] mx-auto space-y-2">
            {posts.map((post) => (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className={`
                  break-inside-avoid border-2 border-black group cursor-pointer transition-all mb-2
                  shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1
                  ${post.type === 'art' ? 'bg-black' : 'p-4'}
                  ${post.isTitle ? 'bg-white italic' : post.type === 'blog' ? 'bg-yellow-300' : ''}
                `}
              >
                {post.type === 'blog' && (
                  <div className="space-y-3">
                    {!post.isTitle && <span className="text-[7px] font-black opacity-40 uppercase">{post.date}</span>}
                    <p className={`font-black tracking-tighter leading-none uppercase ${post.isTitle ? 'text-lg md:text-xl border-l-4 border-black pl-2 py-1' : 'text-[10px] line-clamp-[12]'}`}>
                      {post.isTitle ? `"${post.content}"` : post.content}
                    </p>
                    {!post.isTitle && <div className="text-[7px] font-black border-t border-black/10 pt-2 opacity-30 italic">EXP_ENTRY_{post.id.slice(0,4)}</div>}
                  </div>
                )}

                {post.type === 'art' && (
                  <div className="relative overflow-hidden">
                    <img 
                      src={post.src} 
                      alt={post.title} 
                      className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700 block" 
                    />
                    <div className="absolute bottom-1 left-1 bg-white border border-black px-1.5 py-0.5 text-[7px] font-black uppercase italic shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                      {post.title}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* MODAL */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 md:p-12 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black p-8 md:p-16 relative shadow-[24px_24px_0_0_rgba(255,235,59,1)]"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPost(null)} 
              className="absolute top-6 right-6 font-black text-xs bg-black text-white px-3 py-1 hover:bg-yellow-300 hover:text-black transition-colors"
            >
              CLOSE_
            </button>
            
            <header className="mb-10 border-b-4 border-black pb-6">
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter underline decoration-yellow-300 underline-offset-8">
                {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Archive_Entry')}
              </h2>
              <div className="flex justify-between items-center mt-6">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">{selectedPost.date} // {selectedPost.id}</p>
                {selectedPost.sourceInfo && <span className="text-[10px] font-black bg-black text-white px-2 py-0.5">SRC: {selectedPost.sourceInfo}</span>}
              </div>
            </header>

            <div className="space-y-12">
              {selectedPost.type === 'art' && (
                <div className="border-4 border-black p-1 bg-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
                  <img src={selectedPost.src} className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000" alt="Art Detail" />
                </div>
              )}
              <div className="text-xl md:text-3xl leading-[1.2] font-black text-black text-justify whitespace-pre-wrap tracking-tighter uppercase">
                {selectedPost.content}
              </div>
            </div>

            <footer className="mt-20 pt-6 border-t-2 border-black flex justify-between items-center text-[8px] font-black uppercase opacity-30 italic">
              <span>Verified_Database_Entry</span>
              <span>Exposure Therapy // Giel te Molder</span>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}