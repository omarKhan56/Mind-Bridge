import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from '../Icons';

export const Dialog = ({ open, onOpenChange, children }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => onOpenChange(false)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const DialogContent = ({ children, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => e.stopPropagation()}
      className={`bg-white rounded-lg shadow-xl p-6 w-full max-w-md ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const DialogHeader = ({ children }) => {
  return <div className="mb-4">{children}</div>;
};

export const DialogTitle = ({ children, className = "" }) => {
  return <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h2>;
};

export const DialogDescription = ({ children }) => {
  return <p className="text-sm text-gray-600 mt-2">{children}</p>;
};

export const DialogFooter = ({ children, className = "" }) => {
  return <div className={`flex justify-end space-x-2 mt-6 ${className}`}>{children}</div>;
};

export const DialogTrigger = ({ children }) => {
  return children;
};
