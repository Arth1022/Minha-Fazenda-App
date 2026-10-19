import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AgroColors, Spacing } from '@/constants/theme';
import { useLocalDatabase } from '@/database/DatabaseProvider';

interface AgroHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export function AgroHeader({ title, subtitle, showBack = false }: AgroHeaderProps) {
  const router = useRouter();
  const { isInitialized } = useLocalDatabase();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <View style={styles.titleRow}>
          {showBack && (
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>
          )}
          <View>
            <Text style={styles.brandTitle}>{title}</Text>
            {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={styles.offlineBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isInitialized ? '#4ADE80' : '#FACC15' },
            ]}
          />
          <Text style={styles.offlineText}>
            {isInitialized ? '100% Offline' : 'Iniciando DB...'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: AgroColors.primaryDark,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitleText: {
    color: '#D1FAE5',
    fontSize: 13,
    marginTop: 2,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
