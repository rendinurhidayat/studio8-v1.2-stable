



import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPackages, getAddOns } from '../services/api';
import { Package, AddOn, SubAddOn, CartItem } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Check, ArrowRight, Home, ChevronLeft, ChevronRight, Sparkles, Filter, ChevronDown, ShoppingCart, MessageSquare, Users, Clock, Camera as CameraIcon, Award, Star, Trash2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import ChatbotModal from '../components/common/ChatbotModal';

// --- TYPE EXTENSIONS ---
interface PackageWithDetails extends Package {
  category: string;
  features: { icon: React.ReactNode; text: string }[];
  priceDisplay: string;
  imageUrls: string[];
  badge?: 'Terpopuler' | 'Best Value';
  tags: string[];
}

interface AiRecommendation {
    recommendedPackageName: string;
    reasoning: string;
}

const CATEGORIES = ['All', 'Self Photo', 'Couple/Group', 'Yearbook', 'Prewedding/Wedding', 'Event'];

// --- HELPER FUNCTIONS ---

const getOptimizedImageUrl = (url: string, width: number): string => {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url;
    }
    const parts = url.split('/upload/');
    if (parts.length !== 2) {
        return url;
    }
    const transformations = `w_${width},c_limit,q_auto,f_auto`;
    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
};


const getCategoryForPackage = (pkg: Package): string => {
  const name = pkg.name.toLowerCase();
  if (name.includes('self')) return 'Self Photo';
  if (name.includes('couple') || name.includes('group') || name.includes('berdua') || name.includes('grup') || pkg.isGroupPackage) return 'Couple/Group';
  if (name.includes('yearbook') || name.includes('buktah')) return 'Yearbook';
  if (name.includes('prewedd') || name.includes('wedding')) return 'Prewedding/Wedding';
  if (name.includes('event')) return 'Event';
  return 'Lainnya';
};

const getPriceDisplay = (pkg: Package): string => {
  if (pkg.name.toLowerCase().includes('seikhlasnya')) {
    return 'Bayar Seikhlasnya';
  }
  if (pkg.subPackages && pkg.subPackages.length > 0) {
    const minPrice = Math.min(...pkg.subPackages.map(sp => sp.price));
    return `Mulai Rp ${minPrice.toLocaleString('id-ID')}`;
  }
  return 'Hubungi Kami';
};

// --- SUB-COMPONENTS ---

const Header = () => {
  const { cartCount } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openCart = () => {
    window.dispatchEvent(new CustomEvent('open-cart'));
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-sm shadow-sm' : 'bg-base-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
        <Link to="/" className={`text-2xl font-bold transition-colors text-primary font-poppins`}>
          STUDIO <span className="text-accent">8</span>
        </Link>
        <nav className="flex items-center gap-4 md:gap-6">
            <Link to="/" className={`text-sm font-semibold transition-colors text-muted hover:text-accent`}>
                Beranda
            </Link>
            <div className={`h-6 w-px transition-colors bg-base-300`}></div>
            <button
                onClick={openCart}
                title="Keranjang"
                className={`relative p-2 rounded-full transition-colors text-muted hover:text-accent hover:bg-base-200`}
            >
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-4 w-4">
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-accent text-white text-xs items-center justify-center">{cartCount}</span>
                    </span>
                )}
            </button>
        </nav>
      </div>
    </header>
  );
};

const PackageModal: React.FC<{ pkg: PackageWithDetails | null; addOns: AddOn[]; onClose: () => void }> = ({ pkg, addOns, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSubPackageId, setSelectedSubPackageId] = useState<string>('');
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const { addToCart } = useCart();
  const [showAdded, setShowAdded] = useState(false);

  useEffect(() => {
    if (pkg) {
      setSelectedSubPackageId('');
      setSelectedAddOnIds(pkg.recommendedAddOnIds || []);
      setCurrentIndex(0);
    }
  }, [pkg]);

  if (!pkg) return null;

  const nextSlide = () => setCurrentIndex((prevIndex) => (prevIndex + 1) % pkg.imageUrls.length);
  const prevSlide = () => setCurrentIndex((prevIndex) => (prevIndex - 1 + pkg.imageUrls.length) % pkg.imageUrls.length);

  const handleAddToCart = () => {
    if (!selectedSubPackageId) {
      alert("Pilih varian paket terlebih dahulu!");
      return;
    }
    const subPkg = pkg.subPackages.find(sp => sp.id === selectedSubPackageId);
    if (!subPkg) return;

    const allSubAddOns = addOns.flatMap(a => a.subAddOns);
    const selectedAddOns = allSubAddOns.filter(sa => selectedAddOnIds.includes(sa.id));

    const cartItem: CartItem = {
      id: `${subPkg.id}-${Date.now()}`,
      pkg,
      subPkg,
      addOns: selectedAddOns,
      packageId: pkg.id,
      subPackageId: subPkg.id,
      subAddOnIds: selectedAddOnIds,
    };
    addToCart(cartItem);
    setShowAdded(true);
    setTimeout(() => {
      setShowAdded(false);
      onClose();
    }, 1500);
  };

  const handleToggleAddOn = (subAddOnId: string) => {
    setSelectedAddOnIds(prev => prev.includes(subAddOnId) ? prev.filter(id => id !== subAddOnId) : [...prev, subAddOnId]);
  };

  return (
    <AnimatePresence>
      {pkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white text-base-content rounded-2xl flex flex-col md:flex-row overflow-hidden border border-base-200 shadow-xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 text-muted bg-base-100 rounded-full hover:bg-base-200"><X size={20} /></button>
            <div className="relative w-full md:w-1/2 h-64 md:h-auto flex-shrink-0 bg-base-200">
                <AnimatePresence mode="wait">
                    <motion.img key={currentIndex} src={getOptimizedImageUrl(pkg.imageUrls[currentIndex], 800)} alt={pkg.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="w-full h-full object-cover"/>
                </AnimatePresence>
                {pkg.imageUrls.length > 1 && (<>
                    <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50"><ChevronLeft/></button>
                    <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50"><ChevronRight/></button>
                </>)}
                 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">{pkg.imageUrls.map((_, index) => (<div key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 rounded-full cursor-pointer ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`} />))}</div>
            </div>
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
              <h2 className="font-poppins text-3xl font-bold text-primary">{pkg.name}</h2>
              <p className="mt-4 text-muted text-sm leading-relaxed">{pkg.description}</p>
              
              <div className="mt-6 pt-4 border-t border-base-200">
                <h3 className="font-semibold text-lg text-primary">1. Pilih Varian Paket</h3>
                <div className="mt-2 space-y-2">{pkg.subPackages.map(sub => (
                    <div key={sub.id} onClick={() => setSelectedSubPackageId(sub.id)} className={`p-3 border-2 rounded-lg cursor-pointer ${selectedSubPackageId === sub.id ? 'border-accent bg-accent/10' : 'border-base-200 hover:border-accent/50'}`}>
                      <div className="flex justify-between items-center"><p className="font-semibold text-base-content">{sub.name}</p><p className="font-bold text-accent">Rp {sub.price.toLocaleString('id-ID')}</p></div>
                      {sub.description && (<p className="text-sm text-muted mt-1">{sub.description}</p>)}
                    </div>))}
                </div>
              </div>

              {addOns.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-base-200">
                      <h3 className="font-semibold text-lg text-primary">2. Layanan Tambahan (Opsional)</h3>
                      <div className="mt-2 space-y-3">{addOns.map(addon => (<div key={addon.id}>
                          <p className="font-semibold text-sm text-base-content">{addon.name}</p>
                          <div className="mt-1 space-y-1">{addon.subAddOns.map(sub => (
                              <label key={sub.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border ${selectedAddOnIds.includes(sub.id) ? 'bg-accent/10 border-accent/30' : 'bg-base-100'}`}>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={selectedAddOnIds.includes(sub.id)} onChange={() => handleToggleAddOn(sub.id)} className="h-4 w-4 rounded text-primary focus:ring-primary/50"/>
                                  <span className="text-sm text-base-content">{sub.name}</span>
                                </div>
                                <span className="font-semibold text-sm">+ Rp {sub.price.toLocaleString('id-ID')}</span>
                              </label>
                          ))}</div>
                      </div>))}</div>
                  </div>
              )}
              
              <div className="mt-auto pt-6">
                <button onClick={handleAddToCart} disabled={!selectedSubPackageId || showAdded} className="w-full text-center flex items-center justify-center gap-2 bg-primary text-primary-content px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-lg disabled:opacity-50">
                  {showAdded ? <><Check/> Ditambahkan!</> : <><ShoppingCart size={18}/> Tambah ke Keranjang</>}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const CardCarousel: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % images.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [images.length]);

    return (
        <div className="relative overflow-hidden aspect-[3/2] bg-base-200 rounded-t-2xl">
            <AnimatePresence mode="wait">
                <motion.img key={currentIndex} src={getOptimizedImageUrl(images[currentIndex], 400)} alt={`Showcase ${currentIndex + 1}`} loading="lazy" decoding="async" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            {images.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                    {images.map((_, index) => (<div key={index} className={`h-1.5 rounded-full transition-all ${currentIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />))}
                </div>
            )}
        </div>
    );
};

const CartSummary: React.FC = () => {
    const { cart, removeFromCart } = useCart();
    const navigate = useNavigate();
    const total = cart.reduce((sum, item) => sum + item.subPkg.price + item.addOns.reduce((a, b) => a + b.price, 0), 0);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-base-200">
            <h3 className="font-poppins text-xl font-bold text-primary border-b pb-3 mb-4 flex items-center gap-2"><ShoppingCart size={20}/> Ringkasan Keranjang</h3>
            {cart.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Keranjangmu masih kosong.</p>
            ) : (
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-start gap-3">
                            <img src={getOptimizedImageUrl(item.pkg.imageUrls?.[0] || '/images/hero-1.jpg', 100)} alt={item.pkg.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                            <div className="flex-grow">
                                <p className="font-semibold text-sm text-base-content leading-tight">{item.pkg.name}</p>
                                <p className="text-xs text-muted">{item.subPkg.name}</p>
                            </div>
                            <button onClick={() => removeFromCart(item.id)} className="p-1 text-muted hover:text-error"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            )}
            {cart.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-baseline mb-4">
                        <span className="font-semibold text-base-content">Total</span>
                        <span className="font-poppins font-bold text-xl text-accent">Rp {total.toLocaleString('id-ID')}</span>
                    </div>
                    <button onClick={() => navigate('/pesan-sesi?fromCart=true')} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-xl hover:bg-primary/90 transition-colors shadow-lg">
                        Lanjut ke Pemesanan
                    </button>
                </div>
            )}
        </div>
    );
};

const AiRecommenderModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    packages: PackageWithDetails[];
    onRecommendationSelect: (pkg: PackageWithDetails) => void;
}> = ({ isOpen, onClose, packages, onRecommendationSelect }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AiRecommendation | null>(null);
    const [error, setError] = useState('');

    const handleGetRecommendation = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setResult(null);
        setError('');
        try {
            const packageInfo = packages.map(p => ({
                name: p.name,
                description: p.description,
                subPackages: p.subPackages.map(sp => ({ name: sp.name, price: sp.price }))
            }));

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'recommendPackage',
                    userQuery: query,
                    packages: packageInfo
                }),
            });
            if (!response.ok) {
                throw new Error('Gagal mendapatkan rekomendasi dari AI.');
            }
            const data: AiRecommendation = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectPackage = () => {
        if (!result) return;
        const selected = packages.find(p => p.name === result.recommendedPackageName);
        if (selected) {
            onRecommendationSelect(selected);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResult(null);
            setError('');
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-xl"
                    >
                         <h2 className="text-xl font-bold text-primary flex items-center gap-2"><Sparkles /> Dapatkan Rekomendasi Paket dari AI</h2>
                         <p className="text-sm text-muted mt-2">Bingung pilih paket? Jelaskan kebutuhanmu di bawah ini, dan biarkan AI kami membantu!</p>
                         
                         <div className="mt-4 space-y-4">
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Contoh: foto wisuda bareng pacar, foto grup 5 orang untuk buku tahunan..."
                                rows={3}
                                className="w-full p-3 bg-base-100 border rounded-lg focus:ring-2 focus:ring-accent focus:outline-none"
                            />
                            <button onClick={handleGetRecommendation} disabled={isLoading || !query.trim()} className="w-full flex justify-center items-center gap-2 p-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                {isLoading ? <Loader2 className="animate-spin"/> : 'Dapatkan Rekomendasi'}
                            </button>
                         </div>
                         
                         {error && <p className="mt-4 text-sm text-center text-error">{error}</p>}

                         {result && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 pt-4 border-t">
                                <h3 className="font-semibold text-primary">Rekomendasi Terbaik Untukmu:</h3>
                                <div className="mt-2 p-4 bg-accent/10 rounded-lg border border-accent/30">
                                    <p className="font-bold text-lg text-accent">{result.recommendedPackageName}</p>
                                    <p className="text-sm mt-1">{result.reasoning}</p>
                                    <button onClick={handleSelectPackage} className="mt-3 text-sm font-semibold text-accent hover:underline">
                                        Lihat Detail Paket &rarr;
                                    </button>
                                </div>
                            </motion.div>
                         )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


const PackagesPage = () => {
    const [packages, setPackages] = useState<PackageWithDetails[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedPackage, setSelectedPackage] = useState<PackageWithDetails | null>(null);
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [packagesData, addOnsData] = await Promise.all([getPackages(), getAddOns()]);
                const enhancedPackages = packagesData.map(p => {
                    const defaultImages = ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg'];
                    const features = [];
                    const pName = p.name.toLowerCase();
                    if (p.isGroupPackage || pName.includes('group') || pName.includes('couple') || pName.includes('berdua')) features.push({ icon: <Users size={16} />, text: '2+ Orang' }); else features.push({ icon: <Users size={16} />, text: '1 Orang' });
                    if (pName.includes('15 menit')) features.push({ icon: <Clock size={16} />, text: '15 Menit Sesi' }); else if (pName.includes('30 menit')) features.push({ icon: <Clock size={16} />, text: '30 Menit Sesi' }); else features.push({ icon: <Clock size={16} />, text: 'Durasi Fleksibel' });
                    if (pName.includes('all files')) features.push({ icon: <CameraIcon size={16} />, text: 'Semua File' }); else features.push({ icon: <CameraIcon size={16} />, text: 'File Pilihan' });
                    const tags = [];
                    if (pName.includes('wisuda')) tags.push('Wisuda'); if (pName.includes('couple') || pName.includes('berdua')) tags.push('Pasangan'); if (pName.includes('grup') || pName.includes('group')) tags.push('Grup'); if (pName.includes('maternity')) tags.push('Maternity'); if (pName.includes('yearbook')) tags.push('Buku Tahunan'); if (pName.includes('prewedd')) tags.push('Prewedding');
                    let badge: PackageWithDetails['badge'];
                    if (pName.includes('grup hemat') || pName.includes('group hemat')) badge = 'Best Value'; if (pName.includes('couple') || pName.includes('self photo')) badge = 'Terpopuler';
                    return { ...p, category: getCategoryForPackage(p), features, priceDisplay: getPriceDisplay(p), imageUrls: (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls : defaultImages, badge, tags };
                });
                setPackages(enhancedPackages);
                setAddOns(addOnsData);
            } catch (error) { console.error("Failed to fetch package data:", error); } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const filteredPackages = useMemo(() => {
        if (activeCategory === 'All') return packages;
        return packages.filter(p => p.category === activeCategory);
    }, [packages, activeCategory]);
    
    const pageContext = useMemo(() => {
        if (packages.length === 0) return '';
        const packageList = packages.map(p => `- ${p.name}: ${p.description.split('.')[0]}. Harga ${p.priceDisplay}.`).join('\n');
        return `Pengguna saat ini sedang melihat halaman 'Daftar Paket'. Berikut adalah daftar paket yang tersedia:\n${packageList}`;
    }, [packages]);

    const handleRecommendationSelect = (pkg: PackageWithDetails) => {
        setIsAiModalOpen(false);
        setTimeout(() => {
            setSelectedPackage(pkg);
        }, 100); // Small delay for smoother transition
    };

    return (
        <div className="bg-base-100 min-h-screen">
            <Header />
            <main>
                 <div className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-b text-center">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="font-poppins text-4xl md:text-5xl font-extrabold text-primary">
                            Temukan Sesi <span className="text-accent">Impianmu</span>
                        </h1>
                        <p className="mt-4 max-w-xl mx-auto text-muted">Pilih sesi foto yang paling pas untuk momen berhargamu. Dari sesi kilat sendiri hingga foto grup, semua ada di sini.</p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Left Column: Packages */}
                        <div className="lg:col-span-2">
                             <div className="sticky top-20 z-10 bg-base-100/80 backdrop-blur-sm py-4 mb-8 -mx-4 px-4 border-y">
                                <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap">
                                  {CATEGORIES.map(cat => (
                                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${activeCategory === cat ? 'bg-primary text-white shadow-md' : 'bg-white border text-muted'}`}>{cat}</button>
                                  ))}
                                </div>
                            </div>
                            
                            {loading ? (
                                <div className="flex justify-center p-16"><Loader2 className="animate-spin text-primary" size={48} /></div>
                            ) : (
                                <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 } } }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {filteredPackages.map(pkg => (
                                        <motion.div
                                            key={pkg.id}
                                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                            onClick={() => setSelectedPackage(pkg)}
                                            className="bg-white rounded-2xl cursor-pointer group border border-base-200/50 hover:border-accent transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-2 relative"
                                        >
                                            {pkg.badge && (<div className={`absolute top-0 right-4 -mt-2.5 z-10 px-3 py-1 text-xs font-bold text-white rounded-full shadow-md ${pkg.badge === 'Terpopuler' ? 'bg-pink-500' : 'bg-amber-500'}`}>{pkg.badge === 'Terpopuler' ? <Star size={12} className="inline -mt-0.5 mr-1" /> : <Award size={12} className="inline -mt-0.5 mr-1" />}{pkg.badge}</div>)}
                                            <CardCarousel images={pkg.imageUrls} />
                                            <div className="p-5 flex flex-col">
                                                <div className="flex-grow">
                                                    <h3 className="font-poppins text-xl font-bold text-primary truncate">{pkg.name}</h3>
                                                    <p className="mt-1 text-lg font-semibold text-accent">{pkg.priceDisplay}</p>
                                                    <div className="mt-4 space-y-2 text-sm text-muted">{pkg.features.map((feature, i) => (<div key={i} className="flex items-center gap-2"><span className="text-accent">{feature.icon}</span><span>{feature.text}</span></div>))}</div>
                                                    {pkg.tags.length > 0 && (<div className="mt-4 flex flex-wrap gap-2">{pkg.tags.map(tag => (<span key={tag} className="text-xs font-semibold bg-base-200 text-muted px-2 py-1 rounded-full">{tag}</span>))}</div>)}
                                                </div>
                                                <div className="mt-6 pt-4 border-t border-base-200/50"><div className="flex justify-between items-center text-accent font-semibold"><span>Lihat Detail</span><ArrowRight size={20} className="transform transition-transform group-hover:translate-x-1" /></div></div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </div>

                        {/* Right Column: Cart Summary */}
                        <div className="lg:col-span-1 relative">
                            <div className="sticky top-24">
                                <CartSummary />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <PackageModal pkg={selectedPackage} addOns={addOns} onClose={() => setSelectedPackage(null)} />
            
            <AiRecommenderModal 
                isOpen={isAiModalOpen} 
                onClose={() => setIsAiModalOpen(false)}
                packages={packages}
                onRecommendationSelect={handleRecommendationSelect}
            />
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} pageContext={pageContext} pageKey="packages"/>
            
            <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
                <motion.button
                    initial={{ opacity: 0, y: 20, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
                    onClick={() => setIsAiModalOpen(true)}
                    className="bg-primary text-primary-content px-4 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center gap-2"
                    title="Rekomendasi Paket (AI)"
                >
                    <Sparkles size={18} />
                    <span className="text-sm font-semibold">Rekomendasi AI</span>
                </motion.button>
                <motion.button
                    initial={{ opacity: 0, y: 20, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                    onClick={() => setIsChatbotOpen(true)}
                    className="bg-accent text-accent-content px-4 py-2 rounded-full shadow-lg hover:bg-accent/90 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent flex items-center gap-2"
                    title="Butuh Bantuan? Tanya AI!"
                >
                    <MessageSquare size={18} />
                    <span className="text-sm font-semibold">Tanya Bantuan</span>
                </motion.button>
            </div>
        </div>
    );
};

export default PackagesPage;