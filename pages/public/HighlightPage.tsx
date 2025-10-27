import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getHighlightWorks } from '../../services/api';
import { HighlightWork } from '../../types';
import HighlightCard from '../../components/public/HighlightCard';
import MediaModal from '../../components/public/MediaModal';
import { Loader2, Home } from 'lucide-react';
import { motion } from 'framer-motion';

const filterCategories: (HighlightWork['category'] | 'All')[] = ['All', 'Client', 'PKL', 'Event', 'BTS'];

const SkeletonCard = () => (
    <div className="bg-base-200 rounded-2xl animate-pulse aspect-video"></div>
);

const HighlightPage = () => {
  const [works, setWorks] = useState<HighlightWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<typeof filterCategories[number]>('All');
  const [selectedWork, setSelectedWork] = useState<HighlightWork | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getHighlightWorks();
      setWorks(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredWorks = useMemo(() => {
    if (activeCategory === 'All') return works;
    return works.filter(w => w.category === activeCategory);
  }, [works, activeCategory]);

  return (
    <div className="min-h-screen bg-base-100 text-base-content font-sans">
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-primary">
            Highlight <span className="text-accent">Wall</span>
          </h1>
          <Link to="/" className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors">
            <Home size={18} />
            <span className="hidden sm:inline">Beranda</span>
          </Link>
        </div>
        <p className="max-w-7xl mx-auto mt-2 text-muted">Kumpulan karya terbaik dari para intern dan klien di Studio 8.</p>
      </header>

      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
            {/* Filter Bar */}
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-8 flex-wrap">
              {filterCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 transform hover:scale-105 ${
                    activeCategory === cat
                      ? 'bg-accent text-accent-content shadow-lg'
                      : 'bg-white border border-base-200 text-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                initial="hidden"
                animate="visible"
            >
              {filteredWorks.map((work, index) => (
                <HighlightCard 
                    key={work.id} 
                    work={work} 
                    index={index} 
                    onClick={() => setSelectedWork(work)} 
                />
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <MediaModal work={selectedWork} isOpen={!!selectedWork} onClose={() => setSelectedWork(null)} />

       <footer className="py-6 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} Studio 8. All rights reserved.
      </footer>
    </div>
  );
};

export default HighlightPage;