import React, { createContext, useState, useContext, ReactNode } from 'react';
import CustomAlert, { AlertButton } from './components/CustomAlert';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertContextType {
  showAlert: (title: string, message: string, type?: AlertType, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AlertType>('warning');
  const [buttons, setButtons] = useState<AlertButton[] | undefined>(undefined);

  const showAlert = (title: string, message: string, type: AlertType = 'warning', buttons?: AlertButton[]) => {
    setTitle(title);
    setMessage(message);
    setType(type);
    setButtons(buttons);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
    setButtons(undefined);
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
        buttons={buttons}
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