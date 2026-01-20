import { useState, useEffect } from 'react'
import { db } from './firebase'; 
import { collection, getDocs } from 'firebase/firestore';

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Scherm-beheer: 'grid' (archief) of 'admin' (toevoegen)
  const [view, setView] = useState('grid');

  // Formulier-staat voor de nieuwe post
  const [formData, setFormData] = useState({
    type: 'blog',
    content: '',
    title: '',
    src: '',
    isTitle: false,
    date: new Date().toLocaleDateString('nl-NL')
  });

  // Haal alle posts op uit de database
  const haalPostsOp = async () => {
    setLoading(true);
    try {
      // We sorteren ze op timestamp zodat de nieuwste bovenaan komen
      const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);
      const opgehaaldeData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(opgehaaldeData);
    } catch (err) {
      console.error("Database fout:", err);
      // Fallback voor als de database nog geen 'timestamp' velden heeft of leeg is
      try {
        const simpleSnapshot = await getDocs(collection(db, "posts"));
        const simpleData = simpleSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPosts(simpleData);
      } catch (e) {
        console.error("Zelfs simpele fetch faalde:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    haalPostsOp();
  }, [view]);

  // Functie om de nieuwe post naar Firebase te sturen
  const handleSavePost = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "posts"), {
        ...formData,
        timestamp: serverTimestamp() // Voor de juiste volgorde
      });
      
      // Reset het formulier en ga terug naar het archief
      setFormData({ type: 'blog', content: '', title: '', src: '', isTitle: false, date: new Date().toLocaleDateString('nl-NL') });
      setView('grid');
    } catch (err) {
      alert("Er ging iets mis bij het opslaan: " + err.message);
    }
  };

  return (
    <div className="min-h-screen p-4 font-mono bg-[#f3f3f3] text-black">
      
      {/* HEADER */}
      <header className="mb-8 text-center border-b-4 border-black pb-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-left">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic leading-none">The Archive</h1>
            <p className="text-sm mt-1 text-gray-600 font-bold uppercase tracking-widest">Giel te Molder // Exposure Therapy</p>
        </div>
        
        {/* Navigatie knop */}
        <button 
          onClick={() => setView(view === 'grid' ? 'admin' : 'grid')}
          className="bg-black text-white px-6 py-2 font-black hover:bg-yellow-300 hover:text-black transition-all border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
        >
          {view === 'grid' ? '+ NIEUWE ENTRY' : 'TERUG NAAR ARCHIEF'}
        </button>
      </header>

      {/* ADMIN VIEW: HIER VOEG JE DINGEN TOE */}
      {view === 'admin' && (
        <div className="max-w-3xl mx-auto bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-3xl font-black mb-8 border-b-4 border-black pb-2 uppercase italic">Data Invoer</h2>
          
          <form onSubmit={handleSavePost} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label>
                <span className="block text-xs font-black uppercase mb-1 underline">Type Content</span>
                <select 
                  className="w-full border-4 border-black p-3 font-bold bg-white focus:bg-yellow-200 outline-none"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="blog">Tekst (Blog)</option>
                  <option value="art">Beeld (Art)</option>
                </select>
              </label>
              <label>
                <span className="block text-xs font-black uppercase mb-1 underline">Datum stempel</span>
                <input 
                  type="text" 
                  className="w-full border-4 border-black p-3 font-bold focus:bg-yellow-200 outline-none"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </label>
            </div>

            {formData.type === 'art' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <label className="block">
                  <span className="block text-xs font-black uppercase mb-1 underline">Project Titel</span>
                  <input 
                    type="text" 
                    className="w-full border-4 border-black p-3 font-bold focus:bg-yellow-200 outline-none"
                    placeholder="Bijv. PROJECT_01"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-black uppercase mb-1 underline">Pad naar afbeelding (in /art/ folder)</span>
                  <input 
                    type="text" 
                    className="w-full border-4 border-black p-3 font-bold focus:bg-yellow-200 outline-none"
                    placeholder="/art/mijn-foto.jpg"
                    value={formData.src}
                    onChange={e => setFormData({...formData, src: e.target.value})}
                  />
                </label>
              </div>
            )}

            {formData.type === 'blog' && (
              <label className="flex items-center gap-3 py-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.isTitle} 
                  onChange={e => setFormData({...formData, isTitle: e.target.checked})}
                  className="w-6 h-6 border-4 border-black checked:bg-black"
                />
                <span className="text-xs font-black uppercase group-hover:underline">Gebruik dit als een grote visuele titel (Manifesto stijl)</span>
              </label>
            )}

            <label className="block">
              <span className="block text-xs font-black uppercase mb-1 underline">De Inhoud (Plak hier je tekst)</span>
              <textarea 
                className="w-full border-4 border-black p-4 h-96 font-medium text-lg leading-relaxed focus:bg-yellow-50 outline-none resize-none"
                placeholder="Begin hier met schrijven of plak je tekst..."
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
              />
            </label>

            <button 
              type="submit"
              className="w-full bg-black text-white p-6 font-black text-2xl hover:bg-yellow-400 hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(255,235,59,1)] active:translate-y-1 active:shadow-none uppercase italic"
            >
              Publiceren in Archief
            </button>
          </form>
        </div>
      )}

      {/* GRID VIEW: JE ARCHIEF OVERZICHT */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {loading && (
            <div className="col-span-full text-center py-40">
              <span className="text-2xl font-black uppercase animate-pulse italic">Accessing database...</span>
            </div>
          )}
          
          {!loading && posts.length === 0 && (
            <div className="col-span-full text-center py-40 border-4 border-dashed border-black opacity-30 uppercase font-black">
              Archive is momenteel leeg.
            </div>
          )}
          
          {posts.map((post) => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className={`
                aspect-square border-4 border-black cursor-pointer transition-all hover:scale-[1.03] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]
                ${post.type === 'blog' ? 'bg-yellow-300 p-6 flex flex-col justify-between' : 'bg-black relative group overflow-hidden'}
                ${post.isTitle ? 'bg-white items-center justify-center text-center' : ''}
              `}
            >
              {post.type === 'blog' && (
                <>
                  {!post.isTitle && <span className="text-[10px] font-black uppercase border-b-2 border-black self-start">Entry</span>}
                  <p className={`font-black leading-tight ${post.isTitle ? 'text-2xl italic underline px-2' : 'text-sm line-clamp-6'}`}>
                    {post.content}
                  </p>
                  {!post.isTitle && <span className="text-[10px] text-right font-bold opacity-60 italic">{post.date}</span>}
                </>
              )}

              {post.type === 'art' && (
                <>
                  <img 
                    src={post.src} 
                    alt={post.title} 
                    className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-700" 
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=Beeld+Niet+Gevonden'; }}
                  />
                  <div className="absolute bottom-0 left-0 bg-white border-t-4 border-r-4 border-black px-3 py-1">
                      <span className="text-xs font-black uppercase italic">{post.title}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL: HIER LEES JE JE LANGE TEKSTEN */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-md"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="bg-white border-4 border-black max-w-4xl w-full max-h-[90vh] overflow-y-auto p-10 shadow-[20px_20px_0px_0px_rgba(255,235,59,1)] relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPost(null)} 
              className="absolute top-4 right-4 bg-black text-white w-10 h-10 font-black border-2 border-black hover:bg-yellow-400 hover:text-black transition-colors"
            >
              X
            </button>

            <div className="mb-10 border-b-8 border-black pb-6">
                <h2 className="text-5xl font-black uppercase tracking-tighter italic underline mb-2">
                  {selectedPost.title || (selectedPost.isTitle ? 'MANIFESTO' : 'ENTRY')}
                </h2>
                <p className="text-sm font-black text-gray-500 uppercase tracking-widest italic">{selectedPost.date || 'DATUM ONBEKEND'}</p>
            </div>

            <div className="space-y-8">
              {selectedPost.type === 'art' && (
                <div className="relative border-8 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-10">
                   <img src={selectedPost.src} className="w-full" alt="Art Large" />
                </div>
              )}
              
              <div className="text-2xl leading-[1.6] whitespace-pre-wrap font-medium text-justify">
                {selectedPost.content}
              </div>
            </div>

            <div className="mt-20 pt-6 border-t-4 border-black text-xs flex justify-between uppercase font-black italic opacity-40">
               <span>The Archive // Exposure Therapy // Giel te Molder</span>
               <span>Ref_ID: {selectedPost.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}