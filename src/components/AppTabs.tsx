import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AgroColors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton icon="🏠" label="Início" />
          </TabTrigger>
          <TabTrigger name="mapa" href="/mapa" asChild>
            <TabButton icon="🗺️" label="Mapa" />
          </TabTrigger>
          <TabTrigger name="rebanho" href="/rebanho" asChild>
            <TabButton icon="🐄" label="Rebanho" />
          </TabTrigger>
          <TabTrigger name="estoque" href="/estoque" asChild>
            <TabButton icon="🌾" label="Estoque" />
          </TabTrigger>
          <TabTrigger name="maquinas" href="/maquinas" asChild>
            <TabButton icon="🚜" label="Máquinas" />
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface CustomTabButtonProps extends TabTriggerSlotProps {
  icon: string;
  label: string;
}

export function TabButton({ icon, label, isFocused, ...props }: CustomTabButtonProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.tabPressable,
        isFocused && styles.tabPressableActive,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListOuter}>
      <View style={styles.tabListInner}>{props.children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.two,
    alignItems: 'center',
  },
  tabListInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: AgroColors.mintBorder,
    borderRadius: Spacing.three,
    paddingVertical: 6,
    paddingHorizontal: 6,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: Spacing.two,
    gap: 2,
  },
  tabPressableActive: {
    backgroundColor: AgroColors.mintBg,
  },
  pressed: {
    opacity: 0.75,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  tabLabelActive: {
    color: AgroColors.primaryDark,
    fontWeight: '800',
  },
});
