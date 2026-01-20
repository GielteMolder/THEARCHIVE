import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy, onSnapshot 
} from "firebase/firestore";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut 
} from "firebase/auth";

// --- CONFIGURATIE ---
// De 'Archive Yellow' kleurcode die we overal gebruiken: #fde047 (Tailwind yellow-300)
const ARCHIVE_YELLOW = "#fde047";

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

  const [formData, setFormData] = useState({
    type: 'blog',
    content: '',
    title: '',
    src: '',
    isTitle: false,
    sourceInfo: '',
    date: new Date().toLocaleDateString('nl-NL'),
  });

  // Luisteren naar de inlogstatus
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        console.log("Ingelogd als:", currentUser.email);
      }
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

  // Real-time posts ophalen uit de database
  useEffect(() => { 
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const opgehaaldeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(opgehaaldeData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Comments ophalen voor de geselecteerde post
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
        authorEmail: user.email 
      });
      setFormData({ type: 'blog', content: '', title: '', src: '', isTitle: false, sourceInfo: '', date: new Date().toLocaleDateString('nl-NL') });
      setView('grid');
    } catch (err) {
      console.error("Fout bij opslaan:", err);
    }
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
    } catch (err) {
      console.error("Fout bij commenten:", err);
    }
  };

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

  // Admin check (nu met toLowerCase() voor de zekerheid)
  const isAdmin = user && user.email && user.email.toLowerCase() === "gielmolder@gmail.com";

  return (
    <div className="min-h-screen text-[#1a1a1a] font-mono selection:bg-black selection:text-white pb-20">
      
      {/* HEADER */}
      {view === 'grid' && (
        <header className="p-4 md:p-10 border-b-8 border-black flex justify-between items-center bg-white sticky top-0 z-40 shadow-[0_4px_0_0_rgba(0,0,0,1)]">
          <div className="group cursor-default pr-4">
            <h1 className="text-2xl md:text-6xl font-black uppercase tracking-tighter italic leading-none break-words max-w-[200px] md:max-w-none">
              The Archive
            </h1>
            <p className="text-[8px] md:text-xs font-bold bg-black text-white px-2 py-1 mt-2 inline-block uppercase tracking-widest">
              Exposure Therapy // Giel te Molder
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-end md:items-center">
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className="bg-yellow-300 border-2 md:border-4 border-black px-3 md:px-6 py-1 md:py-3 text-[10px] md:text-xs font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
              >
                + ADD_ENTRY
              </button>
            )}
            {!user ? (
              <button onClick={login} className="border-2 md:border-4 border-black px-3 md:px-6 py-1 md:py-3 text-[10px] md:text-xs font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-yellow-300">LOGIN_</button>
            ) : (
              <div className="flex items-center gap-2 md:gap-4 bg-black text-white p-1 md:p-2 pr-3 md:pr-6 border-2 md:border-4 border-black">
                <div className="text-right hidden sm:block">
                  <p className="text-[7px] font-black uppercase opacity-60">Auth: {user.email}</p>
                </div>
                {user.photoURL && <img src={user.photoURL} className="w-6 h-6 md:w-10 md:h-10 grayscale border border-white" alt="u" />}
                <button onClick={logout} className="text-[8px] md:text-[10px] font-black underline uppercase hover:text-yellow-300">Out_</button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* ADMIN VIEW */}
      {view === 'admin' && (
        <div className="min-h-screen bg-[#f0f0f0] flex flex-col p-4 md:p-20 items-center justify-center animate-in fade-in slide-in-from-bottom duration-500">
          <div className="max-w-3xl mx-auto w-full space-y-8 bg-white border-4 md:border-[10px] border-black p-6 md:p-10 shadow-[10px_10px_0_0_rgba(0,0,0,1)] md:shadow-[25px_25px_0_0_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center border-b-4 border-black pb-4">
              <h2 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase underline decoration-yellow-300 underline-offset-4">Input_Terminal</h2>
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
                    <input type="text" placeholder="NAAM_VAN_WERK" className="w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                    <input type="text" placeholder="PAD (/art/filename.jpg)" className="w-full bg-transparent border-b-4 border-black p-2 text-lg font-black outline-none" value={formData.src} onChange={e => setFormData({...formData, src: e.target.value})} />
                  </div>
                ) : (
                  <label className="flex items-center gap-4 cursor-pointer p-4 border-4 border-black font-black uppercase text-[10px] bg-gray-50 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                    <input type="checkbox" checked={formData.isTitle} onChange={e => setFormData({...formData, isTitle: e.target.checked})} className="w-6 h-6 accent-black" />
                    <span>Manifesto Modus</span>
                  </label>
                )}
                <textarea className="w-full bg-white border-4 border-black p-4 h-64 md:h-96 text-lg font-bold outline-none focus:bg-yellow-50 resize-none" placeholder="RAW_DATA_ENTRY..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-black text-white py-6 font-black text-2xl md:text-4xl uppercase italic tracking-tighter hover:bg-yellow-300 hover:text-black transition-all shadow-[10px_10px_0_0_rgba(0,0,0,1)]">PUSH_TO_CLOUD_</button>
            </form>
          </div>
        </div>
      )}

      {/* GRID VIEW */}
      {view === 'grid' && (
        <main className="p-4 md:p-12">
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 md:gap-8 max-w-[1700px] mx-auto space-y-4 md:space-y-8">
            {posts.map((post) => (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className={`
                  break-inside-avoid border-2 md:border-4 border-black group cursor-pointer transition-all mb-4 md:mb-8
                  shadow-[4px_4px_0_0_rgba(0,0,0,1)] md:shadow-[8px_8px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1
                  ${post.type === 'art' ? 'bg-black p-0.5' : 'p-4 md:p-8'}
                  ${post.isTitle ? 'bg-white italic border-l-[8px] md:border-l-[15px]' : post.type === 'blog' ? 'bg-yellow-300' : ''}
                `}
              >
                {post.type === 'blog' && (
                  <div className="space-y-2 md:space-y-4">
                    <p className={`font-black tracking-tighter leading-tight uppercase ${post.isTitle ? 'text-lg md:text-3xl' : 'text-[9px] md:text-[12px] line-clamp-[10]'}`}>
                      {post.isTitle ? `"${post.content}"` : post.content}
                    </p>
                    <div className="text-[7px] md:text-[10px] font-black opacity-40 text-right uppercase italic underline underline-offset-4">{post.date}</div>
                  </div>
                )}

                {post.type === 'art' && (
                  <div className="relative">
                    <img src={post.src} alt={post.title} className="w-full h-auto grayscale group-hover:grayscale-0 transition-all duration-700 block" onError={(e) => { e.target.src = 'https://via.placeholder.com/400?text=DATA_MISSING'; }} />
                    <div className="absolute top-2 left-2 bg-white border-2 border-black px-2 py-0.5 text-[7px] md:text-[10px] font-black uppercase italic shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
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
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-2 md:p-12 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setSelectedPost(null)}>
          <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto bg-white border-4 md:border-[10px] border-black p-6 md:p-16 relative shadow-[10px_10px_0_0_rgba(0,0,0,1)] md:shadow-[30px_30px_0_0_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 md:mb-16 border-b-4 md:border-b-[12px] border-black pb-6 md:pb-12">
              <h2 className="text-3xl md:text-7xl font-black uppercase italic tracking-tighter underline underline-offset-[10px] decoration-yellow-300 leading-tight">
                {selectedPost.title || (selectedPost.isTitle ? 'Manifesto' : 'Entry')}
              </h2>
              <button onClick={() => setSelectedPost(null)} className="bg-black text-white px-6 py-2 md:px-10 md:py-5 font-black text-xs md:text-sm border-2 md:border-4 border-black shadow-[4px_4px_0_0_rgba(255,235,59,1)] hover:bg-yellow-300 hover:text-black">EXIT_</button>
            </div>

            <div className="space-y-12">
              {selectedPost.type === 'art' && (
                <div className="border-4 md:border-[12px] border-black p-1 md:p-3 bg-black">
                  <img src={selectedPost.src} className="w-full h-auto grayscale hover:grayscale-0 transition-all duration-1000 border-2 md:border-4 border-white" alt="Art" />
                </div>
              )}
              <div className="text-xl md:text-5xl leading-[1.1] font-black text-black text-justify whitespace-pre-wrap tracking-tighter uppercase selection:bg-yellow-300">
                {selectedPost.content}
              </div>

              {/* COMMENTS SECTION */}
              <div className="mt-16 md:mt-32 border-t-4 md:border-t-8 border-black pt-8 md:pt-16">
                <h3 className="text-xl md:text-4xl font-black uppercase italic mb-8 underline">Responses_</h3>
                <div className="space-y-4 md:space-y-8 mb-12">
                  {comments.length === 0 ? <p className="text-[10px] md:text-xs font-bold opacity-30 italic">Nog geen reacties...</p> : 
                    comments.map(c => (
                      <div key={c.id} className={`p-4 border-2 md:border-4 border-black flex gap-4 ${c.isAdmin ? 'bg-yellow-300' : 'bg-white'} shadow-[4px_4px_0_0_rgba(0,0,0,1)]`}>
                        {c.userPhoto && <img src={c.userPhoto} className="w-8 h-8 md:w-12 md:h-12 border-2 border-black grayscale" alt="av" />}
                        <div>
                          <p className="text-[8px] md:text-[10px] font-black uppercase opacity-50 mb-1">{c.userName} // {c.isAdmin ? 'ADMIN' : 'GEBRUIKER'}</p>
                          <p className="text-xs md:text-xl font-bold uppercase tracking-tight">{c.text}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>

                {user ? (
                  <form onSubmit={handleAddComment} className="flex flex-col gap-4">
                    <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="SCHRIJF_JE_REACTIE..." className="w-full border-4 border-black p-4 text-xs md:text-xl font-bold focus:bg-yellow-50 outline-none shadow-[6px_6px_0_0_rgba(0,0,0,1)]" />
                    <button type="submit" className="bg-black text-white py-4 md:py-6 font-black uppercase text-xs md:text-xl hover:bg-yellow-300 hover:text-black transition-all shadow-[8px_8px_0_0_rgba(0,0,0,1)]">SEND_ENTRY</button>
                  </form>
                ) : (
                  <button onClick={login} className="w-full border-4 border-dashed border-black p-6 md:p-10 text-[10px] md:text-xl font-black uppercase hover:bg-yellow-300 transition-colors">LOGIN_OM_TE_REAGEREN_</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}