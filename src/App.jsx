import { useState, useEffect } from 'react'
import { db } from './firebase'; // Verwijst naar jouw lokale firebase.js
import { collection, getDocs } from 'firebase/firestore';

export default function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const haalPostsOp = async () => {
      try {
        console.log("Verbinding maken met Firestore...");
        
        // 1. Haal de collectie 'posts' op uit jouw database
        const querySnapshot = await getDocs(collection(db, "posts"));
        
        // 2. Map de data naar een bruikbaar formaat
        const opgehaaldeData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("Data gevonden:", opgehaaldeData);
        setPosts(opgehaaldeData);
      } catch (error) {
        console.error("FOUT bij ophalen data:", error);
      } finally {
        setLoading(false);
      }
    };

    haalPostsOp();
  }, []);

  return (
    <div className="min-h-screen p-4 font-mono bg-[#f3f3f3]">
      
      {/* HEADER */}
      <header className="mb-8 text-center border-b-2 border-black pb-4">
        <h1 className="text-4xl font-bold tracking-tighter">THE ARCHIVE</h1>
        <p className="text-sm mt-2 text-gray-600">Exposure Therapy / Database Connected</p>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
        
        {/* LAAD MELDING */}
        {loading && (
           <div className="col-span-2 md:col-span-4 text-center p-10 font-bold animate-pulse">
             Verbinding zoeken met de database...
           </div>
        )}

        {/* GEEN DATA MELDING */}
        {!loading && posts.length === 0 && (
          <div className="col-span-2 md:col-span-4 text-center p-10 text-gray-400 border-2 border-dashed border-gray-300">
            Geen posts gevonden in de collectie 'posts'.<br/>
            <span className="text-xs">Heb je in Firebase (de website) al een document aangemaakt in de collectie 'posts'?</span>
          </div>
        )}

        {/* DE POSTS */}
        {posts.map((post) => (
          <div 
            key={post.id} 
            className={`
              aspect-square border-2 border-black cursor-pointer transition-transform hover:scale-105 hover:z-10 hover:shadow-xl
              ${post.type === 'blog' ? 'bg-yellow-300 p-4 flex flex-col justify-between' : 'bg-black relative group overflow-hidden'}
              ${post.isTitle ? 'bg-white items-center justify-center' : ''}
            `}
          >
            {/* BLOG POST DESIGN */}
            {post.type === 'blog' && (
              <>
                {!post.isTitle && <span className="text-xs font-bold">[BLOG]</span>}
                <p className={`font-bold ${post.isTitle ? 'text-xl italic' : 'text-sm leading-tight'}`}>
                  {post.content}
                </p>
                {!post.isTitle && <span className="text-xs text-right">{post.date}</span>}
              </>
            )}

            {/* ART POST DESIGN */}
            {post.type === 'art' && (
              <>
                <img 
                  src={post.src} 
                  alt={post.title} 
                  className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                <div className="absolute bottom-0 left-0 bg-white border-t-2 border-r-2 border-black px-2 py-1">
                    <span className="text-xs font-bold">{post.title}</span>
                </div>
              </>
            )}
          </div>
        ))}

      </div>
    </div>
  )
}