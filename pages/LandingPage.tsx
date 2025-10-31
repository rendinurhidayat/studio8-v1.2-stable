import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
    MessageSquare, 
    MapPin, 
    CalendarDays, 
    PencilLine, 
    PartyPopper, 
    Instagram, 
    MessageCircle, // for WhatsApp
    LogIn,
    UserCheck,
    ArrowRight,
    Camera,
    CheckCircle,
    Briefcase,
    Award
} from 'lucide-react';
import ChatbotModal from '../components/common/ChatbotModal';
import { getSystemSettings, getPublicFeedbacks } from '../services/api';
import { Feedback, SystemSettings } from '../types';
import StarRating from '../components/feedback/StarRating';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Section-specific animation variants
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.5,
      ease: 'easeOut',
    },
  }),
};

// --- New Components for Landing Page Structure ---

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


const Header = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const navLinks = [
      { id: 'about', label: 'Tentang Kami', type: 'scroll' as const },
      { id: 'showcase', label: 'Showcase', type: 'link' as const, href: '/highlight' },
      { id: 'how-it-works', label: 'Cara Kerja', type: 'scroll' as const },
      { id: 'collaboration', label: 'Kolaborasi', type: 'scroll' as const },
      { id: 'testimonials', label: 'Testimoni', type: 'scroll' as const },
      { id: 'location', label: 'Lokasi', type: 'scroll' as const }
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-sm shadow-md' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
        <h1 className={`text-2xl font-bold transition-colors ${scrolled ? 'text-base-content' : 'text-primary-content'}`}>STUDIO <span className={scrolled ? 'text-primary' : 'text-primary-content'}>8</span></h1>
        
        <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center space-x-8">
              {navLinks.map(link => (
                link.type === 'link' ? (
                   <Link key={link.id} to={link.href!} className={`capitalize text-sm font-medium transition-colors ${scrolled ? 'text-muted hover:text-accent' : 'text-primary-content/80 hover:text-primary-content'}`}>
                     {link.label}
                   </Link>
                ) : (
                   <button key={link.id} onClick={() => scrollToSection(link.id)} className={`capitalize text-sm font-medium transition-colors ${scrolled ? 'text-muted hover:text-accent' : 'text-primary-content/80 hover:text-primary-content'}`}>
                     {link.label}
                   </button>
                )
              ))}
            </nav>
            <div className={`h-6 w-px transition-colors ${scrolled ? 'bg-base-300' : 'bg-primary-content/30'}`}></div>
            <div className="flex items-center gap-4">
                <Link to="/auth" title="Login Tim" className={`p-2 rounded-full transition-colors ${scrolled ? 'text-muted hover:text-accent hover:bg-base-200' : 'text-primary-content/80 hover:text-primary-content hover:bg-white/10'}`}>
                    <LogIn size={20} />
                </Link>
            </div>
        </div>
        
        {/* Mobile View: Login button */}
        <div className="md:hidden">
             <Link to="/auth" title="Login Tim" className={`p-2 rounded-full transition-colors ${scrolled ? 'text-muted hover:text-accent hover:bg-base-200' : 'text-primary-content/80 hover:text-primary-content hover:bg-white/10'}`}>
                <LogIn size={20} />
            </Link>
        </div>
      </div>
    </header>
  );
}

const HeroSection: React.FC<{ images: string[] }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-play effect for the carousel
    useEffect(() => {
        if (images.length === 0) return;
        const timer = setTimeout(() => {
            const nextIndex = (currentIndex + 1) % images.length;
            setCurrentIndex(nextIndex);
        }, 4000); // Change image every 4 seconds
        return () => clearTimeout(timer);
    }, [currentIndex, images.length]);

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
            },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };
    
    const currentImageUrl = images[currentIndex];

    return (
        <section className="relative bg-[#0a0a0a] text-white overflow-hidden">
            <div className="container mx-auto px-6 md:px-12 min-h-screen flex items-center justify-center">
                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-32 lg:py-20">
                    {/* Left Section (Text) */}
                    <motion.div 
                        className="space-y-6 text-center lg:text-left z-10"
                        variants={container}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.p variants={item} className="uppercase tracking-[0.2em] text-gray-400 text-sm">STUDIO 8</motion.p>
                        <motion.h1 variants={item} className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                        Ekspresikan Waktumu,<br/>Ciptakan Bahagiamu.
                        </motion.h1>
                        <motion.p variants={item} className="text-base md:text-lg text-gray-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
                        Self Photo, Couple Session, atau Pemotretan Profesional — semua bisa diatur lewat sistem booking yang nyaman.
                        </motion.p>
                        <motion.div 
                            variants={item} 
                            className="flex flex-col items-center lg:items-start pt-4 gap-6"
                        >
                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full sm:w-auto">
                                <Link to="/pesan-sesi" className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] w-full sm:w-auto text-center">
                                    Booking Sekarang
                                </Link>
                                <Link to="/paket" className="border border-white/50 text-white/80 px-8 py-3 rounded-full font-semibold hover:bg-white/10 hover:border-white hover:text-white transition-colors duration-300 w-full sm:w-auto text-center">
                                    Lihat Paket & Harga
                                </Link>
                            </div>

                            <div className="text-center lg:text-left">
                                <p className="text-sm text-gray-400 mb-2">Udah booking? Cek status booking mu.</p>
                                <Link to="/cek-status" className="inline-block border border-accent text-accent px-6 py-2 rounded-full font-semibold hover:bg-accent/10 transition-colors duration-300 text-sm">
                                    Booking Status
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Right Section (Image Carousel) */}
                     <div className="relative w-full max-w-md mx-auto lg:max-w-lg lg:mx-0">
                        <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                            <AnimatePresence initial={false}>
                                <motion.img
                                    key={currentIndex}
                                    alt={`Showcase image ${currentIndex + 1}`}
                                    src={getOptimizedImageUrl(currentImageUrl, 800)}
                                    srcSet={`${getOptimizedImageUrl(currentImageUrl, 400)} 400w, ${getOptimizedImageUrl(currentImageUrl, 800)} 800w, ${getOptimizedImageUrl(currentImageUrl, 1200)} 1200w`}
                                    sizes="(max-width: 1023px) 100vw, 50vw"
                                    loading="lazy"
                                    decoding="async"
                                    initial={{ opacity: 0.5, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0.5, scale: 1.05 }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            </AnimatePresence>
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                            {images.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentIndex(index)}
                                    aria-label={`Go to slide ${index + 1}`}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                                        currentIndex === index ? 'bg-white scale-125' : 'bg-white/50'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};


const AboutSection: React.FC<{ image: string }> = ({ image }) => (
    <motion.section 
      id="about" 
      className="w-full py-16 md:py-24 bg-base-100 text-base-content"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
        <div className="relative">
            <div className="aspect-[4/5] w-full max-w-md mx-auto lg:max-w-none lg:w-full bg-base-200 rounded-2xl">
                <motion.img
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    src={getOptimizedImageUrl(image, 800)}
                    alt="Interior Studio 8"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover rounded-2xl shadow-xl border-8 border-white"
                />
            </div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-accent/10 rounded-full blur-2xl -z-10"></div>
        </div>

        <div className="space-y-6">
          <span className="text-sm font-bold uppercase text-accent tracking-widest">Tentang Kami</span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Studio Space and <i>Creative Hub</i> Kota Banjar.</h2>
          <p className="text-base sm:text-lg text-muted leading-relaxed">
            Studio 8 adalah studio foto modern dengan konsep <i>self-service</i> atau di fotoin <i>photographer profesional</i> yang memberikanmu kebebasan penuh untuk berekspresi. Kami percaya momen berharga tak ternilai, dan semua orang berhak mengabadikannya dengan kualitas profesional tanpa ribet.
          </p>
          <ul className="space-y-4 pt-4 border-t border-base-200">
              <li className="flex items-start gap-4">
                  <div className="p-2 bg-success/10 rounded-full text-success"><CheckCircle className="w-6 h-6 flex-shrink-0" /></div>
                  <div>
                      <h4 className="font-semibold">Kendali Penuh di Tanganmu</h4>
                      <p className="text-muted text-base">Ambil remot, atur gayamu, dan jepret sepuasnya. Tanpa fotografer, tanpa rasa canggung.</p>
                  </div>
              </li>
              <li className="flex items-start gap-4">
                  <div className="p-2 bg-success/10 rounded-full text-success"><Camera className="w-6 h-6 flex-shrink-0" /></div>
                  <div>
                      <h4 className="font-semibold">Kualitas Profesional</h4>
                      <p className="text-muted text-base">Gunakan peralatan kamera dan lighting profesional kami untuk hasil foto terbaik.</p>
                  </div>
              </li>
               <li className="flex items-start gap-4">
                  <div className="p-2 bg-success/10 rounded-full text-success"><PartyPopper className="w-6 h-6 flex-shrink-0" /></div>
                  <div>
                      <h4 className="font-semibold">Minimalis & Nyaman</h4>
                      <p className="text-muted text-base">Studio kami didesain modern dan minimalis, menciptakan suasana yang nyaman untuk berkreasi.</p>
                  </div>
              </li>
          </ul>
           <div className="mt-8">
                <Link to="/highlight" className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                    Lihat Karya Kami <ArrowRight size={18} />
                </Link>
            </div>
        </div>
      </div>
    </motion.section>
);

const HowItWorksSection = () => (
  <motion.section 
    id="how-it-works" 
    className="w-full py-16 md:py-24 bg-base-200"
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    variants={sectionVariants}
  >
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-primary">Caranya Mudah Banget!</h2>
      <p className="text-muted mt-2 mb-12 max-w-2xl mx-auto">Hanya dalam tiga langkah simpel, kamu siap untuk sesi foto yang seru.</p>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { icon: <CalendarDays size={40} className="text-accent" />, title: "Pilih Jadwal", desc: "Cek ketersediaan tanggal dan jam yang kamu inginkan lewat sistem booking kami." },
          { icon: <PencilLine size={40} className="text-accent" />, title: "Isi Data & Bayar DP", desc: "Lengkapi data dirimu dan amankan jadwal dengan DP ringan untuk konfirmasi." },
          { icon: <PartyPopper size={40} className="text-accent" />, title: "Datang & Ekspresikan Dirimu", desc: "Tiba di studio, ambil remot, dan mulailah berpose sesukamu. It's your time!" }
        ].map((step, index) => (
          <motion.div 
            key={step.title}
            custom={index} 
            variants={cardVariants}
            className="bg-white p-8 rounded-xl shadow-lg border border-base-200"
          >
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">{step.icon}</div>
            <h3 className="text-xl font-bold text-primary">{step.title}</h3>
            <p className="text-muted mt-2">{step.desc}</p>
          </motion.div>
        ))}
      </div>
      <Link to="/jadwal" className="mt-12 inline-flex items-center gap-2 px-6 py-3 font-semibold text-primary-content bg-primary rounded-lg shadow-md hover:bg-primary/90 transition-transform transform hover:scale-105">
        Lihat Jadwal Sekarang <ArrowRight size={18} />
      </Link>
    </div>
  </motion.section>
);

const CollaborationSection: React.FC<{ settings: SystemSettings | null }> = ({ settings }) => (
    <motion.section 
      id="collaboration" 
      className="w-full py-16 md:py-24 bg-base-100"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary">Untuk Grup, Instansi & Event</h2>
        <p className="text-muted mt-2 mb-12 max-w-2xl mx-auto">Kami terbuka untuk kolaborasi, booking grup, dan sponsorship untuk berbagai acara.</p>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <motion.div
              variants={cardVariants}
              custom={0}
              whileHover={{ y: -10 }}
              className="bg-white p-8 rounded-xl shadow-lg border border-base-200 text-left flex flex-col"
          >
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4"><Briefcase size={32} className="text-accent"/></div>
              <h3 className="text-2xl font-bold text-primary">Booking Instansi</h3>
              <p className="text-muted mt-2 flex-grow">Sempurna untuk foto kelas, acara perusahaan, atau kegiatan komunitas. Dapatkan penawaran khusus untuk booking grup.</p>
              <Link to="/pesan-sesi?type=institutional" className="mt-6 inline-flex items-center gap-2 font-semibold text-accent hover:underline">
                  Ajukan Booking Grup <ArrowRight size={18} />
              </Link>
          </motion.div>
          <motion.div
              variants={cardVariants}
              custom={1}
              whileHover={{ y: -10 }}
              className="bg-white p-8 rounded-xl shadow-lg border border-base-200 text-left flex flex-col"
          >
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-4"><Award size={32} className="text-gold"/></div>
              <h3 className="text-2xl font-bold text-primary">Sponsorship & Kerjasama</h3>
              <p className="text-muted mt-2 flex-grow">Punya event keren? Mari berkolaborasi! Kami menawarkan berbagai bentuk kerjasama media partner dan sponsorship.</p>
              <Link to="/pesan-sesi?type=sponsorship" className="mt-6 inline-flex items-center gap-2 font-semibold text-accent hover:underline">
                  Ajukan Kerjasama <ArrowRight size={18} />
              </Link>
          </motion.div>
        </div>
        
        {settings?.partners && settings.partners.length > 0 && (
            <div className="mt-20">
                <h3 className="text-lg font-semibold text-muted tracking-wider uppercase">Kolaborasi Bersama Brand & Instansi Ternama</h3>
                <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-8 gap-y-6 items-center">
                    {settings.partners.map((partner) => (
                        <div key={partner.id} className="flex justify-center">
                            <img 
                                src={partner.logoUrl} 
                                alt={partner.name}
                                className="h-12 object-contain transition-all duration-300"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </motion.section>
);


const TestimonialsSection: React.FC<{ feedbacks: Feedback[] }> = ({ feedbacks }) => {
  if (feedbacks.length === 0) {
    return null;
  }

  return (
    <motion.section 
      id="testimonials" 
      className="w-full py-16 md:py-24 bg-base-200"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-primary">
          Apa Kata Klien Kami?
        </h2>
        <p className="text-center text-muted mt-2 mb-12">
          Ulasan tulus dari mereka yang telah mengabadikan momen bersama kami.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {feedbacks.map((fb, index) => (
            <motion.div
              key={fb.id}
              custom={index}
              variants={cardVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="bg-white p-6 rounded-xl shadow-lg border border-base-200 flex flex-col"
            >
              <StarRating value={fb.rating} isEditable={false} />
              <blockquote className="text-muted mt-4 flex-grow italic">
                "{fb.komentar}"
              </blockquote>
              <footer className="mt-4 font-semibold text-base-content flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold">
                  {fb.nama.charAt(0)}
                </div>
                - {fb.nama}
              </footer>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

const LocationSection = () => (
    <motion.section 
      id="location" 
      className="w-full py-16 md:py-24 bg-white"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
        <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-primary">
                Kunjungi Studio Kami
            </h2>
            <p className="text-center text-muted mt-2 mb-10">
                Temukan kami di lokasi yang strategis dan mudah dijangkau.
            </p>
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden md:flex border border-base-200">
                <div className="md:w-1/2">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!m12!m3!1d3955.626258909673!2d108.5442853153649!3d-7.41133719458992!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!2s0x2e6589ce547d9d87%3A0x904e0ac822cbe54a!2sSTUDIO%208!5e0!3m2!1sen!2sid" 
                        className="w-full h-64 md:h-full"
                        style={{ border:0 }} 
                        allowFullScreen={false}
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade">
                    </iframe>
                </div><div className="p-8 md:w-1/2">
                    <div className="flex items-center gap-3">
                        <MapPin size={24} className="text-accent"/>
                        <h3 className="text-xl font-bold text-primary">Alamat Studio</h3>
                    </div>
                    <p className="mt-2 text-muted">
                        Jl. Banjar - Pangandaran (Depan SMK 4 Banjar, Sukamukti, Kec. Pataruman, Kota Banjar, Jawa Barat 46323
                    </p>
                    <a 
                        href="https://maps.app.goo.gl/3RLxGUn5isbUd3UeA"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 text-accent font-semibold hover:underline"
                    >
                        Buka di Google Maps
                    </a>
                </div>
            </div>
        </div>
    </motion.section>
);

const Footer = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-primary text-primary-content">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Brand */}
          <div className="md:col-span-1">
            <h2 className="text-2xl font-bold">STUDIO 8</h2>
            <p className="mt-2 text-primary-content/70 text-sm">Abadikan waktu, rayakan gayamu — hanya di Studio 8.</p>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold tracking-wider uppercase">Navigasi</h3>
            <ul className="mt-4 space-y-2">
              <li><button onClick={() => scrollToSection('about')} className="text-primary-content/70 hover:text-primary-content transition-colors text-sm">Tentang Kami</button></li>
              <li><button onClick={() => scrollToSection('how-it-works')} className="text-primary-content/70 hover:text-primary-content transition-colors text-sm">Cara Kerja</button></li>
              <li><button onClick={() => scrollToSection('location')} className="text-primary-content/70 hover:text-primary-content transition-colors text-sm">Lokasi</button></li>
              <li><button onClick={() => scrollToSection('testimonials')} className="text-primary-content/70 hover:text-primary-content transition-colors text-sm">Testimoni</button></li>
              <li><Link to="/pesan-sesi" className="text-primary-content/70 hover:text-primary-content transition-colors text-sm">Booking Sesi</Link></li>
              <li><Link to="/pesan-sesi?type=institutional" className="text-primary-content/70 hover:text-primary-content transition-colors text-sm font-semibold">Booking Grup & Instansi</Link></li>
              <li><Link to="/pesan-sesi?type=sponsorship" className="text-primary-content/70 hover:text-primary-content transition-colors text-sm font-semibold">Sponsorship</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="text-lg font-semibold tracking-wider uppercase">Hubungi Kami</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="https://wa.me/6285724025425" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-content/70 hover:text-primary-content transition-colors text-sm">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </li>
              <li>
                <a href="https://instagram.com/studiolapan_" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-content/70 hover:text-primary-content transition-colors text-sm">
                  <Instagram size={16} /> Instagram
                </a>
              </li>
            </ul>
          </div>
          
          {/* Column 4: Address */}
           <div>
            <h3 className="text-lg font-semibold tracking-wider uppercase">Kunjungi Kami</h3>
            <p className="mt-4 text-primary-content/70 text-sm">
              Jl. Banjar - Pangandaran (Depan SMK 4 Banjar, Sukamukti), Pataruman, Kota Banjar, Jawa Barat 46323
            </p>
             <a 
                href="https://maps.app.goo.gl/3RLxGUn5isbUd3UeA"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm text-accent font-semibold hover:underline"
              >
                Lihat di Peta
              </a>
          </div>
        </div>
      </div>
      <div className="bg-black/20 py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-primary-content/50">
          &copy; {new Date().getFullYear()} Studio 8 Banjar. All rights reserved.
        </div>
      </div>
    </footer>
  );
};


const LandingPage: React.FC = () => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [publicFeedbacks, setPublicFeedbacks] = useState<Feedback[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const loadData = async () => {
        const [feedbackData, settingsData] = await Promise.all([
            getPublicFeedbacks(),
            getSystemSettings()
        ]);
        setPublicFeedbacks(feedbackData);
        setSettings(settingsData);
    };
    loadData();
  }, []);

  const heroImages = settings?.landingPageImages?.hero || [
        '/images/hero-1.jpg',
        '/images/hero-2.jpg',
        '/images/hero-3.jpg',
        '/images/hero-4.jpg',
        '/images/hero-5.jpg',
    ];
  const aboutImage = settings?.landingPageImages?.about || '/images/about-1.jpg';


  return (
    <div className="bg-base-100">
      <Header />
      <main>
        <HeroSection images={heroImages} />
        <AboutSection image={aboutImage} />
        <HowItWorksSection />
        <CollaborationSection settings={settings} />
        <TestimonialsSection feedbacks={publicFeedbacks} />
        <LocationSection />
        <Footer />
      </main>

      
          <>
            <ChatbotModal 
                isOpen={isChatbotOpen} 
                onClose={() => setIsChatbotOpen(false)}
                pageKey="landing"
            />
            <button
                onClick={() => setIsChatbotOpen(true)}
                className="fixed bottom-6 right-6 bg-accent text-accent-content p-4 rounded-full shadow-lg hover:bg-accent/90 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent z-40"
                title="Butuh Bantuan?"
            >
                <MessageSquare size={24} />
            </button>
          </>
      
    </div>
  );
};

export default LandingPage;