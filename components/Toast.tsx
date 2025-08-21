import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { CheckIconSolid, CloseIcon } from './icons';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2700);

    const fadeOutTimer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeOutTimer);
    };
  }, [onClose]);

  const config = {
    success: {
      bgColor: 'bg-indigo-600/95',
      icon: <CheckIconSolid className="w-6 h-6 text-white" />,
    },
    error: {
      bgColor: 'bg-red-600/95',
      icon: <CloseIcon className="w-6 h-6 text-white" />,
    },
  }[type];

  return (
    <div
      className={`fixed bottom-24 md:bottom-5 right-5 z-[200] p-4 rounded-xl shadow-2xl flex items-center gap-4 text-white font-bold ${config.bgColor} backdrop-blur-sm ${isFadingOut ? 'animate-fade-out' : 'animate-slide-up-fade-in'}`}
    >
      {config.icon}
      <span>{message}</span>
    </div>
  );
};

const ToastPortal: React.FC<ToastProps> = (props) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    
    useEffect(() => {
        // This ensures the container is only looked for on the client side.
        let el = document.getElementById('toast-container');
        if (el) {
            setContainer(el);
        }
    }, []);

    return container ? ReactDOM.createPortal(<Toast {...props} />, container) : null;
};

export default ToastPortal;
