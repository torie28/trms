import { motion } from "framer-motion";
import {
  MapPin,
  FileText,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Shield,
} from "lucide-react";
import type { FC } from "react";

interface LandingPageProps {
  onGetStarted?: () => void;
}

export const LandingPage: FC<LandingPageProps> = ({ onGetStarted }) => {
  const features = [
    {
      icon: <MapPin className="w-7 h-7" />,
      title: "Tax Jurisdiction Transfer",
      description:
        "Seamlessly migrate business and residential tax profiles to your new location in just a few clicks.",
    },
    {
      icon: <FileText className="w-7 h-7" />,
      title: "Debt & Assessment Review",
      description:
        "Allow incoming collectors to instantly check outstanding balances and project forward rates.",
    },
    {
      icon: <ShieldCheck className="w-7 h-7" />,
      title: "Secure Verification",
      description:
        "Multi-stage approvals secure each application via automated compliance checkpoints.",
    },
    {
      icon: <BarChart3 className="w-7 h-7" />,
      title: "Real-time Analytics",
      description:
        "District and regional administrators gain instant dashboards detailing active revenue transfers.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      {/* Background Image - Opacity increased to 60% */}
      <motion.div
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 8 }}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 mix-blend-luminosity"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')",
        }}
      />

      {/* Premium Deep Background Shield with adjusted opacity overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-slate-950/80 backdrop-blur-[2px]" />

      {/* Animated Soft Golden Ambient Glow */}
      <motion.div
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
        }}
        className="absolute top-[-150px] left-[-100px] w-[500px] h-[500px] bg-[#FFE600]/5 rounded-full blur-3xl"
      />

      <motion.div
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
        }}
        className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-[#FFE600]/5 rounded-full blur-3xl"
      />

      {/* Main Content Canvas */}
      <div className="relative z-20 flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-6 py-5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="flex items-center gap-4"
            >
              <motion.div
                whileHover={{
                  rotate: 360,
                  scale: 1.08,
                }}
                transition={{ duration: 0.8 }}
                className="w-14 h-14 rounded-2xl bg-[#FFE600] flex items-center justify-center shadow-2xl shadow-yellow-500/20"
              >
                <Shield className="w-8 h-8 text-slate-950" />
              </motion.div>

              <div>
                <h1 className="text-3xl font-black text-white tracking-wide">
                  TRMS
                </h1>
                <p className="text-sm text-[#FFE600] -mt-1 font-semibold">
                  Tax Relocation System
                </p>
              </div>
            </motion.div>

            {/* Status */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden md:flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-xl px-5 py-3 rounded-full text-white shadow-xl"
            >
              <div className="w-2.5 h-2.5 bg-[#FFE600] rounded-full animate-pulse" />
              <span className="font-medium text-sm text-slate-200">
                Official Tanzania Taxpayer Portal
              </span>
            </motion.div>
          </div>
        </header>

        {/* Hero Area */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1,
                ease: "easeOut",
              }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-xl px-5 py-2 rounded-full text-white text-sm font-medium mb-8"
              >
                <span className="text-[#FFE600]">✨</span>
                Unified Revenue Relocation Solution
              </motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-5xl md:text-7xl font-black text-white leading-tight"
              >
                Relocate Your Tax Office
                <br />
                <span className="bg-gradient-to-r from-yellow-100 via-[#FFE600] to-yellow-400 bg-clip-text text-transparent">
                  Through A Single Window
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-lg md:text-xl text-slate-200 max-w-3xl mx-auto mt-8 leading-relaxed"
              >
                Say goodbye to processing delays. Change your commercial or domestic tax zone seamlessly, 
                track real-time file approvals, and manage assessments instantly under one secure platform.
              </motion.p>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-12"
              >
                <motion.button
                  whileHover={{
                    scale: 1.05,
                    y: -3,
                  }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onGetStarted}
                  className="group inline-flex items-center gap-3 bg-[#FFE600] hover:bg-[#ebd500] text-slate-950 text-lg font-bold px-10 py-5 rounded-2xl shadow-2xl shadow-yellow-500/20 transition-all duration-300"
                >
                  Start Application
                  <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                        }}
                    >
                    <ArrowRight className="w-5 h-5" />
                    </motion.div>
                </motion.button>

                <motion.button
                  whileHover={{
                    scale: 1.05,
                  }}
                  whileTap={{ scale: 0.96 }}
                  className="px-10 py-5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl text-white font-semibold hover:bg-white/20 transition-all duration-300"
                >
                  View Workflow
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </main>

        {/* Features Matrix Grid */}
        <section className="relative z-20 px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 50,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay: index * 0.15,
                    duration: 0.6,
                  }}
                  whileHover={{
                    y: -10,
                    scale: 1.03,
                  }}
                  className="group relative overflow-hidden bg-white/10 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl hover:bg-white/15 transition-all duration-500"
                >
                  {/* Glow Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 via-yellow-500/0 to-[#FFE600]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    <motion.div
                      whileHover={{
                        rotate: 8,
                        scale: 1.1,
                      }}
                      className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-[#FFE600] flex items-center justify-center text-slate-950 mb-5 shadow-lg"
                    >
                      {feature.icon}
                    </motion.div>

                    <h3 className="text-xl font-bold text-white mb-3">
                      {feature.title}
                    </h3>

                    <p className="text-slate-300 leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="relative z-20 text-center pb-6"
        >
          <p className="text-slate-300 text-sm md:text-base">
            © Hilda Raphael
          </p>
        </motion.footer>
      </div>
    </div>
  );
};