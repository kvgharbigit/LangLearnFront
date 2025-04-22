import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusPillProps {
  active: boolean;
  icon: string;
  label: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ active, icon, label }) => {
  return (
    <View style={[styles.container, active && styles.activeContainer]}>
      <Text style={styles.icon}>{icon}</Text>
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