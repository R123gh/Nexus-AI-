import React from 'react';
import { 
  ArrowRight,
  TrendingUp,
  FileText,
  Users,
  Bug,
  Database,
  BookOpen,
  FileCode,
  Send,
  Mail,
  Scale,
  AlignLeft,
  Languages,
  PenTool,
  Lightbulb,
  Calculator,
  Layers,
  Play,
  Globe,
  HelpCircle,
  Book,
  Headphones,
  Zap
} from 'lucide-react';
import { TOOL_CATEGORIES } from '../utils/helpers';
import { motion } from 'framer-motion';

const iconMap = {
  'trending-up': TrendingUp,
  'file-text': FileText,
  'users': Users,
  'bug': Bug,
  'database': Database,
  'book-open': BookOpen,
  'github': FileCode,
  'send': Send,
  'mail': Mail,
  'scale': Scale,
  'align-left': AlignLeft,
  'languages': Languages,
  'pen-tool': PenTool,
  'lightbulb': Lightbulb,
  'calculator': Calculator,
  'layers': Layers,
  'youtube': Play,
  'globe': Globe,
  'help-circle': HelpCircle,
  'book': Book,
  'customer-service': Headphones
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9, rotateX: 20 },
  show: { 
    opacity: 1, y: 0, scale: 1, rotateX: 0, 
    transition: { type: "spring", stiffness: 250, damping: 20 } 
  }
};

const ServicesHub = ({ onSelectTool }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex-1 h-full overflow-y-auto bg-[var(--bg-0)] custom-scrollbar"
    >
      {/* Header Section */}
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="space-y-4 text-center md:text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-4 shadow-inner">
            <Zap size={12} className="fill-indigo-400 animate-pulse" />
            Nexus Intelligence
          </div>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-[var(--text-0)] leading-none">
            Services Hub
          </h1>
          <p className="text-lg md:text-xl text-[var(--text-2)] max-w-2xl font-medium leading-tight mx-auto md:mx-0">
            A specialized collection of AI utilities optimized for high-performance professional workflows.
          </p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        {TOOL_CATEGORIES.map((cat, catIdx) => (
          <div key={cat.id} className="mb-16 md:mb-24 last:mb-0">
            <motion.div 
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="flex items-center gap-4 mb-8"
            >
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-2)] whitespace-nowrap">
                {cat.label}
              </h3>
              <div className="h-[1px] w-full bg-[var(--border-subtle)]" />
            </motion.div>
            
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-50px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              style={{ perspective: 1200 }}
            >
              {cat.tools.map((tool) => {
                const IconComp = iconMap[tool.icon] || Globe;
                return (
                  <motion.div
                    key={tool.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03, y: -5, rotateX: 4, rotateY: -2, zIndex: 10 }}
                    whileTap={{ scale: 0.97, rotateX: 0, rotateY: 0 }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="group relative p-8 bg-[var(--bg-1)] backdrop-blur-xl border border-[var(--border-subtle)] rounded-[2rem] cursor-pointer shadow-md hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/20 transition-colors duration-300 flex flex-col"
                    onClick={() => onSelectTool(tool, cat)}
                  >
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.06] group-hover:scale-150 transition-all duration-700" style={{ transform: "translateZ(-20px)" }}>
                      <IconComp size={80} strokeWidth={1} />
                    </div>

                    <div className="w-14 h-14 rounded-2xl bg-[var(--bg-2)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-1)] mb-8 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg" style={{ transform: "translateZ(30px)" }}>
                      <IconComp size={28} strokeWidth={1.5} />
                    </div>
                    
                    <h4 className="text-xl font-black text-[var(--text-0)] mb-3 tracking-tight group-hover:translate-x-1 transition-transform" style={{ transform: "translateZ(20px)" }}>
                      {tool.name}
                    </h4>
                    
                    <p className="text-sm text-[var(--text-2)] leading-relaxed mb-8 font-medium flex-1" style={{ transform: "translateZ(10px)" }}>
                      {tool.desc}
                    </p>
                    
                    <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-0)] tracking-widest uppercase mt-auto group-hover:text-[var(--accent)] transition-colors" style={{ transform: "translateZ(15px)" }}>
                      Initialize <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform" />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ServicesHub;
