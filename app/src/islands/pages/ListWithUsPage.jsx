import { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, Home, ShieldCheck, Banknote, Moon, Calendar, Anchor, Settings, CreditCard, UserCheck, FileCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import CreateDuplicateListingModal from '../shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx';
import ImportListingModal from '../shared/ImportListingModal/ImportListingModal.jsx';
import { useToast } from '../shared/Toast.jsx';
import Toast from '../shared/Toast.jsx';
import '../../styles/tailwind.css';

// Utility for merging Tailwind classes
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- Asset Constants ---
const AVATAR_1 = "https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1628195334709x669100317545697300/brad%20circle.png";
const AVATAR_2 = "https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1606752112120x678210779169741800/arvind-image-success-story.jpg";

// --- Button Component ---
const Button = ({ className, variant = 'primary', size = 'md', children, ...props }) => {
  const variants = {
    primary: 'bg-[#31135d] text-white hover:bg-[#4a2f7c]',
    secondary: 'bg-[#059669] text-white hover:bg-[#047857]',
    outline: 'border-2 border-[#31135d] text-[#31135d] hover:bg-[#31135d]/5',
    ghost: 'text-white/90 hover:text-white hover:bg-white/10',
    white: 'bg-white text-[#31135d] hover:bg-white/90 shadow-sm',
  };

  const sizes = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-11 px-6 text-base',
    lg: 'h-14 px-8 text-lg',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Process Step Component ---
const ProcessStep = ({ icon: Icon, title, description, isActive, isCompleted }) => {
  return (
    <div className="relative flex flex-col items-center text-center z-10 px-4">
      <motion.div
        animate={{
          scale: isActive ? 1.15 : 1,
          backgroundColor: isCompleted || isActive ? '#31135d' : '#ffffff',
          borderColor: isCompleted || isActive ? '#31135d' : '#e5e7eb',
          color: isCompleted || isActive ? '#ffffff' : '#9ca3af',
          boxShadow: isActive ? "0 20px 25px -5px rgb(49 19 93 / 0.15), 0 8px 10px -6px rgb(49 19 93 / 0.15)" : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
        }}
        className={cn(
          "w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mb-8 border-2 transition-all duration-500"
        )}
      >
        <Icon className="w-9 h-9" strokeWidth={1.5} />
      </motion.div>

      <motion.div
        animate={{
          opacity: isActive || isCompleted ? 1 : 0.4,
          y: isActive ? 0 : 10
        }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">{title}</h3>
        <p className="text-[#6b7280] leading-relaxed max-w-sm mx-auto">{description}</p>
      </motion.div>
    </div>
  );
};

// --- Process Section with Scroll Progress ---
const ProcessSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const lineProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return scrollYProgress.on("change", (latest) => {
      setProgress(latest);
    });
  }, [scrollYProgress]);

  return (
    <section ref={containerRef} className="py-32 bg-[#fafafa] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-[#1a1a1a] mb-6 tracking-tight">How it works</h2>
            <p className="text-lg text-[#6b7280] max-w-2xl mx-auto">
              Your journey to passive income in three simple steps
            </p>
          </motion.div>
        </div>

        <div className="relative grid md:grid-cols-3 gap-12 md:gap-8">
          {/* Progress Line Background */}
          <div className="hidden md:block absolute top-[40px] left-[16%] right-[16%] h-1 bg-gray-200 rounded-full overflow-hidden z-0">
            <motion.div
              className="h-full bg-[#31135d] origin-left"
              style={{ scaleX: lineProgress }}
            />
          </div>

          <ProcessStep
            icon={Home}
            title="Create Listing"
            description="Add your property details and photos. Our AI optimizes your listing for maximum visibility."
            isActive={progress >= 0 && progress < 0.33}
            isCompleted={progress >= 0.33}
          />

          <ProcessStep
            icon={ShieldCheck}
            title="Screen Tenants"
            description="We vet every applicant with credit & background checks so you can choose with confidence."
            isActive={progress >= 0.33 && progress < 0.66}
            isCompleted={progress >= 0.66}
          />

          <ProcessStep
            icon={Banknote}
            title="Get Paid"
            description="Receive automated monthly payments directly to your bank account. No chasing rent."
            isActive={progress >= 0.66}
            isCompleted={progress >= 1}
          />
        </div>
      </div>
    </section>
  );
};

// --- Rhythms Section ---
const RhythmSection = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Text Animations
  const opacity1 = useTransform(scrollYProgress, [0.1, 0.25, 0.35], [0, 1, 0]);
  const y1 = useTransform(scrollYProgress, [0.1, 0.25, 0.35], [20, 0, -20]);

  const opacity2 = useTransform(scrollYProgress, [0.4, 0.55, 0.65], [0, 1, 0]);
  const y2 = useTransform(scrollYProgress, [0.4, 0.55, 0.65], [20, 0, -20]);

  const opacity3 = useTransform(scrollYProgress, [0.7, 0.85, 0.95], [0, 1, 0]);
  const y3 = useTransform(scrollYProgress, [0.7, 0.85, 0.95], [20, 0, -20]);

  // Monthly Fill Animation
  const fillHeight = useTransform(scrollYProgress, [0.75, 0.9], [0, 70]);
  const fillY = useTransform(scrollYProgress, [0.75, 0.9], [90, 20]);

  return (
    <section ref={containerRef} className="relative h-[400vh] bg-[#0f0a1a]">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">

        {/* Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#31135d]/20 via-[#0f0a1a] to-[#0f0a1a]" />

        <div className="max-w-7xl w-full mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center h-full relative z-10">

          {/* Text Content */}
          <div className="relative h-full lg:h-[400px] flex items-center justify-center lg:justify-start order-2 lg:order-1">
            {/* Nightly */}
            <motion.div style={{ opacity: opacity1, y: y1 }} className="absolute inset-0 flex flex-col justify-center">
              <div className="flex items-center gap-3 text-[#c084fc] mb-4">
                <Moon className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-widest">Nightly Rhythm</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Control &<br />Flexibility
              </h2>
              <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                Short-term bursts of activity. You decide the dates, you control the pricing. Perfect for maximizing revenue during peak seasons.
              </p>
            </motion.div>

            {/* Weekly */}
            <motion.div style={{ opacity: opacity2, y: y2 }} className="absolute inset-0 flex flex-col justify-center">
              <div className="flex items-center gap-3 text-[#34d399] mb-4">
                <Calendar className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-widest">Weekly Rhythm</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Balance &<br />Stability
              </h2>
              <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                The sweet spot. Attract business travelers and digital nomads. Less turnover than nightly, higher yield than monthly.
              </p>
            </motion.div>

            {/* Monthly */}
            <motion.div style={{ opacity: opacity3, y: y3 }} className="absolute inset-0 flex flex-col justify-center">
              <div className="flex items-center gap-3 text-[#60a5fa] mb-4">
                <Anchor className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-widest">Monthly Rhythm</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Peace of<br />Mind
              </h2>
              <p className="text-xl text-gray-400 max-w-md leading-relaxed">
                Consistent, reliable income. Long-term tenants mean zero vacancy worries and steady cash flow for your portfolio.
              </p>
            </motion.div>
          </div>

          {/* Dynamic Visual */}
          <div className="h-[400px] lg:h-[600px] w-full flex items-center justify-center order-1 lg:order-2">
            <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">

              {/* House Container */}
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
                {/* House Outline */}
                <path
                  d="M50 10 L10 45 L20 45 L20 90 L80 90 L80 45 L90 45 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-white/20"
                />

                {/* Internal Clipping Path */}
                <defs>
                  <clipPath id="house-clip">
                    <path d="M50 10 L10 45 L20 45 L20 90 L80 90 L80 45 L90 45 Z" />
                  </clipPath>
                </defs>

                {/* Nightly: Active Particles */}
                <motion.g style={{ opacity: useTransform(scrollYProgress, [0.1, 0.25, 0.4], [0, 1, 0]) }}>
                  <circle cx="50" cy="60" r="15" fill="#c084fc" filter="blur(20px)" opacity="0.5">
                    <animate attributeName="r" values="15;25;15" dur="3s" repeatCount="indefinite" />
                  </circle>
                  {[...Array(8)].map((_, i) => (
                    <circle key={i} r={1 + Math.random()} fill="white">
                      <animate
                        attributeName="cx"
                        values={`${20 + Math.random()*60};${20 + Math.random()*60}`}
                        dur={`${0.5 + Math.random()}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="cy"
                        values={`${40 + Math.random()*50};${40 + Math.random()*50}`}
                        dur={`${0.5 + Math.random()}s`}
                        repeatCount="indefinite"
                      />
                      <animate attributeName="opacity" values="0;1;0" dur={`${0.5 + Math.random()}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                </motion.g>

                {/* Weekly: Flowing Waves */}
                <motion.g style={{ opacity: useTransform(scrollYProgress, [0.4, 0.55, 0.7], [0, 1, 0]) }} clipPath="url(#house-clip)">
                  <path d="M-100 40 Q -50 30 0 40 T 100 40 T 200 40" fill="none" stroke="#34d399" strokeWidth="1" strokeOpacity="0.5">
                    <animateTransform attributeName="transform" type="translate" from="0 0" to="-100 0" dur="4s" repeatCount="indefinite" />
                  </path>
                  <path d="M-100 60 Q -50 50 0 60 T 100 60 T 200 60" fill="none" stroke="#34d399" strokeWidth="2" strokeOpacity="0.3">
                    <animateTransform attributeName="transform" type="translate" from="0 0" to="-100 0" dur="3s" repeatCount="indefinite" />
                  </path>
                  <path d="M-100 80 Q -50 70 0 80 T 100 80 T 200 80" fill="none" stroke="#34d399" strokeWidth="1" strokeOpacity="0.5">
                    <animateTransform attributeName="transform" type="translate" from="0 0" to="-100 0" dur="5s" repeatCount="indefinite" />
                  </path>
                </motion.g>

                {/* Monthly: Solid Fill */}
                <motion.g style={{ opacity: useTransform(scrollYProgress, [0.7, 0.75, 1], [0, 1, 1]) }} clipPath="url(#house-clip)">
                  <rect x="0" y="0" width="100" height="100" fill="#60a5fa" opacity="0.1" />
                  <motion.rect
                    x="0"
                    width="100"
                    fill="#60a5fa"
                    opacity="0.8"
                    style={{
                      y: fillY,
                      height: fillHeight
                    }}
                  />
                </motion.g>
              </svg>

              {/* Outer Glow Ring */}
              <motion.div
                className="absolute -inset-10 rounded-full blur-3xl opacity-20 transition-colors duration-700"
                style={{
                  background: useTransform(
                    scrollYProgress,
                    [0.2, 0.5, 0.8],
                    ['#c084fc', '#34d399', '#60a5fa']
                  )
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Infrastructure Section ---
const InfrastructureSection = ({ onStartListing }) => {
  return (
    <section className="relative py-32 bg-white overflow-hidden border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid lg:grid-cols-2 gap-20 items-center mb-24">

          {/* Left: Command Center */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-[#31135d] text-sm font-bold mb-6">
              <div className="w-2 h-2 rounded-full bg-[#31135d] animate-pulse" />
              COMMAND CENTER
            </div>

            <h2 className="text-5xl md:text-6xl font-bold text-[#1a1a1a] mb-8 leading-tight">
              You set the rules.<br />
              <span className="text-[#31135d]">We clear the path.</span>
            </h2>

            <p className="text-xl text-gray-500 mb-12 leading-relaxed max-w-lg">
              You aren't just a host; you're the decision-maker. Define your price, choose your rhythm, and set your terms. We simply build the rails for your revenue to run on.
            </p>

            {/* Control Panel UI Mockup */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md transform hover:scale-[1.02] transition-transform duration-500">
              <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                <span className="font-bold text-lg text-[#1a1a1a]">Listing Settings</span>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-8">
                {/* Price Control */}
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Base Rate</span>
                    <span className="text-lg font-bold text-[#31135d]">$245<span className="text-sm text-gray-400 font-normal">/night</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      whileInView={{ width: "65%" }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-[#31135d] rounded-full"
                    />
                  </div>
                </div>

                {/* Rhythm Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Active Rhythm</span>
                    <span className="block font-medium text-[#1a1a1a]">Weekly & Monthly</span>
                  </div>
                  <div className="h-8 w-14 bg-[#31135d] rounded-full p-1 cursor-pointer flex justify-end">
                    <motion.div layout className="h-6 w-6 bg-white rounded-full shadow-sm" />
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm font-medium text-gray-500 mb-1">Instant Book</span>
                    <span className="block font-medium text-[#1a1a1a]">Verified Guests Only</span>
                  </div>
                  <div className="h-8 w-14 bg-[#31135d] rounded-full p-1 cursor-pointer flex justify-end">
                    <motion.div layout className="h-6 w-6 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Infrastructure Items */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">System Status: Operational</h3>

              {[
                { icon: CreditCard, title: "Payment Infrastructure", status: "Automated Payouts Ready" },
                { icon: ShieldCheck, title: "Risk Engine", status: "$1M Liability Protection Active" },
                { icon: UserCheck, title: "Identity Verification", status: "Biometric Screening Online" },
                { icon: FileCheck, title: "Legal Framework", status: "Smart Contracts Deployed" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex items-center gap-6 p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#31135d]/5 group-hover:text-[#31135d] transition-colors">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1a1a1a] text-lg">{item.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-sm text-gray-500 font-mono">{item.status}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Final CTA */}
        <div className="relative mt-32 rounded-[2.5rem] bg-[#1a1a1a] p-12 md:p-24 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-3xl bg-[#31135d] opacity-20 blur-[120px]" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-7xl font-bold text-white mb-8 tracking-tight">
              Ready to take command?
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-xl mx-auto">
              No setup fees. No long-term contracts. Just a powerful platform built for hosts who mean business.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto h-16 px-10 text-lg bg-white text-[#1a1a1a] hover:bg-gray-100 hover:scale-105 transition-all duration-300"
                onClick={onStartListing}
              >
                Start your listing
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <span className="text-sm text-gray-500 mt-4 sm:mt-0 sm:ml-6">
                Setup takes ~5 minutes
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Main Page Component ---
export default function ListWithUsPage() {
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [showImportListingModal, setShowImportListingModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  return (
    <div className="min-h-screen bg-white font-sans text-[#1a1a1a]">
      <Header />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32 flex flex-col items-center text-center px-4">

          {/* Floating Avatars */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="absolute left-[10%] top-1/3 hidden lg:block"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-[#31135d]/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <img
                src={AVATAR_1}
                alt="Host"
                className="relative w-24 h-24 rounded-full border-4 border-white shadow-xl object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="absolute right-[10%] top-1/2 hidden lg:block"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-[#31135d]/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <img
                src={AVATAR_2}
                alt="Host"
                className="relative w-20 h-20 rounded-full border-4 border-white shadow-xl object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 max-w-4xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#31135d]/5 text-[#31135d] text-sm font-semibold mb-8 border border-[#31135d]/10">
              Turn Unused Nights Into Income
            </span>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#1a1a1a] mb-8 leading-[1.1]">
              List Your Property <br/>
              <span className="text-[#31135d]">Start Earning Today</span>
            </h1>

            <p className="text-xl text-[#6b7280] mb-12 max-w-2xl mx-auto leading-relaxed">
              Join Split Lease and transform your unused property into a reliable income stream.
              Flexible lease terms, transparent pricing, and comprehensive support.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/self-listing-v2.html">
                <Button size="lg" className="w-full sm:w-auto min-w-[200px] shadow-lg shadow-[#31135d]/20">
                  Start New Listing
                </Button>
              </a>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-w-[200px]"
                onClick={() => setShowImportListingModal(true)}
              >
                Import My Listing
              </Button>
            </div>
          </motion.div>
        </section>

        <ProcessSection />

        <RhythmSection />

        <InfrastructureSection onStartListing={() => setShowCreateListingModal(true)} />
      </main>

      <Footer />

      {/* Create Listing Modal */}
      <CreateDuplicateListingModal
        isVisible={showCreateListingModal}
        onClose={() => setShowCreateListingModal(false)}
        onSuccess={(newListing) => {
          console.log('New listing created:', newListing);
        }}
        currentUser={null}
        existingListings={[]}
        onNavigateToListing={(listingId) => {
          window.location.href = `https://app.split.lease/listing/${listingId}`;
        }}
      />

      {/* Import Listing Modal */}
      <ImportListingModal
        isOpen={showImportListingModal}
        onClose={() => setShowImportListingModal(false)}
        onSubmit={async (data) => {
          setIsImporting(true);
          try {
            const response = await fetch('/api/import-listing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                listingUrl: data.listingUrl,
                emailAddress: data.emailAddress
              })
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.error || 'Failed to submit import request');
            }

            showToast({
              title: 'Request Submitted!',
              content: 'We will email you when your listing is ready.',
              type: 'success'
            });
            setShowImportListingModal(false);
          } catch (error) {
            console.error('Import error:', error);
            showToast({
              title: 'Import Failed',
              content: 'Please try again later.',
              type: 'error'
            });
          } finally {
            setIsImporting(false);
          }
        }}
        currentUserEmail=""
        isLoading={isImporting}
      />

      {/* Toast Notifications */}
      {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
    </div>
  );
}
