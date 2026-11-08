import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ViewInstance,
} from 'react-native';
import Animated, { css, useReducedMotion } from 'react-native-reanimated';

import { AgroColors, IconSize, Spacing } from '@/constants/theme';
import { AppIcon } from './AppIcon';

/** Espaço entre os itens (o mesmo da lista de cards do rebanho) */
const ITEM_GAP = Spacing.sm;
/** Folga (px) para considerar que a rolagem chegou ao fim */
const END_TOLERANCE = 4;

/** A seta desce e volta algumas vezes ao aparecer, chamando a atenção para a rolagem. */
const nudge = css.keyframes({
  '0%': { transform: [{ translateY: 0 }] },
  '50%': { transform: [{ translateY: 4 }] },
  '100%': { transform: [{ translateY: 0 }] },
});

const animations = css.create({
  nudge: {
    animationName: nudge,
    animationDuration: '1s',
    animationIterationCount: 3,
    animationTimingFunction: 'ease-in-out',
  },
});

export interface ScrollHintListProps<T> {
  /** Itens da lista */
  data: readonly T[];
  /** Chave única de cada item */
  keyExtractor: (item: T) => string;
  /** Desenha um item */
  renderItem: (item: T) => React.ReactNode;
  /** Quantos itens ficam visíveis antes de precisar rolar (padrão 3) */
  visibleCount?: number;
}

/**
 * Lista com a altura de `visibleCount` itens e rolagem interna. Com mais itens,
 * a seta verde abaixo dela aponta para o que está escondido: para baixo enquanto
 * houver itens abaixo e para cima no fim da lista. Tocar na seta rola a lista.
 */
export function ScrollHintList<T>({
  data,
  keyExtractor,
  renderItem,
  visibleCount = 3,
}: ScrollHintListProps<T>) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const columnRef = useRef<ViewInstance>(null);
  const lastVisibleRef = useRef<ViewInstance>(null);
  // Posição e tamanhos da rolagem, atualizados pelos eventos (não precisam renderizar)
  const metrics = useRef({ offset: 0, viewport: 0, content: 0 });

  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [atEnd, setAtEnd] = useState(false);
  const reduceMotion = useReducedMotion();

  const hasMore = data.length > visibleCount;

  // Altura até o fim do último item visível, medida antes de desenhar a tela
  // (a lista não chega a aparecer inteira antes de ser limitada). O onLayout do
  // item cobre o que muda sem os dados mudarem (ex.: tamanho da fonte do sistema).
  useLayoutEffect(() => {
    const column = columnRef.current;
    const lastVisible = lastVisibleRef.current;
    if (!column || !lastVisible) return;
    setMaxHeight(
      lastVisible.getBoundingClientRect().bottom - column.getBoundingClientRect().top
    );
  }, [data, visibleCount]);

  const handleLastVisibleLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setMaxHeight(y + height);
  };

  const updateAtEnd = () => {
    const { offset, viewport, content } = metrics.current;
    const overflow = content - viewport;
    setAtEnd(overflow > END_TOLERANCE && offset >= overflow - END_TOLERANCE);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    metrics.current.viewport = event.nativeEvent.layout.height;
    updateAtEnd();
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    metrics.current.content = height;
    updateAtEnd();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    metrics.current = {
      offset: contentOffset.y,
      viewport: layoutMeasurement.height,
      content: contentSize.height,
    };
    updateAtEnd();
  };

  // Desce para os próximos itens ou, no fim da lista, volta ao início
  const handleHintPress = () => {
    const { offset, viewport, content } = metrics.current;
    const y = atEnd ? 0 : Math.min(offset + viewport + ITEM_GAP, content - viewport);
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        style={hasMore && maxHeight !== null ? { maxHeight } : undefined}
        nestedScrollEnabled
        scrollEventThrottle={32}
        onLayout={handleLayout}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}>
        <View ref={columnRef} style={styles.column}>
          {data.map((item, index) => {
            const isLastVisible = index === visibleCount - 1;
            return (
              <View
                key={keyExtractor(item)}
                ref={isLastVisible ? lastVisibleRef : undefined}
                onLayout={isLastVisible ? handleLastVisibleLayout : undefined}>
                {renderItem(item)}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {hasMore ? (
        <Pressable
          onPress={handleHintPress}
          hitSlop={{ bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [styles.hint, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={atEnd ? 'Voltar ao início da lista' : 'Ver mais'}>
          <Animated.View
            key={atEnd ? 'up' : 'down'}
            style={!atEnd && !reduceMotion ? animations.nudge : undefined}>
            <AppIcon
              name={atEnd ? 'chevronUp' : 'chevronDown'}
              size={IconSize.lg}
              color={AgroColors.primary}
            />
          </Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: ITEM_GAP,
  },
  hint: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.half,
  },
  pressed: {
    opacity: 0.6,
  },
});
