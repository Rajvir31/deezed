import { useRef, type ReactNode } from "react";
import { PanResponder, View } from "react-native";
import { useRouter, usePathname } from "expo-router";

const TAB_ROUTES = ["/", "/plan", "/progress", "/physique", "/coach"] as const;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 0.3;

/**
 * Wraps a tab screen to enable horizontal swipe navigation between tabs.
 * Detects only horizontal gestures (won't interfere with vertical scrolling).
 */
export function SwipeableTabs({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const panResponder = useRef(
    PanResponder.create({
      // Only claim the gesture if it's clearly horizontal
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 20 && Math.abs(gesture.dy) < 30,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderRelease: (_, gesture) => {
        const isSwipe =
          Math.abs(gesture.dx) > SWIPE_THRESHOLD ||
          Math.abs(gesture.vx) > SWIPE_VELOCITY;

        if (!isSwipe) return;

        const currentIndex = TAB_ROUTES.indexOf(
          TAB_ROUTES.find((r) => r === pathname) ?? "/"
        );

        if (gesture.dx < 0 && currentIndex < TAB_ROUTES.length - 1) {
          // Swipe left → next tab
          router.replace(TAB_ROUTES[currentIndex + 1]);
        } else if (gesture.dx > 0 && currentIndex > 0) {
          // Swipe right → previous tab
          router.replace(TAB_ROUTES[currentIndex - 1]);
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
