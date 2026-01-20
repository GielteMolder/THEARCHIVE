import { useState, useEffect } from 'react'
import { db } from './firebase'; 
import { collection, getDocs } from 'firebase/firestore';

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const haalPostsOp = async () => {
      try {
        console.log("Verbinding maken met Firestore...");
        const querySnapshot = await getDocs(collection(db, "posts"));
        const opgehaaldeData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(opgehaaldeData);
      } catch (err) {
        console.error("FOUT:", err);
      } finally {
        setLoading(false);
      }
    };
    haalPostsOp();
  }, []);

  return (
    <div className="min-h-screen p-4 font-mono bg-[#f3f3f3] text-black">
      
      {/* HEADER */}
      <header className="mb-8 text-center border-b-2 border-black pb-4">
        <h1 className="text-4xl font-bold tracking-tighter uppercase italic">The Archive</h1>
        <p className="text-sm mt-2 text-gray-600 font-bold">Exposure Therapy // Connected</p>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
        
        {loading && (
           <div className="col-span-2 md:col-span-4 text-center p-10 font-bold animate-pulse uppercase">
             Loading Database...
           </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="col-span-2 md:col-span-4 text-center p-10 text-gray-400 border-2 border-dashed border-gray-400">
            De lade is leeg. Voeg posts toe in Firebase!
          </div>
        )}

        {posts.map((post) => (
          <div 
            key={post.id} 
            onClick={() => setSelectedPost(post)}
            className={`
              aspect-square border-2 border-black cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
              ${post.type === 'blog' ? 'bg-yellow-300 p-4 flex flex-col justify-between' : 'bg-black relative group overflow-hidden'}
              ${post.isTitle ? 'bg-white items-center justify-center' : ''}
            `}
          >
            {/* BLOG POST */}
            {post.type === 'blog' && (
              <>
                {!post.isTitle && <span className="text-[10px] font-bold uppercase tracking-widest">[BLOG]</span>}
                <p className={`font-bold leading-tight ${post.isTitle ? 'text-xl italic text-center underline' : 'text-sm line-clamp-4'}`}>
                  {post.content}
                </p>
                {!post.isTitle && <span className="text-[10px] text-right opacity-50">{post.date}</span>}
              </>
            )}

            {/* ART POST */}
            {post.type === 'art' && (
              <>
                <img 
                  src={post.src} 
                  alt={post.title} 
                  className="object-cover w-full h-full grayscale hover:grayscale-0 transition-all duration-500" 
                />
                <div className="absolute bottom-0 left-0 bg-white border-t-2 border-r-2 border-black px-2 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-tighter">{post.title}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* MODAL (POPU-UP) */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white border-4 border-black max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-[12px_12px_0px_0px_rgba(255,235,59,1)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6 border-b-4 border-black pb-4">
               <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">
                    {selectedPost.title || 'ARCHIVE ENTRY'}
                  </h2>
                  <p className="text-xs font-bold text-gray-500 uppercase">{selectedPost.date || 'No Date'}</p>
               </div>
               <button 
                  onClick={() => setSelectedPost(null)}
                  className="bg-black text-white px-4 py-2 font-bold hover:bg-yellow-300 hover:text-black transition-colors border-2 border-black"
                >
                  SLUITEN [X]
               </button>
            </div>

            <div className="space-y-4">
              {selectedPost.type === 'art' && (
                <img src={selectedPost.src} className="w-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" alt="Art Large" />
              )}
              <div className="text-xl leading-relaxed whitespace-pre-wrap font-bold">
                {selectedPost.content}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t-2 border-black text-[10px] flex justify-between uppercase font-bold opacity-40">
               <span>Exposure Therapy // Giel te Molder</span>
               <span>Doc_ID: {selectedPost.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}