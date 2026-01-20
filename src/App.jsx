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

      // Fallback als er geen timestamps zijn
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
    <div className="min-h-screen p-4 md:p-6 font-mono bg-[#f0f0f0] text-black selection:bg-yellow-300">
      
      {/* --- HEADER (VERKLEIND) --- */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b-4 border-black pb-4 gap-4">
        <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic leading-none hover:tracking-normal transition-all cursor-default">
              The Archive
            </h1>
            <p className="text-[10px] font-bold bg-black text-white px-2 py-0.5 mt-2 inline-block uppercase tracking-tighter">
              Exposure Therapy // v2.1 // Connected
            </p>
        </div>
        
        <button 
          onClick={() => setView(view === 'grid' ? 'admin' : 'grid')}
          className="bg-white border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-tighter shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:bg-yellow-200"
        >
          {view === 'grid' ? '+ New Entry' : 'Back to Grid'}
        </button>
      </header>

      {/* --- ADMIN DASHBOARD (COMPACTER) --- */}
      {view === 'admin' && (
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black mb-6 border-b-2 border-black pb-2 uppercase italic flex items-center gap-2">
              <span className="bg-black text-white px-1.5 text-sm">IN</span> Create Record
            </h2>
            
            <form onSubmit={handleSavePost} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[10px] font-black uppercase mb-1 block underline">Type</span>
                  <select 
                    className="w-full border-2 border-black p-2 text-sm font-bold bg-white focus:bg-yellow-100 outline-none"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="blog">Text / Document</option>
                    <option value="art">Visual / Artwork</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-[10px] font-black uppercase mb-1 block underline">Date</span>
                  <input 
                    type="text" 
                    className="w-full border-2 border-black p-2 text-sm font-bold focus:bg-yellow-100 outline-none"
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </label>
              </div>

              {formData.type === 'art' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase mb-1 block underline">Project Title</span>
                    <input 
                      type="text" 
                      className="w-full border-2 border-black p-2 text-sm font-bold focus:bg-yellow-100 outline-none"
                      placeholder="Title..."
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase mb-1 block underline">Path (public/art/...)</span>
                    <input 
                      type="text" 
                      className="w-full border-2 border-black p-2 text-sm font-bold focus:bg-yellow-100 outline-none"
                      placeholder="/art/file.jpg"
                      value={formData.src}
                      onChange={e => setFormData({...formData, src: e.target.value})}
                    />
                  </label>
                </div>
              )}

              {formData.type === 'blog' && (
                <label className="flex items-center gap-2 py-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isTitle} 
                    onChange={e => setFormData({...formData, isTitle: e.target.checked})}
                    className="w-4 h-4 border-2 border-black"
                  />
                  <span className="text-[10px] font-black uppercase">Visual Header Mode</span>
                </label>
              )}

              <label className="block">
                <span className="text-[10px] font-black uppercase mb-1 block underline">Content Data</span>
                <textarea 
                  className="w-full border-2 border-black p-3 h-64 text-sm leading-tight focus:bg-yellow-50 outline-none resize-none font-bold"
                  placeholder="Insert content..."
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </label>

              <button 
                type="submit"
                className="w-full bg-black text-white p-4 font-black text-lg hover:bg-yellow-300 hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none uppercase italic"
              >
                Sync to Cloud
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- GRID (BETER GESCHAAALD) --- */}
      {view === 'grid' && (
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-40">
              <span className="text-sm font-black uppercase animate-pulse border-2 border-black px-4 py-2 bg-white">Loading_Archives...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {posts.map((post, index) => (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPost(post)}
                  className={`
                    group border-2 border-black cursor-pointer transition-all duration-200
                    hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1
                    ${post.type === 'blog' ? 'bg-yellow-300 p-4 flex flex-col justify-between min-h-[180px]' : 'bg-black relative overflow-hidden aspect-square'}
                    ${post.isTitle ? 'bg-white col-span-2 aspect-auto py-8 px-6' : ''}
                    ${index % 10 === 0 && !post.isTitle ? 'md:row-span-2 md:aspect-auto' : ''}
                  `}
                >
                  {post.type === 'blog' && (
                    <>
                      <div className="space-y-2">
                        {!post.isTitle && (
                          <div className="flex justify-between items-center opacity-40 text-[8px] font-black uppercase">
                             <span>#{post.id.slice(0,4)}</span>
                             <span>{post.date}</span>
                          </div>
                        )}
                        <p className={`font-black tracking-tight ${post.isTitle ? 'text-xl md:text-3xl italic underline leading-tight' : 'text-xs line-clamp-6'}`}>
                          {post.content}
                        </p>
                      </div>
                      {!post.isTitle && <span className="text-[8px] font-black uppercase text-right block mt-2 opacity-30 italic">View_Log</span>}
                    </>
                  )}

                  {post.type === 'art' && (
                    <>
                      <img 
                        src={post.src} 
                        alt={post.title} 
                        className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-500" 
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=ERR_404'; }}
                      />
                      <div className="absolute bottom-2 left-2">
                         <span className="bg-white text-black border-2 border-black px-1.5 py-0.5 text-[8px] font-black uppercase">
                            {post.title}
                         </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL (HET LEESVENSTER - KLEINER & BRUIKBAARDER) --- */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white border-4 border-black max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-[12px_12px_0px_0px_rgba(255,235,59,1)] relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b-4 border-black p-4 flex justify-between items-center z-10">
               <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic leading-none">
                    {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Record')}
                  </h2>
                  <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">{selectedPost.date}</p>
               </div>
               <button 
                  onClick={() => setSelectedPost(null)} 
                  className="bg-black text-white w-8 h-8 font-black border-2 border-black hover:bg-yellow-300 hover:text-black transition-colors flex items-center justify-center"
                >
                  X
               </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 space-y-6">
              {selectedPost.type === 'art' && (
                <div className="border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                   <img src={selectedPost.src} className="w-full grayscale hover:grayscale-0 transition-all duration-1000" alt="Detail" />
                </div>
              )}
              
              <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap font-bold text-black text-justify selection:bg-yellow-200">
                {selectedPost.content}
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="p-4 border-t-2 border-black bg-gray-50 flex justify-between items-center text-[8px] font-black uppercase opacity-40">
               <span>Giel te Molder Archive // ID: {selectedPost.id}</span>
               <span>Status: Active</span>
            </footer>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="max-w-7xl mx-auto mt-20 border-t-4 border-black pt-4 pb-12 flex justify-between items-start opacity-20 text-[8px] font-black uppercase">
          <div>
            Built locally.<br/>Connected globally.<br/>Exposure therapy in progress.
          </div>
          <div className="text-lg italic tracking-tighter leading-none">
            Keep_Logging_
          </div>
      </footer>
    </div>
  )
}