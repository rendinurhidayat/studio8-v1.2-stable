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
    CheckCircle
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
      { id: 'about', label: 'Tentang Kami' },
      { id: 'how-it-works', label: 'Cara Kerja' },
      { id: 'location', label: 'Lokasi' },
      { id: 'testimonials', label: 'Testimoni' }
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-sm shadow-md' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
        <h1 className={`text-2xl font-bold transition-colors ${scrolled ? 'text-gray-800' : 'text-white'}`}>Studio <span className={scrolled ? 'text-primary' : 'text-white'}>8</span></h1>
        
        <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center space-x-8">
              {navLinks.map(link => (
                <button key={link.id} onClick={() => scrollToSection(link.id)} className={`capitalize text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-blue-500' : 'text-white/80 hover:text-white'}`}>
                  {link.label}
                </button>
              ))}
            </nav>
            <div className={`h-6 w-px transition-colors ${scrolled ? 'bg-gray-300' : 'bg-white/30'}`}></div>
            <div className="flex items-center gap-4">
                <Link to="/auth" title="Login Tim" className={`p-2 rounded-full transition-colors ${scrolled ? 'text-gray-500 hover:text-blue-600 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                    <LogIn size={20} />
                </Link>
            </div>
        </div>
        
        {/* Mobile View: Login button */}
        <div className="md:hidden">
             <Link to="/auth" title="Login Tim" className={`p-2 rounded-full transition-colors ${scrolled ? 'text-gray-500 hover:text-blue-600 hover:bg-gray-100' : 'text-white/80 hover:text-white hover:bg-white/10'}`}>
                <LogIn size={20} />
            </Link>
        </div>
      </div>
    </header>
  );
}

const heroImages = [
    '/images/hero-1.jpg',
    '/images/hero-2.jpg',
    '/images/hero-3.jpg',
    '/images/hero-4.jpg',
    '/images/hero-5.jpg',
];

const HeroSection = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex(prevIndex => (prevIndex + 1) % heroImages.length);
        }, 5000); // Change image every 5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center text-center text-white overflow-hidden">
            <AnimatePresence>
                <motion.div
                    key={index}
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${heroImages[index]})` }}
                    initial={{ opacity: 0, scale: 1.1, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(4px)' }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                />
            </AnimatePresence>
            <div className="absolute inset-0 bg-black bg-opacity-60"></div>
            <div className="relative z-10 px-4">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight drop-shadow-lg"
                >
                    Express Your Time with Happiness
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="mt-4 text-lg md:text-xl max-w-2xl mx-auto text-white/90 drop-shadow-md"
                >
                    Studio foto kota banjar dengan konsep studio house.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4"
                >
                    <Link
                        to="/pesan-sesi"
                        className="px-8 py-4 text-lg font-semibold text-gray-900 bg-white rounded-xl shadow-lg hover:bg-gray-200 transition-transform transform hover:scale-105 w-full sm:w-auto"
                    >
                        Booking Sekarang
                    </Link>
                    <Link
                        to="/cek-status"
                        className="px-8 py-3 text-lg font-semibold text-white bg-transparent border-2 border-white rounded-xl hover:bg-white hover:text-gray-900 transition-colors w-full sm:w-auto"
                    >
                        Cek Status Booking
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};


const AboutSection = () => (
    <motion.section 
      id="about" 
      className="w-full py-16 md:py-24 bg-slate-50 text-base-content"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
        <div className="relative h-96 md:h-[500px]">
            <motion.img 
                whileHover={{ scale: 1.05, rotate: -3 }}
                transition={{ type: 'spring', stiffness: 300 }}
                src="/images/about-1.jpg" 
                alt="Interior Studio 8" 
                className="absolute top-0 left-0 w-3/4 h-3/4 rounded-2xl shadow-xl border-8 border-white object-cover" 
            />
            <motion.img 
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 300 }}
                src="/images/about-2.jpg" 
                alt="Peralatan Studio 8" 
                className="absolute bottom-0 right-0 w-2/3 h-2/3 rounded-2xl shadow-2xl border-8 border-white object-cover" 
            />
        </div>

        <div className="space-y-6">
          <span className="text-sm font-bold uppercase text-accent tracking-widest">Tentang Kami</span>
          <h2 className="text-3xl md:text-4xl font-bold text-primary">Ruang Kreatifmu di Jantung Kota Banjar.</h2>
          <p className="text-lg text-muted leading-relaxed">
            Studio 8 adalah studio foto modern dengan konsep <i>self-service</i> yang memberikanmu kebebasan penuh untuk berekspresi. Kami percaya momen berharga tak ternilai, dan semua orang berhak mengabadikannya dengan kualitas profesional tanpa ribet.
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
        </div>
      </div>
    </motion.section>
);

const HowItWorksSection = () => (
  <motion.section 
    id="how-it-works" 
    className="w-full py-16 md:py-24 bg-[#F5F5F5]"
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    variants={sectionVariants}
  >
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-[#0B1E33]">Caranya Mudah Banget!</h2>
      <p className="text-gray-600 mt-2 mb-12 max-w-2xl mx-auto">Hanya dalam tiga langkah simpel, kamu siap untuk sesi foto yang seru.</p>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { icon: <CalendarDays size={40} className="text-blue-600" />, title: "Pilih Jadwal", desc: "Cek ketersediaan tanggal dan jam yang kamu inginkan lewat sistem booking kami." },
          { icon: <PencilLine size={40} className="text-blue-600" />, title: "Isi Data & Bayar DP", desc: "Lengkapi data dirimu dan amankan jadwal dengan DP ringan untuk konfirmasi." },
          { icon: <PartyPopper size={40} className="text-blue-600" />, title: "Datang & Ekspresikan Dirimu", desc: "Tiba di studio, ambil remot, dan mulailah berpose sesukamu. It's your time!" }
        ].map((step, index) => (
          <motion.div 
            key={step.title}
            custom={index} 
            variants={cardVariants}
            className="bg-white p-8 rounded-xl shadow-lg border border-gray-200"
          >
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">{step.icon}</div>
            <h3 className="text-xl font-bold text-[#0B1E33]">{step.title}</h3>
            <p className="text-gray-500 mt-2">{step.desc}</p>
          </motion.div>
        ))}
      </div>
      <Link to="/jadwal" className="mt-12 inline-flex items-center gap-2 px-6 py-3 font-semibold text-white bg-[#0B1E33] rounded-lg shadow-md hover:bg-gray-800 transition-transform transform hover:scale-105">
        Lihat Jadwal Sekarang <ArrowRight size={18} />
      </Link>
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
      className="w-full py-16 md:py-24 bg-slate-100"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800">
          Apa Kata Klien Kami?
        </h2>
        <p className="text-center text-gray-500 mt-2 mb-12">
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
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 flex flex-col"
            >
              <StarRating value={fb.rating} isEditable={false} />
              <blockquote className="text-gray-600 mt-4 flex-grow italic">
                "{fb.komentar}"
              </blockquote>
              <footer className="mt-4 font-semibold text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
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
            <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800">
                Kunjungi Studio Kami
            </h2>
            <p className="text-center text-gray-500 mt-2 mb-10">
                Temukan kami di lokasi yang strategis dan mudah dijangkau.
            </p>
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden md:flex border">
                <div className="md:w-1/2">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3955.626258909673!2d108.5442853153649!3d-7.41133719458992!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6589ce547d9d87%3A0x904e0ac822cbe54a!2sSTUDIO%208!5e0!3m2!1sen!2sid" 
                        className="w-full h-64 md:h-full"
                        style={{ border:0 }} 
                        allowFullScreen={false}
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade">
                    </iframe>
                </div><div className="p-8 md:w-1/2">
                    <div className="flex items-center gap-3">
                        <MapPin size={24} className="text-blue-600"/>
                        <h3 className="text-xl font-bold text-gray-800">Alamat Studio</h3>
                    </div>
                    <p className="mt-2 text-gray-600">
                        Jl. Banjar - Pangandaran (Depan SMK 4 Banjar, Sukamukti, Kec. Pataruman, Kota Banjar, Jawa Barat 46323
                    </p>
                    <a 
                        href="https://maps.app.goo.gl/r6N9jQjD5j6E9kFp6"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 text-blue-600 font-semibold hover:underline"
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
    <footer className="bg-[#0B1E33] text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Brand */}
          <div className="md:col-span-1">
            <h2 className="text-2xl font-bold">Studio 8</h2>
            <p className="mt-2 text-white/70 text-sm">Momenmu, gayamu. Studio foto modern di Kota Banjar untuk mengabadikan setiap ekspresi terbaikmu.</p>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold tracking-wider uppercase">Navigasi</h3>
            <ul className="mt-4 space-y-2">
              <li><button onClick={() => scrollToSection('about')} className="text-white/70 hover:text-white transition-colors text-sm">Tentang Kami</button></li>
              <li><button onClick={() => scrollToSection('how-it-works')} className="text-white/70 hover:text-white transition-colors text-sm">Cara Kerja</button></li>
              <li><button onClick={() => scrollToSection('location')} className="text-white/70 hover:text-white transition-colors text-sm">Lokasi</button></li>
              <li><button onClick={() => scrollToSection('testimonials')} className="text-white/70 hover:text-white transition-colors text-sm">Testimoni</button></li>
              <li><Link to="/pesan-sesi" className="text-white/70 hover:text-white transition-colors text-sm">Booking Sesi</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h3 className="text-lg font-semibold tracking-wider uppercase">Hubungi Kami</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="https://wa.me/6285724025425" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              </li>
              <li>
                <a href="https://instagram.com/studiolapan_" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
                  <Instagram size={16} /> Instagram
                </a>
              </li>
            </ul>
          </div>
          
          {/* Column 4: Address */}
           <div>
            <h3 className="text-lg font-semibold tracking-wider uppercase">Kunjungi Kami</h3>
            <p className="mt-4 text-white/70 text-sm">
              Jl. Banjar - Pangandaran (Depan SMK 4 Banjar, Sukamukti), Pataruman, Kota Banjar, Jawa Barat 46323
            </p>
             <a 
                href="https://maps.app.goo.gl/r6N9jQjD5j6E9kFp6"
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-white/50">
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

  return (
    <div className="bg-white">
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <TestimonialsSection feedbacks={publicFeedbacks} />
        <LocationSection />
        <Footer />
      </main>

      
          <>
            <ChatbotModal isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
            <button
                onClick={() => setIsChatbotOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-40"
                title="Butuh Bantuan?"
            >
                <MessageSquare size={24} />
            </button>
          </>
      
    </div>
  );
};

export default LandingPage;