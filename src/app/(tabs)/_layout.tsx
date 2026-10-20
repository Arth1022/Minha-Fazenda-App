import React from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

import { AgroColors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AgroColors.primaryDark,
        tabBarInactiveTintColor: '#4B5563',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: AgroColors.mintBorder,
          borderTopWidth: 1.5,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="rebanho"
        options={{
          title: 'Rebanho',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🐄</Text>,
        }}
      />
      <Tabs.Screen
        name="estoque"
        options={{
          title: 'Estoque',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🌾</Text>,
        }}
      />
      <Tabs.Screen
        name="maquinas"
        options={{
          title: 'Máquinas',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🚜</Text>,
        }}
      />
    </Tabs>
  );
}
