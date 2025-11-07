'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  forwardRef,
} from 'react';
import styles from './InteractiveCard.module.css';

interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  containerClassName?: string;
  intensity?: number;
  hoverScale?: number;
}

const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  (
    {
      children,
      className = '',
      containerClassName = '',
      intensity = 14,
      hoverScale = 1.015,
      style,
      onPointerMove,
      onPointerLeave,
      onPointerEnter,
      ...rest
    },
    forwardedRef
  ) => {
    const cardRef = useRef<HTMLDivElement | null>(null);
    const frameRef = useRef<number | null>(null);
    const prefersMotion = useRef(true);
    const supportsHover = useRef(true);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        cardRef.current = node;
        if (!forwardedRef) return;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    const resetTransforms = useCallback(() => {
      if (!cardRef.current) return;
      cardRef.current.style.setProperty('--rx', '0deg');
      cardRef.current.style.setProperty('--ry', '0deg');
      cardRef.current.style.setProperty('--glowX', '50%');
      cardRef.current.style.setProperty('--glowY', '50%');
      cardRef.current.style.setProperty('--glowOpacity', '0');
      cardRef.current.style.setProperty('--card-scale', '1');
      cardRef.current.dataset.active = 'false';
    }, []);

    useEffect(() => {
      if (typeof window === 'undefined') return;

      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const hoverQuery = window.matchMedia('(hover: hover)');

      const updateMotion = () => {
        prefersMotion.current = !motionQuery.matches;
        if (!prefersMotion.current) {
          resetTransforms();
        }
      };

      const updateHover = () => {
        supportsHover.current = hoverQuery.matches;
        if (!supportsHover.current) {
          resetTransforms();
        }
      };

      updateMotion();
      updateHover();

      motionQuery.addEventListener('change', updateMotion);
      hoverQuery.addEventListener('change', updateHover);

      return () => {
        motionQuery.removeEventListener('change', updateMotion);
        hoverQuery.removeEventListener('change', updateHover);
      };
    }, [resetTransforms]);

    useEffect(() => {
      return () => {
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }
      };
    }, []);

    const scheduleUpdate = useCallback(
      (clientX: number, clientY: number) => {
        if (!cardRef.current) return;
        if (frameRef.current) {
          cancelAnimationFrame(frameRef.current);
        }

        frameRef.current = requestAnimationFrame(() => {
          if (!cardRef.current) return;
          const rect = cardRef.current.getBoundingClientRect();
          const x = clientX - rect.left;
          const y = clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;

          const rotateY = ((x - centerX) / centerX) * intensity;
          const rotateX = ((centerY - y) / centerY) * intensity;

          cardRef.current.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
          cardRef.current.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
          cardRef.current.style.setProperty(
            '--glowX',
            `${Math.min(Math.max((x / rect.width) * 100, 0), 100)}%`
          );
          cardRef.current.style.setProperty(
            '--glowY',
            `${Math.min(Math.max((y / rect.height) * 100, 0), 100)}%`
          );
          cardRef.current.style.setProperty('--glowOpacity', '0.55');
          cardRef.current.style.setProperty('--card-scale', hoverScale.toString());
          cardRef.current.dataset.active = 'true';
        });
      },
      [hoverScale, intensity]
    );

    const handlePointerMove = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (onPointerMove) {
          onPointerMove(event);
        }
        if (
          !prefersMotion.current ||
          !supportsHover.current ||
          event.pointerType === 'touch'
        ) {
          return;
        }

        scheduleUpdate(event.clientX, event.clientY);
      },
      [onPointerMove, scheduleUpdate]
    );

    const handlePointerEnter = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (onPointerEnter) {
          onPointerEnter(event);
        }
        if (
          !prefersMotion.current ||
          !supportsHover.current ||
          event.pointerType === 'touch'
        ) {
          return;
        }

        scheduleUpdate(event.clientX, event.clientY);
      },
      [onPointerEnter, scheduleUpdate]
    );

    const handlePointerLeave = useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (onPointerLeave) {
          onPointerLeave(event);
        }
        resetTransforms();
      },
      [onPointerLeave, resetTransforms]
    );

    const mergedStyle = useMemo(
      () => ({
        ...style,
      }),
      [style]
    );

    return (
      <div className={`${styles.container} ${containerClassName}`}>
        <div
          {...rest}
          ref={setRefs}
          className={`${styles.card} ${className}`}
          style={mergedStyle}
          onPointerMove={handlePointerMove}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {children}
          <div className={styles.glow} aria-hidden="true" />
        </div>
      </div>
    );
  }
);

InteractiveCard.displayName = 'InteractiveCard';

export default InteractiveCard;
