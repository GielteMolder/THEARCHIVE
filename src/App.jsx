import { useState, useEffect } from 'react'
import { db } from './firebase'; 
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [view, setView] = useState('grid'); // 'grid' of 'admin'

  // State voor het invoerformulier
  const [formData, setFormData] = useState({
    type: 'blog',
    content: '',
    title: '',
    src: '',
    isTitle: false,
    date: new Date().toLocaleDateString('nl-NL'),
    tags: ''
  });

  // Haal data op uit Firestore
  const haalPostsOp = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      
      let opgehaaldeData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fallback als er geen timestamps zijn (voor handmatige toevoegingen)
      if (opgehaaldeData.length === 0) {
        const simpleSnapshot = await getDocs(collection(db, "posts"));
        opgehaaldeData = simpleSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      setPosts(opgehaaldeData);
    } catch (err) {
      console.error("Fout bij ophalen:", err);
      const fallbackSnapshot = await getDocs(collection(db, "posts"));
      const fallbackData = fallbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    haalPostsOp();
  }, [view]);

  // Opslaan van een nieuwe post
  const handleSavePost = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "posts"), {
        ...formData,
        timestamp: serverTimestamp()
      });
      
      setFormData({ type: 'blog', content: '', title: '', src: '', isTitle: false, date: new Date().toLocaleDateString('nl-NL'), tags: '' });
      setView('grid');
    } catch (err) {
      alert("Opslaan mislukt: " + err.message);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-mono bg-[#ececec] text-black selection:bg-yellow-400">
      
      {/* --- NAVIGATIE / HEADER --- */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b-8 border-black pb-6 gap-6">
        <div className="space-y-1">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.8] hover:skew-x-2 transition-transform cursor-default">
              The Archive
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-sm font-black bg-black text-white px-2 py-1 uppercase tracking-widest">
                Exposure Therapy // Live Database
              </p>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
        </div>
        
        <button 
          onClick={() => setView(view === 'grid' ? 'admin' : 'grid')}
          className="group relative inline-block px-8 py-4 font-black uppercase tracking-widest bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2 transition-all active:bg-yellow-300"
        >
          {view === 'grid' ? '+ Create Entry' : 'Close Console'}
        </button>
      </header>

      {/* --- ADMIN DASHBOARD --- */}
      {view === 'admin' && (
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-white border-8 border-black p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            {/* Achtergrond decoratie voor de admin-vibe */}
            <div className="absolute top-0 right-0 p-2 text-[8px] opacity-10 font-black rotate-90 origin-top-right">ADMIN_ACCESS_GRANTED_v2.0</div>
            
            <h2 className="text-4xl font-black mb-10 border-b-4 border-black pb-4 uppercase italic flex items-center gap-4">
              <span className="bg-black text-white px-3">01</span> New Record
            </h2>
            
            <form onSubmit={handleSavePost} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <label className="block">
                  <span className="text-xs font-black uppercase mb-2 block underline">Category Type</span>
                  <select 
                    className="w-full border-4 border-black p-4 font-black bg-white focus:bg-yellow-300 outline-none appearance-none cursor-pointer"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="blog">Text / Document</option>
                    <option value="art">Visual / Artwork</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase mb-2 block underline">Entry Date</span>
                  <input 
                    type="text" 
                    className="w-full border-4 border-black p-4 font-black focus:bg-yellow-300 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </label>

                {formData.type === 'art' ? (
                  <>
                    <label className="block animate-in slide-in-from-left duration-300">
                      <span className="text-xs font-black uppercase mb-2 block underline">Project Name</span>
                      <input 
                        type="text" 
                        className="w-full border-4 border-black p-4 font-black focus:bg-yellow-300 outline-none"
                        placeholder="e.g. DISTORTION_01"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </label>
                    <label className="block animate-in slide-in-from-left duration-500">
                      <span className="text-xs font-black uppercase mb-2 block underline">Local Image Path</span>
                      <input 
                        type="text" 
                        className="w-full border-4 border-black p-4 font-black focus:bg-yellow-300 outline-none"
                        placeholder="/art/file.png"
                        value={formData.src}
                        onChange={e => setFormData({...formData, src: e.target.value})}
                      />
                    </label>
                  </>
                ) : (
                  <div className="pt-4 animate-in slide-in-from-right duration-300">
                    <label className="flex items-center gap-4 p-4 border-4 border-black cursor-pointer hover:bg-black hover:text-white transition-colors">
                      <input 
                        type="checkbox" 
                        checked={formData.isTitle} 
                        onChange={e => setFormData({...formData, isTitle: e.target.checked})}
                        className="w-8 h-8 border-4 border-black checked:bg-yellow-400"
                      />
                      <span className="text-xs font-black uppercase">Set as Structural Header / Manifesto</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <label className="block">
                  <span className="text-xs font-black uppercase mb-2 block underline">Database Content</span>
                  <textarea 
                    className="w-full border-4 border-black p-4 h-[335px] font-bold text-lg leading-tight focus:bg-yellow-50 outline-none resize-none"
                    placeholder="Input RAW text data here..."
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                  />
                </label>
              </div>

              <button 
                type="submit"
                className="md:col-span-2 bg-black text-white p-8 font-black text-4xl hover:bg-yellow-400 hover:text-black transition-all shadow-[12px_12px_0px_0px_rgba(255,235,59,1)] active:translate-y-2 active:shadow-none uppercase italic"
              >
                Execute Commit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MAIN ARCHIVE GRID --- */}
      {view === 'grid' && (
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-60">
              <div className="inline-block border-8 border-black p-10 bg-white shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]">
                <span className="text-4xl font-black uppercase animate-pulse italic underline">Syncing memory banks...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {posts.map((post, index) => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className={`
                    group border-4 border-black cursor-pointer transition-all duration-300
                    hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]
                    ${post.type === 'blog' ? 'bg-yellow-300 p-8 flex flex-col justify-between min-h-[300px]' : 'bg-black relative overflow-hidden aspect-square'}
                    ${post.isTitle ? 'bg-white col-span-1 md:col-span-2 aspect-auto py-12 px-10' : ''}
                    ${index % 7 === 0 && !post.isTitle ? 'lg:row-span-2 lg:aspect-auto' : ''}
                  `}
                >
                  {/* BLOG / TEXT CONTENT */}
                  {post.type === 'blog' && (
                    <>
                      <div className="space-y-4">
                        {!post.isTitle && (
                          <div className="flex justify-between items-start">
                             <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-1 tracking-tighter">Record_{post.id.slice(0,4)}</span>
                             <span className="text-[10px] font-black uppercase opacity-40">[{post.date}]</span>
                          </div>
                        )}
                        <p className={`font-black tracking-tight ${post.isTitle ? 'text-4xl md:text-6xl italic underline uppercase leading-[0.9]' : 'text-md leading-none line-clamp-6'}`}>
                          {post.content}
                        </p>
                      </div>
                      {!post.isTitle && (
                         <div className="mt-4 pt-4 border-t-2 border-black/20 flex justify-between items-center text-[10px] font-black uppercase">
                            <span>Read Full Log</span>
                            <span className="text-lg">→</span>
                         </div>
                      )}
                    </>
                  )}

                  {/* ART / VISUAL CONTENT */}
                  {post.type === 'art' && (
                    <>
                      <img 
                        src={post.src} 
                        alt={post.title} 
                        className="object-cover w-full h-full grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" 
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/600?text=DATA_MISSING'; }}
                      />
                      <div className="absolute top-4 left-4">
                         <span className="bg-white text-black border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            {post.title}
                         </span>
                      </div>
                      <div className="absolute inset-0 bg-yellow-400/0 group-hover:bg-yellow-400/10 transition-colors pointer-events-none"></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL / DETAIL VIEW --- */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 md:p-12 z-50 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white border-8 border-black max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-[30px_30px_0px_0px_rgba(255,235,59,1)] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b-8 border-black p-6 md:p-10 flex justify-between items-center z-10">
               <div className="space-y-1">
                  <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">
                    {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Entry Log')}
                  </h2>
                  <div className="flex gap-4 items-center">
                    <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] italic">{selectedPost.date}</p>
                    <span className="h-1 w-10 bg-black"></span>
                  </div>
               </div>
               <button 
                  onClick={() => setSelectedPost(null)} 
                  className="bg-black text-white px-8 py-4 font-black border-4 border-black hover:bg-yellow-400 hover:text-black transition-all hover:-translate-y-1 active:translate-y-1 shadow-[8px_8px_0px_0px_rgba(255,235,59,1)] hover:shadow-none"
                >
                  EXIT_
               </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-16 space-y-12">
              {selectedPost.type === 'art' && (
                <div className="relative group">
                   <div className="absolute -inset-2 bg-black -z-10 rotate-1"></div>
                   <img 
                    src={selectedPost.src} 
                    className="w-full border-4 border-black grayscale hover:grayscale-0 transition-all duration-1000" 
                    alt="Artwork" 
                   />
                </div>
              )}
              
              <div className="max-w-3xl mx-auto">
                <p className="text-2xl md:text-4xl leading-[1.3] whitespace-pre-wrap font-black text-black text-justify selection:bg-black selection:text-white">
                  {selectedPost.content}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="p-10 border-t-8 border-black bg-[#f9f9f9] flex flex-col md:flex-row justify-between items-center gap-4 text-[12px] font-black uppercase opacity-60">
               <span>© 2026 // Giel te Molder Archive // Node_ID: {selectedPost.id}</span>
               <div className="flex gap-10 italic underline underline-offset-4">
                  <span>Exposure Therapy</span>
                  <span>System: Functional</span>
               </div>
            </footer>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="max-w-7xl mx-auto mt-32 border-t-8 border-black pt-8 pb-20 flex flex-col md:flex-row justify-between items-start gap-8 opacity-20 hover:opacity-100 transition-opacity">
          <div className="text-[10px] font-black uppercase leading-tight">
            Built with frustration and coffee.<br/>
            Local storage enabled.<br/>
            No cloud required for assets.
          </div>
          <div className="text-[40px] font-black uppercase tracking-tighter leading-none italic">
            KEEP ARCHIVING_
          </div>
      </footer>
    </div>
  )
}