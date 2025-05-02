import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusPillProps {
  active: boolean;
  icon: React.ReactNode | string;
  label: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ active, icon, label }) => {
  // Handle icon differently based on type
  const renderIcon = () => {
    // If icon is a string (emoji or text), wrap it in a Text component
    if (typeof icon === 'string') {
      return <Text style={styles.icon}>{icon}</Text>;
    }
    // If it's already a React node, render it directly
    return icon;
  };

  return (
    <View style={[styles.container, active && styles.activeContainer]}>
      {renderIcon()}
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 50,
  },
  activeContainer: {
    backgroundColor: '#8c95ff',
  },
  icon: {
    marginRight: 6,
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    color: '#495057',
  },
  activeLabel: {
    color: 'white',
  },
});

export default StatusPill;