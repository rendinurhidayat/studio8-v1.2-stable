import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPackages, getAddOns } from '../services/api';
import { Package, AddOn } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, Check, ArrowRight, Home, ChevronLeft, ChevronRight, Sparkles, Filter, ChevronDown } from 'lucide-react';

// --- TYPE EXTENSIONS ---
interface PackageWithDetails extends Package {
  category: string;
  features: string[];
  priceDisplay: string;
  imageUrls: string[];
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
    // c_limit prevents upscaling. q_auto optimizes quality. f_auto selects modern format (like WebP).
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

const Header = () => (
    <header className="py-6 px-4 sm:px-6 lg:px-8 bg-white border-b">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-primary">
                    Daftar <span className="text-accent">Paket</span>
                </h1>
                <p className="mt-1 text-muted">Pilih paket yang paling sesuai dengan kebutuhanmu.</p>
            </div>
          <Link to="/" className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors">
            <Home size={18} />
            <span className="hidden sm:inline">Beranda</span>
          </Link>
        </div>
      </header>
);

const PackageModal: React.FC<{ pkg: PackageWithDetails | null; addOns: AddOn[]; onClose: () => void }> = ({ pkg, addOns, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const recommendedAddOns = useMemo(() => {
    if (!pkg?.recommendedAddOnIds) {
        return [];
    }
    return addOns.filter(addon => pkg.recommendedAddOnIds!.includes(addon.id));
  }, [pkg, addOns]);

  if (!pkg) return null;

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % pkg.imageUrls.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + pkg.imageUrls.length) % pkg.imageUrls.length);
  };

  return (
    <AnimatePresence>
      {pkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[90vh] bg-white text-base-content rounded-2xl flex flex-col md:flex-row overflow-hidden border border-base-200 shadow-xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 text-muted bg-base-100 rounded-full hover:bg-base-200"><X size={20} /></button>
            <div className="relative w-full md:w-1/2 h-64 md:h-auto flex-shrink-0 bg-base-200">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={currentIndex}
                        src={getOptimizedImageUrl(pkg.imageUrls[currentIndex], 800)}
                        alt={pkg.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full object-cover"
                    />
                </AnimatePresence>
                {pkg.imageUrls.length > 1 && (
                    <>
                        <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50"><ChevronLeft/></button>
                        <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50"><ChevronRight/></button>
                    </>
                )}
                 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    {pkg.imageUrls.map((_, index) => (
                        <div key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 rounded-full cursor-pointer ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                </div>
            </div>
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
              <h2 className="font-poppins text-3xl font-bold text-primary">{pkg.name}</h2>
              <p className="mt-4 text-muted text-sm leading-relaxed">{pkg.description}</p>
              
              <div className="mt-6 pt-4 border-t border-base-200">
                <h3 className="font-semibold text-lg text-primary">Pilihan Varian Paket</h3>
                <div className="mt-2 space-y-2">
                  {pkg.subPackages.map(sub => (
                    <div key={sub.id} className="p-3 bg-base-100 rounded-lg">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-base-content">{sub.name}</p>
                        <p className="font-bold text-accent">Rp {sub.price.toLocaleString('id-ID')}</p>
                      </div>
                      {sub.description && (
                        <p className="text-sm text-muted mt-1">{sub.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {recommendedAddOns.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-base-200">
                      <h3 className="font-semibold text-lg text-primary">Layanan Tambahan Populer</h3>
                      <div className="mt-2 space-y-3">
                          {recommendedAddOns.map(addon => (
                              <div key={addon.id}>
                                  <p className="font-semibold text-sm text-base-content">{addon.name}</p>
                                  <ul className="mt-1 space-y-1 text-sm text-muted">
                                      {addon.subAddOns.map(sub => (
                                          <li key={sub.id} className="flex justify-between items-center">
                                              <span>+ {sub.name}</span>
                                              <span className="font-semibold text-base-content text-right">Rp {sub.price.toLocaleString('id-ID')}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              
              <div className="mt-auto pt-6">
                <Link to={`/pesan-sesi`} className="w-full text-center block bg-primary text-primary-content px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-lg">
                  Booking Sekarang
                </Link>
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
        <div className="relative overflow-hidden aspect-[3/2]">
            <AnimatePresence mode="wait">
                <motion.img
                    key={currentIndex}
                    src={getOptimizedImageUrl(images[currentIndex], 400)}
                    alt={`Showcase ${currentIndex + 1}`}
                    loading="lazy"
                    decoding="async"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            {images.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                    {images.map((_, index) => (
                        <div key={index} className={`h-1.5 rounded-full transition-all ${currentIndex === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                    ))}
                </div>
            )}
        </div>
    );
};

const AIRecommender: React.FC<{ packages: PackageWithDetails[] }> = ({ packages }) => {
    const [userQuery, setUserQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [recommendation, setRecommendation] = useState<{ recommendedPackageName: string; reasoning: string } | null>(null);
    // const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string }), []);

    const handleGetRecommendation = async () => {
        if (!userQuery.trim()) return;
        setIsLoading(true);
        setError('');
        setRecommendation(null);

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
                    userQuery: userQuery,
                    packages: packageInfo,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal mendapatkan rekomendasi AI.');
            }

            const result = await response.json();
            setRecommendation(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToPackage = (packageName: string) => {
        const packageId = `package-${packageName.replace(/\s+/g, '-')}`;
        document.getElementById(packageId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="bg-gradient-to-r from-primary to-blue-900 text-white p-6 md:p-8 rounded-2xl shadow-xl my-8">
            <div className="flex items-center gap-4">
                <Sparkles size={40} className="text-gold" />
                <div>
                    <h2 className="text-2xl font-bold">Bingung Pilih Paket?</h2>
                    <p className="text-white/80">Biarkan asisten AI kami membantumu menemukan paket yang sempurna!</p>
                </div>
            </div>
            <div className="mt-4">
                <textarea
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Contoh: Saya mau foto wisuda sendiri, budget sekitar 200 ribu..."
                    className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50 border-2 border-transparent focus:border-accent focus:outline-none focus:bg-white/20 transition"
                    rows={2}
                />
                <button
                    onClick={handleGetRecommendation}
                    disabled={isLoading}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-accent text-accent-content font-bold py-3 px-4 rounded-lg hover:bg-accent/90 transition-transform transform hover:scale-105 disabled:opacity-60"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : "Dapatkan Rekomendasi"}
                </button>
            </div>
            <AnimatePresence>
                {recommendation && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-black/30 rounded-lg"
                    >
                        <p className="text-sm text-white/80">AI merekomendasikan:</p>
                        <button
                            onClick={() => scrollToPackage(recommendation.recommendedPackageName)}
                            className="text-lg font-bold text-gold hover:underline"
                        >
                            {recommendation.recommendedPackageName}
                        </button>
                        <p className="text-sm mt-1 text-white/90">{recommendation.reasoning}</p>
                    </motion.div>
                )}
            </AnimatePresence>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
    );
};


const PackagesPage = () => {
    const [packages, setPackages] = useState<PackageWithDetails[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedPackage, setSelectedPackage] = useState<PackageWithDetails | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [packagesData, addOnsData] = await Promise.all([getPackages(), getAddOns()]);
                const enhancedPackages = packagesData.map(p => {
                    const defaultImages = [
                        '/images/hero-1.jpg',
                        '/images/hero-2.jpg',
                        '/images/hero-3.jpg'
                    ];
                    return {
                        ...p,
                        category: getCategoryForPackage(p),
                        features: p.description.split('\n').map(f => f.replace(/^- /, '')).slice(0, 3),
                        priceDisplay: getPriceDisplay(p),
                        imageUrls: (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls : defaultImages,
                    };
                });
                setPackages(enhancedPackages);
                setAddOns(addOnsData);
            } catch (error) {
                console.error("Failed to fetch package data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredPackages = useMemo(() => {
        if (activeCategory === 'All') return packages;
        return packages.filter(p => p.category === activeCategory);
    }, [packages, activeCategory]);

    return (
        <div className="bg-base-100 min-h-screen">
            <Header />
            <main>
                <div className="max-w-7xl mx-auto px-4">
                     <AIRecommender packages={packages} />
                </div>
               
                {/* Filter Tabs */}
                 <div className="sticky top-0 z-10 bg-base-100/80 backdrop-blur-sm py-4 border-y">
                    <div className="max-w-md mx-auto px-4">
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Filter className="h-5 w-5 text-muted" />
                            </div>
                            <select
                                value={activeCategory}
                                onChange={(e) => setActiveCategory(e.target.value)}
                                className="w-full appearance-none bg-white border-2 border-base-200 rounded-xl pl-10 pr-10 py-3 text-base-content font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                                aria-label="Filter kategori paket"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>
                                        {cat === 'All' ? 'Tampilkan Semua Kategori' : cat}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                                <ChevronDown className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>


                {/* Package Grid */}
                <section className="py-12 md:py-16 px-4">
                    <div className="max-w-7xl mx-auto">
                        {loading ? (
                            <div className="flex justify-center"><Loader2 className="animate-spin text-primary" size={48} /></div>
                        ) : (
                            <motion.div
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: { transition: { staggerChildren: 0.1 } }
                                }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                            >
                                {filteredPackages.map(pkg => (
                                    <motion.div
                                        key={pkg.id}
                                        id={`package-${pkg.name.replace(/\s+/g, '-')}`}
                                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                                        onClick={() => setSelectedPackage(pkg)}
                                        className="bg-white rounded-2xl overflow-hidden cursor-pointer group border border-base-200 hover:border-accent hover:shadow-xl transition-all duration-300 shadow-lg"
                                    >
                                        <CardCarousel images={pkg.imageUrls} />
                                        <div className="p-6">
                                            <h3 className="text-xl font-bold text-primary">{pkg.name}</h3>
                                            <p className="mt-1 text-lg font-semibold text-accent">{pkg.priceDisplay}</p>
                                            <ul className="mt-4 space-y-2 text-sm text-muted">
                                                {pkg.features.map((feature, i) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <Check size={16} className="text-accent flex-shrink-0" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="mt-6 pt-4 border-t border-base-200">
                                                <div className="inline-flex items-center gap-2 text-center text-accent font-semibold group-hover:underline">
                                                    Lihat Detail <ArrowRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </section>
            </main>
            <PackageModal pkg={selectedPackage} addOns={addOns} onClose={() => setSelectedPackage(null)} />
        </div>
    );
};

export default PackagesPage;
