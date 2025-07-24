// NavigationService.ts
import { createRef } from 'react';
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';

// Create a navigation reference that can be used outside of components
export const navigationRef = createRef<NavigationContainerRef<any>>();

// Track if navigation container is ready
const navigationState = {
  isReady: false
};

// Function to set navigation ready state (called from AppNavigator)
export const setNavigationReady = (ready: boolean) => {
  navigationState.isReady = ready;
  console.log('NavigationService: Navigation ready state set to:', ready);
};

/**
 * Navigate to a specific route
 * @param name Route name
 * @param params Route params
 */
function navigate(name: string, params?: any) {
  if (navigationRef.current) {
    // Check if we can navigate to the route
    const state = navigationRef.current.getState();
    const canNavigate = navigationRef.current.getRootState().routeNames.includes(name);
    
    if (canNavigate) {
      navigationRef.current.navigate(name, params);
    } else {
      console.warn(`Cannot navigate to route "${name}" - it may not be in the current navigator`);
    }
  } else {
    // Navigation ref not ready yet
    console.warn('Navigation attempted before navigationRef was ready');
  }
}

/**
 * Reset the navigation state to a new state
 * @param routes Array of route objects
 * @param index Index of the active route
 */
function reset(routes: { name: string; params?: any }[], index = 0) {
  if (navigationRef.current) {
    navigationRef.current.dispatch(
      CommonActions.reset({
        index,
        routes,
      })
    );
  } else {
    console.warn('Navigation reset attempted before navigationRef was ready');
  }
}

/**
 * Go back to the previous screen
 */
function goBack() {
  if (navigationRef.current) {
    navigationRef.current.goBack();
  } else {
    console.warn('Navigation goBack attempted before navigationRef was ready');
  }
}

/**
 * Returns the current route name
 */
function getCurrentRoute() {
  if (navigationRef.current) {
    return navigationRef.current.getCurrentRoute()?.name;
  }
  return null;
}

/**
 * Internal function to perform navigation without debouncing
 */
/**
 * Check if navigation is actually ready by testing if we can get navigation state
 */
function isNavigationActuallyReady(): boolean {
  if (!navigationRef.current) {
    return false;
  }
  
  try {
    // Try to get the navigation state - this will fail if not ready
    const state = navigationRef.current.getRootState();
    return !!(state && state.routes && state.routes.length > 0);
  } catch (error) {
    return false;
  }
}

function performAuthNavigation(isAuthenticated: boolean) {
  const isActuallyReady = isNavigationActuallyReady();
  console.log('NavigationService: Performing auth navigation - isAuthenticated:', isAuthenticated, 'callbackReady:', navigationState.isReady, 'actuallyReady:', isActuallyReady);
  
  if (!isActuallyReady) {
    console.warn('NavigationService: Navigation not ready, deferring navigation', {
      hasRef: !!navigationRef.current,
      callbackReady: navigationState.isReady,
      actuallyReady: isActuallyReady
    });
    // Retry after a short delay if navigation isn't ready
    setTimeout(() => {
      if (isNavigationActuallyReady()) {
        console.log('NavigationService: Retrying navigation after delay');
        performAuthNavigation(isAuthenticated);
      } else {
        console.warn('NavigationService: Navigation still not ready after retry');
        // Try one more time with a longer delay
        setTimeout(() => {
          performAuthNavigation(isAuthenticated);
        }, 500);
      }
    }, 300);
    return;
  }

  try {
    const currentRoute = getCurrentRoute();
    console.log('NavigationService: Current route:', currentRoute);
    
    // Double-check that we can actually perform navigation
    if (!currentRoute) {
      console.warn('NavigationService: Current route is undefined, deferring navigation');
      setTimeout(() => {
        performAuthNavigation(isAuthenticated);
      }, 300);
      return;
    }
    
    if (isAuthenticated) {
      // Navigate to the main landing screen if authenticated
      if (currentRoute !== 'LanguageLanding') {
        console.log('NavigationService: Navigating to authenticated screen');
        reset([{ name: 'LanguageLanding' }]);
      } else {
        console.log('NavigationService: Already on authenticated screen');
      }
    } else {
      // Navigate to login if not authenticated
      if (currentRoute !== 'Login') {
        console.log('NavigationService: Navigating to login screen');
        reset([{ name: 'Login' }]);
      } else {
        console.log('NavigationService: Already on login screen');
      }
    }
  } catch (error) {
    console.error('NavigationService: Error during auth state navigation:', error);
    // If we get an error, the navigation container might not be ready
    console.log('NavigationService: Retrying navigation after error');
    setTimeout(() => {
      performAuthNavigation(isAuthenticated);
    }, 500);
  }
}

/**
 * Navigate after authentication state change with debouncing and improved readiness checks
 * This helps switch between authenticated and unauthenticated states
 */
function navigateByAuthState(isAuthenticated: boolean) {
  console.log('NavigationService: Auth state navigation requested - isAuthenticated:', isAuthenticated);
  
  // Clear any existing timeout
  if (authNavigationTimeout) {
    clearTimeout(authNavigationTimeout);
  }
  
  // Debounce the navigation to prevent rapid calls and ensure navigation container is ready
  authNavigationTimeout = setTimeout(() => {
    performAuthNavigation(isAuthenticated);
    authNavigationTimeout = null;
  }, 100); // 100ms debounce
}

// Track navigation attempts in progress to prevent multiple simultaneous navigations
let navigationInProgress = false;

// Debouncing for auth state navigation
let authNavigationTimeout: NodeJS.Timeout | null = null;

/**
 * Navigate to a modal screen in the root navigator
 * This is especially useful for components deep in the navigation tree
 */
function navigateToModal(name: string, params?: any) {
  console.log(`NavigationService: Attempting to navigate to modal screen ${name}`);
  
  // Prevent multiple simultaneous navigation attempts
  if (navigationInProgress) {
    console.warn('Navigation already in progress, ignoring new request');
    return false;
  }
  
  navigationInProgress = true;
  
  // Function to handle navigation with retry
  const attemptNavigation = (retryCount = 0) => {
    if (navigationRef.current) {
      console.log(`NavigationService: Navigating to modal screen ${name}`);
      // Direct navigation to the modal screen in the root navigator
      navigationRef.current.navigate(name, params);
      navigationInProgress = false;
      return true;
    } else {
      console.warn(`Navigation ref not ready for modal navigation (attempt ${retryCount+1})`);
      
      // Retry with increasing delays if we haven't exceeded max retries
      if (retryCount < 5) {
        const delay = 300 * (retryCount + 1); // Progressively longer delays
        console.log(`Will retry navigation in ${delay}ms`);
        
        setTimeout(() => {
          attemptNavigation(retryCount + 1);
        }, delay);
      } else {
        console.error('Failed to navigate after multiple attempts');
        navigationInProgress = false;
      }
      return false;
    }
  };
  
  // Start the navigation attempt
  return attemptNavigation();
}

/**
 * Services for navigation actions outside of React components
 */
export const NavigationService = {
  navigate,
  reset,
  goBack,
  getCurrentRoute,
  navigateByAuthState,
  navigateToModal
};

export default NavigationService;