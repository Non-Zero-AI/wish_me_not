import React, { createContext, useState, useContext } from 'react';

const ModalContext = createContext({
    isAddModalVisible: false,
    setAddModalVisible: () => {},
    isSideMenuVisible: false,
    setSideMenuVisible: () => {},
});

export const ModalProvider = ({ children }) => {
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [isSideMenuVisible, setSideMenuVisible] = useState(false);

    return (
        <ModalContext.Provider value={{ 
            isAddModalVisible, 
            setAddModalVisible,
            isSideMenuVisible,
            setSideMenuVisible
        }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
