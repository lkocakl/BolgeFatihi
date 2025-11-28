import React, { createContext, useState, useContext, ReactNode } from 'react';
import CustomAlert from './components/CustomAlert'; // MapScreen'de kullandığımız bileşen

type AlertType = 'success' | 'error' | 'warning';

interface AlertContextType {
  showAlert: (title: string, message: string, type?: AlertType) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AlertType>('warning');

  const showAlert = (title: string, message: string, type: AlertType = 'warning') => {
    setTitle(title);
    setMessage(message);
    setType(type);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlert
        visible={visible}
        title={title}
        message={message}
        type={type}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};