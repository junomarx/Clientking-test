import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  type?: 'primary' | 'warning' | 'success' | 'info';
  onClick?: () => void;
  icon?: React.ReactNode;
}

export function AnimatedStatCard({ 
  title, 
  value, 
  type = 'primary', 
  onClick,
  icon 
}: AnimatedStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Animiere den Zählerwert
  useEffect(() => {
    if (value === displayValue) return;
    
    // Für größere Werte schneller zählen
    const duration = Math.min(1500, Math.max(500, value * 100));
    const step = value > displayValue ? 1 : -1;
    const range = Math.abs(value - displayValue);
    const increment = Math.max(1, Math.floor(range / 20));
    
    let timer: number;
    let current = displayValue;
    
    const updateValue = () => {
      if ((step > 0 && current >= value) || (step < 0 && current <= value)) {
        setDisplayValue(value);
        return;
      }
      
      current += step * increment;
      setDisplayValue(current);
      
      timer = window.setTimeout(updateValue, duration / (range / increment));
    };
    
    updateValue();
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [value, displayValue]);
  
  const getBorderClass = () => {
    switch (type) {
      case 'warning':
        return 'border-l-4 border-warning';
      case 'success':
        return 'border-l-4 border-success';
      case 'info':
        return 'border-l-4 border-primary-light';
      default:
        return 'border-l-4 border-primary';
    }
  };
  
  const getIconBgClass = () => {
    switch (type) {
      case 'warning':
        return 'bg-warning bg-opacity-20 text-warning';
      case 'success':
        return 'bg-success bg-opacity-20 text-success';
      case 'info':
        return 'bg-primary-light bg-opacity-20 text-primary-light';
      default:
        return 'bg-primary bg-opacity-20 text-primary';
    }
  };

  return (
    <motion.div 
      className={`bg-white rounded-lg shadow-sm p-5 ${getBorderClass()} 
        ${onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: isHovered ? 1.02 : 1,
        boxShadow: isHovered ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}
      transition={{ 
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-sm font-medium mb-2">{title}</h3>
          <motion.div 
            className="text-3xl font-bold"
            key={displayValue}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {displayValue}
          </motion.div>
        </div>
        
        {icon && (
          <motion.div 
            className={`${getIconBgClass()} p-3 rounded-full`}
            animate={{ 
              rotate: isHovered ? [0, 10, -10, 0] : 0,
              scale: isHovered ? 1.1 : 1
            }}
            transition={{ 
              duration: 0.5,
              ease: "easeInOut"
            }}
          >
            {icon}
          </motion.div>
        )}
      </div>
      
      <AnimatePresence>
        {isHovered && onClick && (
          <motion.div 
            className="mt-4 text-sm text-gray-500"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            Klicken zum Filtern
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}