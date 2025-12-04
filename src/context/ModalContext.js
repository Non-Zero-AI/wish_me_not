import React, { createContext, useState, useContext } from 'react';

const ModalContext = createContext({
    isAddModalVisible: false,
    setAddModalVisible: () => {},
    isSideMenuVisible: false,
    setSideMenuVisible: () => {},
    postsVersion: 0,
    bumpPostsVersion: () => {},
});

export const ModalProvider = ({ children }) => {
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [isSideMenuVisible, setSideMenuVisible] = useState(false);
    const [postsVersion, setPostsVersion] = useState(0);

    const bumpPostsVersion = () => {
        setPostsVersion((v) => v + 1);
    };

    return (
        <ModalContext.Provider value={{ 
            isAddModalVisible, 
            setAddModalVisible,
            isSideMenuVisible,
            setSideMenuVisible,
            postsVersion,
            bumpPostsVersion,
        }}>
            {children}
        </ModalContext.Provider>
    );
};

export const useModal = () => useContext(ModalContext);
