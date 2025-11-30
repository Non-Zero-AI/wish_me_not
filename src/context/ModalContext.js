import React, { createContext, useState, useContext } from 'react';

const ModalContext = createContext({
    isAddModalVisible: false,
    setAddModalVisible: () => {},
});

export const ModalProvider = ({ children }) => {
    const [isAddModalVisible, setAddModalVisible] = useState(false);

    return (
        <ModalContext.Provider value={{ isAddModalVisible, setAddModalVisible }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
