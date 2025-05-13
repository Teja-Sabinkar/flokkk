import React from 'react';
import styles from './SettingsContainer.module.css';
import SettingsTabs from './SettingsTabs';

const SettingsContainer = ({ children, title }) => {
  return (
    <div className={styles.container}>
      <SettingsTabs />
      <div className={styles.content}>
        {title && <h1 className={styles.title}>{title}</h1>}
        {children}
      </div>
    </div>
  );
};

export default SettingsContainer;