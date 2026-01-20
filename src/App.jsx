import { useState, useEffect } from 'react'
import { db } from './firebase'; 
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "firebase/firestore";

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [view, setView] = useState('grid'); 

  const [formData, setFormData] = useState({
    type: 'blog',
    content: '',
    title: '',
    src: '',
    isTitle: false,
    date: new Date().toLocaleDateString('nl-NL'),
  });

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
      setFormData({ type: 'blog', content: '', title: '', src: '', isTitle: false, date: new Date().toLocaleDateString('nl-NL') });
      setView('grid');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-[#1a1a1a] font-mono selection:bg-black selection:text-white">
      
      {/* HEADER: Alleen tonen in Grid view */}
      {view === 'grid' && (
        <header className="p-6 md:p-10 border-b border-black flex justify-between items-center bg-white sticky top-0 z-30">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">The Archive</h1>
            <p className="text-[10px] uppercase font-bold opacity-50">Giel te Molder // Exposure Therapy</p>
          </div>
          <button 
            onClick={() => setView('admin')}
            className="group flex items-center gap-2 border border-black px-4 py-2 hover:bg-black hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            <span className="text-lg">+</span> Add Entry
          </button>
        </header>
      )}

      {/* ADMIN VIEW: Geen main header, focus op de taak */}
      {view === 'admin' && (
        <div className="p-6 md:p-20 min-h-screen flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-full max-w-xl space-y-10">
            <div className="flex justify-between items-center border-b border-black pb-4">
               <h2 className="text-sm font-black uppercase tracking-widest italic">System_Input_Mode</h2>
               <button onClick={() => setView('grid')} className="text-[10px] font-black underline hover:no-underline">Cancel_And_Return</button>
            </div>

            <form onSubmit={handleSavePost} className="space-y-8">
              {/* Custom Type Selector (geen lelijke select meer) */}
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'blog'})}
                  className={`flex-1 py-3 border border-black font-black text-[10px] uppercase transition-all ${formData.type === 'blog' ? 'bg-black text-white' : 'bg-transparent hover:bg-gray-100'}`}
                >
                  Text_Entry
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, type: 'art'})}
                  className={`flex-1 py-3 border border-black font-black text-[10px] uppercase transition-all ${formData.type === 'art' ? 'bg-black text-white' : 'bg-transparent hover:bg-gray-100'}`}
                >
                  Visual_Entry
                </button>
              </div>

              <div className="space-y-4">
                {formData.type === 'art' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="PROJECT_TITLE" 
                      className="bg-transparent border-b border-black p-2 text-xs font-bold outline-none focus:border-b-2"
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="PATH (/art/...) " 
                      className="bg-transparent border-b border-black p-2 text-xs font-bold outline-none focus:border-b-2"
                      value={formData.src}
                      onChange={e => setFormData({...formData, src: e.target.value})}
                    />
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={formData.isTitle} 
                      onChange={e => setFormData({...formData, isTitle: e.target.checked})}
                      className="accent-black"
                    />
                    <span className="text-[10px] font-black uppercase opacity-50 group-hover:opacity-100">Structural Header Mode</span>
                  </label>
                )}
                
                <textarea 
                  className="w-full bg-white border border-black p-4 h-64 text-sm font-bold focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none transition-all"
                  placeholder="Insert content here..."
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-black text-white py-6 font-black text-xs uppercase tracking-[0.3em] hover:bg-yellow-400 hover:text-black transition-all"
              >
                Commit_To_Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {view === 'grid' && (
        <main className="p-4 md:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 auto-rows-auto gap-2 max-w-[1600px] mx-auto">
            {posts.map((post) => (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className={`
                  border border-black group cursor-pointer transition-all relative
                  ${post.type === 'art' ? 'md:col-span-2 md:row-span-2 aspect-square' : 'p-4 aspect-square flex flex-col justify-between'}
                  ${post.isTitle ? 'md:col-span-2 aspect-auto min-h-0 py-10 bg-white' : post.type === 'blog' ? 'bg-yellow-200 hover:bg-yellow-300' : 'bg-black'}
                `}
              >
                {post.type === 'blog' && (
                  <>
                    {!post.isTitle && <span className="text-[8px] font-bold opacity-30 uppercase tracking-widest">{post.date}</span>}
                    <p className={`font-black leading-tight tracking-tighter ${post.isTitle ? 'text-2xl italic underline uppercase' : 'text-[10px] line-clamp-6 uppercase'}`}>
                      {post.content}
                    </p>
                    {!post.isTitle && <span className="text-[8px] font-bold text-right uppercase">Read_More</span>}
                  </>
                )}

                {post.type === 'art' && (
                  <>
                    <img 
                      src={post.src} 
                      alt={post.title} 
                      className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700" 
                    />
                    <div className="absolute top-2 left-2 bg-white px-2 py-0.5 border border-black text-[8px] font-black uppercase italic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {post.title}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* MODAL */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center p-4 md:p-20 backdrop-blur-md"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="w-full max-w-4xl max-h-full overflow-y-auto bg-white border border-black p-8 md:p-16 relative shadow-[20px_20px_0px_0px_rgba(0,0,0,1)]"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedPost(null)} className="absolute top-6 right-6 font-black text-xs underline hover:no-underline">CLOSE_ENTRY</button>
            
            <header className="mb-12 border-b border-black pb-6">
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter underline underline-offset-8">
                {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Record')}
              </h2>
              <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-widest">{selectedPost.date} // ID: {selectedPost.id}</p>
            </header>

            <div className="space-y-10">
              {selectedPost.type === 'art' && (
                <img src={selectedPost.src} className="w-full border border-black grayscale hover:grayscale-0 transition-all duration-1000" alt="Art Detail" />
              )}
              <div className="text-lg md:text-2xl leading-relaxed font-bold text-justify whitespace-pre-wrap">
                {selectedPost.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}