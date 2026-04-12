import { useMemo, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh, options = {}) {
    const threshold = options.threshold ?? 70;
    const isEnabled = options.enabled ?? true;
    const startYRef = useRef(null);
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);

    const reset = () => {
        startYRef.current = null;
        setPullDistance(0);
        setIsPulling(false);
    };

    const handlers = useMemo(
        () => ({
            onTouchStart: (event) => {
                if (!isEnabled || window.scrollY > 0) {
                    return;
                }

                startYRef.current = event.touches[0]?.clientY ?? null;
                setIsPulling(false);
            },
            onTouchMove: (event) => {
                if (!isEnabled || startYRef.current == null || window.scrollY > 0) {
                    return;
                }

                const currentY = event.touches[0]?.clientY ?? startYRef.current;
                const nextDistance = Math.max(0, currentY - startYRef.current);

                if (nextDistance === 0) {
                    return;
                }

                setIsPulling(true);
                setPullDistance(Math.min(nextDistance, threshold * 1.5));
            },
            onTouchEnd: async () => {
                if (!isEnabled || startYRef.current == null) {
                    reset();
                    return;
                }

                const shouldRefresh = pullDistance >= threshold;
                reset();

                if (shouldRefresh) {
                    await onRefresh();
                }
            },
            onTouchCancel: reset,
        }),
        [isEnabled, onRefresh, pullDistance, threshold]
    );

    return {
        handlers,
        isPulling,
        pullDistance,
        progress: Math.min(pullDistance / threshold, 1),
    };
}